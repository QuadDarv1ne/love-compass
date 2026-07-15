import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { invalidateAllUserSessions, createSession, generateSessionToken } from '@/lib/auth/session-server';
import { setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, VALIDATION } from '@/lib/constants';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(VALIDATION.PASSWORD_MAX_LENGTH),
  newPassword: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH).max(VALIDATION.PASSWORD_MAX_LENGTH),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Rate limit: max 5 attempts per 15 minutes per user
    const rateLimit = await checkRateLimit(`change-password:${user.id}`, RATE_LIMITS.CHANGE_PASSWORD.MAX, RATE_LIMITS.CHANGE_PASSWORD.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
        { status: 429 }
      );
    }

    // Verify current password - users without password (e.g. OAuth) must use password reset flow
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Use the password reset feature to change your password' },
        { status: 400 }
      );
    }

    const validCurrent = await verifyPassword(currentPassword, user.passwordHash);
    if (!validCurrent) {
      return NextResponse.json(
        { error: 'Invalid current password' },
        { status: 400 }
      );
    }

    // Password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'Password does not meet requirements', details: strength.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await db.user.update(
      { id: user.id },
      { passwordHash, loginAttempts: 0, lockedUntil: null },
    );

    // Invalidate all sessions after password change, then create a new one
    // so the current user isn't silently logged out
    await invalidateAllUserSessions(user.id);
    const newToken = generateSessionToken();
    await createSession(newToken, user.id);
    await setSessionCookie(newToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/change-password', 'Change password error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
