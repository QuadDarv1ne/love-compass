import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Get all users who liked the current user
    const receivedLikes = await db.like.findMany({
      toUserId: user.id,
    });

    if (receivedLikes.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const likedUserIds = receivedLikes.map((like) => like.fromUserId);

    // Filter out blocked users (either direction)
    const blocks = await db.block.findMany({
      where: {
        OR: [
          { blockerId: user.id, blockedId: { in: likedUserIds } },
          { blockerId: { in: likedUserIds }, blockedId: user.id },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = new Set<string>();
    for (const b of blocks) {
      blockedIds.add(b.blockerId === user.id ? b.blockedId : b.blockerId);
    }
    const visibleUserIds = likedUserIds.filter((id) => !blockedIds.has(id));

    // Single query to find which of those users the current user has NOT liked back
    const mutualLikes = await db.like.findMany({
      fromUserId: user.id,
      toUserId: { in: visibleUserIds },
    });

    const mutualUserIds = new Set(mutualLikes.map((like) => like.toUserId));
    const pendingUserIds = visibleUserIds.filter((id) => !mutualUserIds.has(id));

    const pendingUsers = await db.user.findMany(
      { id: { in: pendingUserIds } }
    );

    const pendingLikes = pendingUsers.map(({ id, name, age, gender, bio, interests, avatar, city, lookingFor, createdAt }) => ({
      id, name, age, gender, bio, interests, avatar, city, lookingFor, createdAt,
    }));
    return NextResponse.json({ data: pendingLikes }, { headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0' } });
  } catch (error) {
    logger.error('/api/likes/received', 'Failed to fetch received likes', error);
    return NextResponse.json({ error: 'Failed to fetch received likes' }, { status: 500 });
  }
}
