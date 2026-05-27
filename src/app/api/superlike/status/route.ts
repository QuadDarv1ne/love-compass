import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import { SUPER_LIKE_DAILY_LIMIT } from '@/lib/constants';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const count = await db.like.count({
      fromUserId: user.id,
      isSuperLike: true,
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    });

    return NextResponse.json({
      used: count,
      remaining: Math.max(0, SUPER_LIKE_DAILY_LIMIT - count),
      limit: SUPER_LIKE_DAILY_LIMIT,
      resetsAt: endOfDay.toISOString(),
    });
  } catch (error) {
    logger.error('/api/superlike/status', 'Failed to fetch super like status', error);
    return NextResponse.json({ error: 'Failed to fetch super like status' }, { status: 500 });
  }
}
