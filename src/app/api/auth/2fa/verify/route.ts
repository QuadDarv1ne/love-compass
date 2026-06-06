import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyTOTP, verifyBackupCode } from '@/lib/auth/totp';
import { verifyTempToken } from '@/lib/auth/jwt';
import { getClientIp } from '@/lib/auth/crypto';
import {
  generateSessionToken,
  createSession,
} from '@/lib/auth/session-server';
import { setSessionCookie } from '@/lib/auth/session';
import { validateCSRFToken } from '@/lib/auth/csrf';
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
    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'CSRF validation failed' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = verifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation error' },
        { status: 400 }
      );
    }

    const { tempToken, code } = result.data;

    // Rate limit per temp token
    const rateLimit = await checkRateLimit(`2fa:${tempToken.slice(0, 10)}`, RATE_LIMITS.TOTP_VERIFY.MAX, RATE_LIMITS.TOTP_VERIFY.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts' },
        { status: 429 }
      );
    }

    // Verify temp token
    const payload = await verifyTempToken(tempToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ id: payload.userId });

    if (!user || !user.totpSecret) {
      return NextResponse.json(
        { error: '2FA is not set up' },
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
        { error: 'Invalid code' },
        { status: 400 }
      );
    }

    // Prevent temp token reuse: block this token for the next 5 minutes
    await checkRateLimit(`2fa-used:${tempToken.slice(0, 10)}`, RATE_LIMITS.TOTP_REPLAY.MAX, RATE_LIMITS.TOTP_REPLAY.WINDOW);

    // Reset login attempts after successful 2FA verification
    await db.rateLimit.deleteMany({ key: { startsWith: `login:${user.email.toLowerCase()}` } });

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
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
