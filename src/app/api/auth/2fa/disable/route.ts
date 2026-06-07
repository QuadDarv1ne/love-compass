import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { verifyTOTP } from '@/lib/auth/totp';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { TOTP } from '@/lib/constants';

const disableSchema = z.object({
  token: z.string().length(TOTP.TOKEN_LENGTH),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = disableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Enter a 6-digit code' },
        { status: 400 }
      );
    }

    const { token } = result.data;
    const valid = verifyTOTP(user.totpSecret, token);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      );
    }

    await db.user.update(
      { id: user.id },
      {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: '[]',
      },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/2fa/disable', '2FA disable error', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
