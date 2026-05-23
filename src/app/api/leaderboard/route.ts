import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  sort: z.enum(['popular', 'active', 'new']).default('popular'),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    const { sort } = querySchema.parse({
      sort: searchParams.get('sort') || 'popular',
    });

    // Fetch all visible users except current
    const users = await db.user.findMany(
      { id: { not: user.id }, profileVisible: true }
    );

    // Count likes received per user
    const likeCounts = await db.like.groupBy({
      by: ['toUserId'],
      _count: { toUserId: true },
    });
    const likeMap = new Map(likeCounts.map((l) => [l.toUserId, l._count.toUserId]));

    // Count matches per user (both user1 and user2 roles)
    const matchCounts = await db.match.groupBy({
      by: ['user1Id'],
      _count: { user1Id: true },
    });
    const matchMap = new Map<string, number>();
    for (const m of matchCounts) {
      matchMap.set(m.user1Id, (matchMap.get(m.user1Id) || 0) + m._count.user1Id);
    }
    const matchCounts2 = await db.match.groupBy({
      by: ['user2Id'],
      _count: { user2Id: true },
    });
    for (const m of matchCounts2) {
      matchMap.set(m.user2Id, (matchMap.get(m.user2Id) || 0) + m._count.user2Id);
    }

    // Compute scores
    const ranked = users.map((u) => {
      const likesReceived = likeMap.get(u.id) || 0;
      const matchCount = matchMap.get(u.id) || 0;
      const popularityScore = likesReceived * 10 + matchCount * 5;
      const activityScore = popularityScore + matchCount * 50;

      return {
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        popularityScore,
        activityScore,
        matchCount,
        likesReceived,
      };
    });

    // Sort
    if (sort === 'popular') {
      ranked.sort((a, b) => b.popularityScore - a.popularityScore);
    } else if (sort === 'active') {
      ranked.sort((a, b) => b.activityScore - a.activityScore);
    } else {
      ranked.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return NextResponse.json({ data: ranked, sort });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    logger.error('/api/leaderboard', 'GET error', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
