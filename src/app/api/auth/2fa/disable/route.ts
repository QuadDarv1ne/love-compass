import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { verifyTOTP } from '@/lib/auth/totp';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const disableSchema = z.object({
  token: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: '2FA не включён' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = disableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Укажите 6-значный код' },
        { status: 400 }
      );
    }

    const { token } = result.data;
    const valid = verifyTOTP(user.totpSecret, token);

    if (!valid) {
      return NextResponse.json(
        { error: 'Неверный код' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        totpBackupCodes: '[]',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/2fa/disable', '2FA disable error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
