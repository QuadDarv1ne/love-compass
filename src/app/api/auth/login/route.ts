import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { getClientIp } from '@/lib/auth/crypto';
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';
import { signTempToken } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/auth/rate-limit';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_LOGIN_ATTEMPTS = 20;
const LOCKOUT_WINDOW = 15 * 60; // 15 minutes
const LOCKOUT_DURATION = 30 * 60; // 30 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const emailLower = email.toLowerCase();

    // Rate limiting per email
    const rateLimit = await checkRateLimit(
      `login:${emailLower}`,
      MAX_LOGIN_ATTEMPTS,
      LOCKOUT_WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ where: { email: emailLower } });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Аккаунт заблокирован. Попробуйте позже' },
        { status: 423 }
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);

    if (!validPassword) {
      // Increment failed attempts
      const newAttempts = user.loginAttempts + 1;
      const lockedUntil =
        newAttempts >= MAX_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_DURATION * 1000)
          : undefined;

      await db.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: newAttempts,
          lockedUntil,
        },
      });

      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Reset login attempts on successful password verification
    if (user.loginAttempts > 0) {
      await db.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
      });
    }

    // Check email verification
    if (!user.emailVerified) {
      return NextResponse.json({
        needsEmailVerification: true,
        email: user.email,
      });
    }

    // Check 2FA
    if (user.totpEnabled) {
      const tempToken = await signTempToken({ userId: user.id }, 5);
      return NextResponse.json({
        needs2FA: true,
        tempToken,
      });
    }

    // Create session
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);

    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
