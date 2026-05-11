import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const likes = await db.like.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    });

    return NextResponse.json(likes);
  } catch (error) {
    console.error('Failed to fetch sent likes:', error);
    return NextResponse.json({ error: 'Failed to fetch sent likes' }, { status: 500 });
  }
}
