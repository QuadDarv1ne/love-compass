import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { deleteSessionCookie } from '@/lib/auth/session';
import { deleteUserCascade } from '@/lib/delete-user';
import { logger } from '@/lib/logger';

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    await db.transaction(async (tx) => {
      await deleteUserCascade(tx, { id: user.id, email: user.email });
    });

    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/account', 'Account deletion error', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
