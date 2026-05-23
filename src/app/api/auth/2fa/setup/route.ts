import { NextResponse } from 'next/server';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import {
  generateTOTPSecret,
  generateTOTPURI,
  generateBackupCodes,
  hashBackupCodes,
} from '@/lib/auth/totp';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

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
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
