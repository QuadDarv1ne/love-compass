import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  generateSessionToken,
  createSession,
} from '@/lib/auth/session-server';
import { setSessionCookie } from '@/lib/auth/session';
import { validateCSRFToken } from '@/lib/auth/csrf';
import { getClientIp } from '@/lib/auth/crypto';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';
import { LOGIN_LIMITS } from '@/lib/constants';

const demoLoginSchema = z.object({
  email: z.string().email().endsWith('@example.com', 'Demo login allowed only for demo accounts'),
});

// Only allow demo accounts (emails ending with @example.com)
const DEMO_EMAIL_SUFFIX = '@example.com' as const;

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const result = demoLoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request. Demo login allowed only for demo accounts (@example.com)' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Rate limiting per IP address
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(
      `demo-login:${ip}`,
      LOGIN_LIMITS.MAX_ATTEMPTS,
      LOGIN_LIMITS.LOCKOUT_WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
        { status: 429 }
      );
    }

    // Verify CSRF token
    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    // Find user by email (only demo accounts allowed)
    const user = await db.user.findUnique({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: 'Demo user not found' },
        { status: 404 }
      );
    }

    // Double-check: ensure this is actually a demo account
    if (!user.email.endsWith(DEMO_EMAIL_SUFFIX)) {
      logger.warn('/api/auth/demo-login', 'Attempted demo login to non-demo account', { email: user.email, ip });
      return NextResponse.json(
        { error: 'Demo login allowed only for demo accounts' },
        { status: 403 }
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = ip;

    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    logger.error('/api/auth/demo-login', 'Demo login error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
