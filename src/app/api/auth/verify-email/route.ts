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
import { verifyTempToken } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, TIME, TOKEN } from '@/lib/constants';

const resendEmailSchema = z.union([
  z.object({ email: z.string().email('Invalid email format') }),
  z.object({ token: z.string().min(1) }),
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
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
        return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json({ error: 'Token expired' }, { status: 400 });
      }
    }
    logger.error('/api/auth/verify-email', 'Email verification error', error);
    return NextResponse.json(
      { error: 'Server error' },
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
        { error: 'Please provide a valid email or token' },
        { status: 400 }
      );
    }

    let emailLower: string;

    if ('token' in result.data) {
      const payload = await verifyTempToken(result.data.token);
      if (!payload?.userId) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
      const user = await db.user.findUnique({ id: payload.userId });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      emailLower = user.email.toLowerCase();
    } else {
      emailLower = result.data.email.toLowerCase();
    }

    // Rate limit: 3 per hour
    const rateLimit = await checkRateLimit(`verify:${emailLower}`, RATE_LIMITS.VERIFY_EMAIL.MAX, RATE_LIMITS.VERIFY_EMAIL.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later' },
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
          { error: `Resend available in ${Math.ceil((nextAllowedAt.getTime() - Date.now()) / 1000)} seconds` },
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
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
