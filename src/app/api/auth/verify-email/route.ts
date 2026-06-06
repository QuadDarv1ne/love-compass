import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  generateSessionToken,
  createSession,
} from '@/lib/auth/session-server';
import { setSessionCookie } from '@/lib/auth/session';
import { sendVerificationEmail } from '@/lib/email';
import { generateRandomToken, hashToken, getClientIp } from '@/lib/auth/crypto';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, TIME, TOKEN } from '@/lib/constants';

const resendEmailSchema = z.object({
  email: z.string().email('Неверный формат email'),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Отсутствует токен' },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);

    // Use transaction to atomically find user, verify token, and update
    // This prevents race conditions where two concurrent requests could both verify
    const result = await db.transaction(async (tx) => {
      const user = await tx.user.findUnique({ emailVerificationToken: hashedToken });

      if (!user) {
        throw new Error('INVALID_TOKEN');
      }

      if (
        !user.emailVerificationExpiry ||
        user.emailVerificationExpiry < new Date()
      ) {
        throw new Error('TOKEN_EXPIRED');
      }

      // Atomically clear the token and mark email as verified
      // If another concurrent request already cleared the token, this will affect 0 rows
      await tx.user.update(
        { id: user.id },
        {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      );

      return user;
    });

    // Auto-login after verification
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);
    await createSession(sessionToken, result.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Неверный токен' }, { status: 400 });
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json({ error: 'Токен истёк' }, { status: 400 });
      }
    }
    logger.error('/api/auth/verify-email', 'Email verification error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resendEmailSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Укажите корректный email' },
        { status: 400 }
      );
    }

    const emailLower = result.data.email.toLowerCase();

    // Rate limit: 3 per hour
    const rateLimit = await checkRateLimit(`verify:${emailLower}`, RATE_LIMITS.VERIFY_EMAIL.MAX, RATE_LIMITS.VERIFY_EMAIL.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ email: emailLower });

    if (!user || user.emailVerified) {
      // Don't reveal if email exists or is verified
      return NextResponse.json({ success: true });
    }

    // Server-side cooldown: prevent resend if last request was within cooldown window
    const cooldownMs = TIME.RESEND_COOLDOWN_SECONDS * TIME.RESEND_COOLDOWN_INTERVAL_MS;
    if (user.lastEmailVerificationSentAt) {
      const nextAllowedAt = new Date(user.lastEmailVerificationSentAt.getTime() + cooldownMs);
      if (new Date() < nextAllowedAt) {
        return NextResponse.json(
          { error: `Повторная отправка доступна через ${Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000)} сек` },
          { status: 429 }
        );
      }
    }

    const newToken = generateRandomToken(TOKEN.BYTE_LENGTH);
    const hashedNewToken = hashToken(newToken);
    const expiry = new Date(Date.now() + TOKEN.VERIFICATION_EXPIRY_MS);

    await db.user.update(
      { id: user.id },
      {
        emailVerificationToken: hashedNewToken,
        emailVerificationExpiry: expiry,
        lastEmailVerificationSentAt: new Date(),
      },
    );

    await sendVerificationEmail(emailLower, newToken);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/verify-email', 'Resend verification error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
