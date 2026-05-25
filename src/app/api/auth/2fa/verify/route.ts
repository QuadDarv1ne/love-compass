import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyTOTP, verifyBackupCode } from '@/lib/auth/totp';
import { verifyTempToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/auth/crypto';
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { sanitizeUser } from '@/lib/auth/projections';
import { RATE_LIMITS } from '@/lib/constants';

const verifySchema = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации' },
        { status: 400 }
      );
    }

    const { tempToken, code } = result.data;

    // Rate limit per temp token
    const rateLimit = await checkRateLimit(`2fa:${tempToken.slice(0, 10)}`, RATE_LIMITS.TOTP_VERIFY.MAX, RATE_LIMITS.TOTP_VERIFY.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток' },
        { status: 429 }
      );
    }

    // Verify temp token
    const payload = await verifyTempToken(tempToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Сессия истекла. Войдите заново' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ id: payload.userId });

    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: '2FA не настроен' },
        { status: 400 }
      );
    }

    let valid = false;

    // Try TOTP first
    if (verifyTOTP(user.totpSecret, code)) {
      valid = true;
    } else {
      // Try backup codes
      let storedCodes: string[] = [];
      try {
        storedCodes = JSON.parse(user.totpBackupCodes || '[]');
      } catch {
        // Corrupted backup codes — treat as empty
      }
      if (storedCodes.length > 0) {
        const result = await verifyBackupCode(code, storedCodes);
        if (result.valid) {
          // Remove used backup code
          storedCodes.splice(result.index, 1);
          await db.user.update(
            { id: user.id },
            { totpBackupCodes: JSON.stringify(storedCodes) },
          );
          valid = true;
        }
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 400 }
      );
    }

    // Prevent temp token reuse: block this token for the next 5 minutes
    await checkRateLimit(`2fa-used:${tempToken.slice(0, 10)}`, RATE_LIMITS.TOTP_REPLAY.MAX, RATE_LIMITS.TOTP_REPLAY.WINDOW);

    // Create session
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);
    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    logger.error('/api/auth/2fa/verify', '2FA verify error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
