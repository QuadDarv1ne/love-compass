import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { invalidateAllUserSessions } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/constants';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
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
        { error: 'Ошибка валидации' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;

    // Rate limit: max 5 attempts per 15 minutes per user
    const rateLimit = await checkRateLimit(`change-password:${user.id}`, RATE_LIMITS.CHANGE_PASSWORD.MAX, RATE_LIMITS.CHANGE_PASSWORD.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    // Verify current password
    const validCurrent = await verifyPassword(currentPassword, user.passwordHash);
    if (!validCurrent) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 400 }
      );
    }

    // Password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'Пароль не соответствует требованиям', details: strength.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await db.user.update(
      { id: user.id },
      { passwordHash, loginAttempts: 0, lockedUntil: null },
    );

    // Invalidate all sessions after password change
    await invalidateAllUserSessions(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/change-password', 'Change password error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
