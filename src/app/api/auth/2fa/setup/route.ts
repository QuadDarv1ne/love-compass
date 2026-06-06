import { NextResponse } from 'next/server';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import {
  generateTOTPSecret,
  generateTOTPURI,
  generateBackupCodes,
  hashBackupCodes,
} from '@/lib/auth/totp';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Prevent 2FA setup if already enabled
    if (user.totpEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it before reconfiguring' },
        { status: 409 },
      );
    }

    // Rate limit 2FA setup to prevent abuse
    const rateLimit = await checkRateLimit(
      `2fa-setup:${user.id}`,
      RATE_LIMITS.TOTP_SETUP.MAX,
      RATE_LIMITS.TOTP_SETUP.WINDOW,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many 2FA setup attempts. Try again later' },
        { status: 429 },
      );
    }

    const secret = generateTOTPSecret();
    const uri = generateTOTPURI(secret, user.email);
    const backupCodes = generateBackupCodes();
    const hashedCodes = await hashBackupCodes(backupCodes);

    // Store secret and backup codes (not yet enabled)
    await db.user.update(
      { id: user.id },
      {
        totpSecret: secret,
        totpBackupCodes: JSON.stringify(hashedCodes),
      },
    );

    return NextResponse.json({
      secret,
      uri,
      backupCodes,
    });
  } catch (error) {
    logger.error('/api/auth/2fa/setup', '2FA setup error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
