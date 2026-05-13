import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const receivedLikes = await db.like.findMany({
      where: {
        toUserId: user.id,
      },
      include: {
        fromUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pendingLikes: (typeof receivedLikes)[number]['fromUser'][] = [];
    for (const like of receivedLikes) {
      const reverseLike = await db.like.findUnique({
        where: {
          fromUserId_toUserId: {
            fromUserId: user.id,
            toUserId: like.fromUserId,
          },
        },
      });
      if (!reverseLike) {
        pendingLikes.push(like.fromUser);
      }
    }

    return NextResponse.json(pendingLikes);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
