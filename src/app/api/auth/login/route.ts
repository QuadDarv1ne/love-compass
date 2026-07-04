import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { getClientIp } from '@/lib/auth/crypto';
import {
  generateSessionToken,
  createSession,
} from '@/lib/auth/session-server';
import { setSessionCookie } from '@/lib/auth/session';
import { signTempToken } from '@/lib/auth/jwt';
import { validateCSRFToken } from '@/lib/auth/csrf';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { sanitizeUser } from '@/lib/auth/projections';
import { LOGIN_LIMITS, TOTP } from '@/lib/constants';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const emailLower = email.toLowerCase();

    // Rate limiting per email
    const rateLimit = await checkRateLimit(
      `login:${emailLower}`,
      LOGIN_LIMITS.MAX_ATTEMPTS,
      LOGIN_LIMITS.LOCKOUT_WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ email: emailLower });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Account locked. Please try again later' },
        { status: 423 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = user.loginAttempts + 1;
      const lockedUntil =
        newAttempts >= LOGIN_LIMITS.MAX_ATTEMPTS
          ? new Date(Date.now() + LOGIN_LIMITS.LOCKOUT_DURATION * 1000)
          : undefined;

      await db.user.update(
        { id: user.id },
        {
          loginAttempts: newAttempts,
          lockedUntil,
        },
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check email verification
    if (!user.emailVerified) {
      const tempToken = await signTempToken({ userId: user.id }, TOTP.TEMP_TOKEN_TTL_MINUTES);
      return NextResponse.json(
        { needsEmailVerification: true, tempToken },
        { status: 403 }
      );
    }

    // Check 2FA
    if (user.totpEnabled) {
      const tempToken = await signTempToken({ userId: user.id }, TOTP.TEMP_TOKEN_TTL_MINUTES);
      return NextResponse.json({
        needs2FA: true,
        tempToken,
      });
    }

    // Reset login attempts ONLY after ALL checks pass, right before session creation
    if (user.loginAttempts > 0) {
      await db.user.update(
        { id: user.id },
        { loginAttempts: 0, lockedUntil: null },
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);

    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    logger.error('/api/auth/login', 'Login error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
