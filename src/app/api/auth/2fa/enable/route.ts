import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/guard';
import { verifyTOTP } from '@/lib/auth/totp';
import { db } from '@/lib/db';

const enableSchema = z.object({
  token: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    if (!user.totpSecret) {
      return NextResponse.json(
        { error: 'Сначала настройте 2FA' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = enableSchema.safeParse(body);

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
      data: { totpEnabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
