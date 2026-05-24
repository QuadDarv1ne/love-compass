import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { invalidateAllUserSessions } from '@/lib/auth/session';
import { hashToken } from '@/lib/auth/crypto';
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
        { error: 'Неверный или истёкший токен' },
        { status: 400 }
      );
    }

    await invalidateAllUserSessions(resetResult);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/reset-password', 'Reset password error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
