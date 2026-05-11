import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Find all likes where someone liked the current user
    const receivedLikes = await db.like.findMany({
      where: {
        toUserId: userId,
      },
      include: {
        fromUser: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter out likes where the current user has already liked back
    const pendingLikes = [];
    for (const like of receivedLikes) {
      const reverseLike = await db.like.findUnique({
        where: {
          fromUserId_toUserId: {
            fromUserId: userId,
            toUserId: like.fromUserId,
          },
        },
      });
      if (!reverseLike) {
        pendingLikes.push(like.fromUser);
      }
    }

    return NextResponse.json(pendingLikes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
