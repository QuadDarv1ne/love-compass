import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Get all users who liked the current user
    const receivedLikes = await db.like.findMany({
      toUserId: user.id,
    });

    if (receivedLikes.length === 0) {
      return NextResponse.json([]);
    }

    const likedUserIds = receivedLikes.map((like) => like.fromUserId);

    // Single query to find which of those users the current user has NOT liked back
    const mutualLikes = await db.like.findMany({
      fromUserId: user.id,
      toUserId: { in: likedUserIds },
    });

    const mutualUserIds = new Set(mutualLikes.map((like) => like.toUserId));
    const pendingUserIds = likedUserIds.filter((id) => !mutualUserIds.has(id));

    const pendingUsers = await db.user.findMany(
      { id: { in: pendingUserIds } }
    );

    const pendingLikes = pendingUsers.map(({ id, name, age, gender, bio, interests, avatar, city, lookingFor, createdAt }) => ({
      id, name, age, gender, bio, interests, avatar, city, lookingFor, createdAt,
    }));
    return NextResponse.json(pendingLikes);
  } catch (error) {
    logger.error('/api/likes/received', 'Failed to fetch received likes', error);
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
