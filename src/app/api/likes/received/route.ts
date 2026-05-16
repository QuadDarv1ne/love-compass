import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Get all users who liked the current user
    const receivedLikes = await db.like.findMany({
      where: {
        toUserId: user.id,
      },
      select: {
        fromUserId: true,
      },
    });

    if (receivedLikes.length === 0) {
      return NextResponse.json([]);
    }

    const likedUserIds = receivedLikes.map((like) => like.fromUserId);

    // Single query to find which of those users the current user has NOT liked back
    const mutualLikes = await db.like.findMany({
      where: {
        fromUserId: user.id,
        toUserId: { in: likedUserIds },
      },
      select: {
        toUserId: true,
      },
    });

    const mutualUserIds = new Set(mutualLikes.map((like) => like.toUserId));
    const pendingUserIds = likedUserIds.filter((id) => !mutualUserIds.has(id));

    // Fetch pending user profiles in a single query
    const pendingLikes = await db.user.findMany({
      where: {
        id: { in: pendingUserIds },
      },
    });

    return NextResponse.json(pendingLikes);
  } catch (error) {
    console.error('Failed to fetch received likes:', error);
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
