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

    // Safe profile fields for public-facing profiles
    const pendingUserSelect = {
      id: true,
      name: true,
      age: true,
      gender: true,
      bio: true,
      interests: true,
      avatar: true,
      city: true,
      lookingFor: true,
      createdAt: true,
    };

    // Fetch pending user profiles in a single query
    const pendingUsers = await db.user.findMany(
      { id: { in: pendingUserIds } }
    );

    const pendingLikes = pendingUsers.map(u => {
      const result: Record<string, any> = {};
      for (const key of Object.keys(pendingUserSelect)) {
        result[key] = (u as any)[key];
      }
      return result;
    });
    return NextResponse.json(pendingLikes);
  } catch (error) {
    logger.error('/api/likes/received', 'Failed to fetch received likes', error);
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
