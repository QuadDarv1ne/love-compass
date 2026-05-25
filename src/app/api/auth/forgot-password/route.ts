import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { generateRandomToken, hashToken } from '@/lib/auth/crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, TOKEN } from '@/lib/constants';

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = forgotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Неверный формат email' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const emailLower = email.toLowerCase();

    // Rate limit: 3 per hour
    const rateLimit = await checkRateLimit(`reset:${emailLower}`, RATE_LIMITS.FORGOT_PASSWORD.MAX, RATE_LIMITS.FORGOT_PASSWORD.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ email: emailLower });

    const resetToken = generateRandomToken(TOKEN.BYTE_LENGTH);
    const hashedResetToken = hashToken(resetToken);
    const expiry = new Date(Date.now() + TOKEN.RESET_EXPIRY_MS);

    if (user) {
      await db.user.update(
        { id: user.id },
        {
          passwordResetToken: hashedResetToken,
          passwordResetExpiry: expiry,
        },
      );
    }

    // Always send reset email to prevent timing-based user enumeration.
    // If the user does not exist, the reset link will be invalid when clicked.
    await sendPasswordResetEmail(emailLower, resetToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/forgot-password', 'Forgot password error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
