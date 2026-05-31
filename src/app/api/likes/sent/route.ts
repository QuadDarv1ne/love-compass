import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const likes = await db.like.findMany(
      { fromUserId: user.id }
    );

    return NextResponse.json({ data: likes });
  } catch (error) {
    logger.error('/api/likes/sent', 'Failed to fetch sent likes', error);
    return NextResponse.json({ error: 'Failed to fetch sent likes' }, { status: 500 });
  }
}
