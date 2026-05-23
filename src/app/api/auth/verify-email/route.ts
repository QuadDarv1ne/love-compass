import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';
import { sendVerificationEmail } from '@/lib/email';
import { generateRandomToken, getClientIp } from '@/lib/auth/crypto';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

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

    const user = await db.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Неверный токен' },
        { status: 400 }
      );
    }

    if (
      !user.emailVerificationExpiry ||
      user.emailVerificationExpiry < new Date()
    ) {
      return NextResponse.json(
        { error: 'Токен истёк' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Auto-login after verification
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);
    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ success: true });
  } catch (error) {
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Укажите email' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Rate limit: 3 per hour
    const rateLimit = await checkRateLimit(`verify:${emailLower}`, 3, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({ where: { email: emailLower } });

    if (!user || user.emailVerified) {
      // Don't reveal if email exists or is verified
      return NextResponse.json({ success: true });
    }

    const newToken = generateRandomToken(32);
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: newToken,
        emailVerificationExpiry: expiry,
      },
    });

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
