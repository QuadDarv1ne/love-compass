import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { invalidateAllUserSessions } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

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
        { error: 'Ошибка валидации' },
        { status: 400 }
      );
    }

    const { token, newPassword } = result.data;

    // Password strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json(
        { error: 'Пароль не соответствует требованиям', details: strength.errors },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    // Atomic: find user by token AND update in one operation to prevent race condition
    const updateResult = await db.user.updateMany({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Неверный или истёкший токен' },
        { status: 400 }
      );
    }

    // We need the user ID for session invalidation — fetch it (token already cleared)
    const updatedUser = await db.user.findFirst({
      where: { passwordResetToken: null, passwordResetExpiry: null },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (updatedUser) {
      await invalidateAllUserSessions(updatedUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/reset-password', 'Reset password error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
