import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const likes = await db.like.findMany({
      where: { fromUserId: user.id },
      select: { toUserId: true },
    });

    return NextResponse.json(likes);
  } catch (error) {
    console.error('Failed to fetch sent likes:', error);
    return NextResponse.json({ error: 'Failed to fetch sent likes' }, { status: 500 });
  }
}
