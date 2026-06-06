import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { invalidateAllUserSessions } from '@/lib/auth/session-server';
import { hashToken } from '@/lib/auth/crypto';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/constants';

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    const { token, newPassword } = result.data;

    // Rate limit: prevent brute-force attacks on reset tokens
    const rateLimit = await checkRateLimit(
      `reset-use:${token.slice(0, 10)}`,
      RATE_LIMITS.FORGOT_PASSWORD.MAX,
      RATE_LIMITS.FORGOT_PASSWORD.WINDOW,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
        { status: 429 }
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

    const hashedPassword = await hashPassword(newPassword);
    const hashedTokenValue = hashToken(token);

    // Atomic: find user by token, update password, and capture userId in one transaction
    const resetResult = await db.transaction(async (tx) => {
      const users = await tx.user.findMany(
        {
          passwordResetToken: hashedTokenValue,
          passwordResetExpiry: { gt: new Date() },
        },
        { take: 1 },
      );

      const user = users[0];
      if (!user) return null;

      await tx.user.update(
        { id: user.id },
        {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          loginAttempts: 0,
          lockedUntil: null,
        },
      );

      return user.id;
    });

    if (!resetResult) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    await invalidateAllUserSessions(resetResult);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/reset-password', 'Reset password error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
