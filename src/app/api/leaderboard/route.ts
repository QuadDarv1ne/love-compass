import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { SCORING, RATE_LIMITS } from '@/lib/constants';

const querySchema = z.object({
  sort: z.enum(['popular', 'active', 'new']).default('popular'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    const { sort, page, limit } = querySchema.parse({
      sort: searchParams.get('sort') || 'popular',
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    // Rate limit leaderboard fetches to prevent database overload
    const rateLimit = await checkRateLimit(
      `leaderboard:${user.id}`,
      RATE_LIMITS.PROFILES.MAX,
      RATE_LIMITS.PROFILES.WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, try again later' },
        { status: 429 }
      );
    }

    const skip = (page - 1) * limit;

    // Count likes received per user
    const likeCounts = await db.like.groupBy({
      by: ['toUserId'],
      _count: { toUserId: true },
    }) as { toUserId: string; _count: { toUserId: number } }[];
    const likeMap = new Map(likeCounts.map((l) => [l.toUserId, l._count.toUserId]));

    // Count matches per user (both user1 and user2 roles)
    const matchCounts = await db.match.groupBy({
      by: ['user1Id'],
      _count: { user1Id: true },
    }) as { user1Id: string; _count: { user1Id: number } }[];
    const matchMap = new Map<string, number>();
    for (const m of matchCounts) {
      matchMap.set(m.user1Id, (matchMap.get(m.user1Id) || 0) + m._count.user1Id);
    }
    const matchCounts2 = await db.match.groupBy({
      by: ['user2Id'],
      _count: { user2Id: true },
    }) as { user2Id: string; _count: { user2Id: number } }[];
    for (const m of matchCounts2) {
      matchMap.set(m.user2Id, (matchMap.get(m.user2Id) || 0) + m._count.user2Id);
    }

    // Fetch ALL visible users (excluding current user) — keep minimal fields
    const allUsers = await db.user.findMany(
      { id: { not: user.id }, profileVisible: true },
    );

    const totalUsers = allUsers.length;

    // Compute scores for all users
    const ranked = allUsers.map((u) => {
      const likesReceived = likeMap.get(u.id) || 0;
      const matchCount = matchMap.get(u.id) || 0;
      const popularityScore = likesReceived * SCORING.LIKE_WEIGHT + matchCount * SCORING.MATCH_WEIGHT;
      const activityScore = popularityScore + matchCount * SCORING.ACTIVITY_MATCH_BONUS;

      const safe = sanitizeUser(u);
      return {
        ...safe,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        popularityScore,
        activityScore,
        matchCount,
        likesReceived,
      };
    });

    // Sort the entire dataset
    if (sort === 'popular') {
      ranked.sort((a, b) => b.popularityScore - a.popularityScore);
    } else if (sort === 'active') {
      ranked.sort((a, b) => b.activityScore - a.activityScore);
    } else {
      ranked.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Paginate after sorting
    const paged = ranked.slice(skip, skip + limit);

    return NextResponse.json({
      data: paged,
      sort,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    logger.error('/api/leaderboard', 'GET error', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
