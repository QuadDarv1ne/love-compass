import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { sanitizeUser, PUBLIC_USER_SELECT } from '@/lib/auth/projections';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { SCORING, RATE_LIMITS, LEADERBOARD_MAX_USERS } from '@/lib/constants';

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
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const skip = (page - 1) * limit;
    const where = { id: { not: user.id }, profileVisible: true };

    // For 'new' sort, we can paginate directly at the DB level.
    if (sort === 'new') {
      const [totalUsers, users] = await Promise.all([
        db.user.count(where),
        db.user.findMany(where, {
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: PUBLIC_USER_SELECT,
        }),
      ]);

      const data = users.map((u) => {
        const safe = sanitizeUser(u);
        return {
          ...safe,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
          popularityScore: 0,
          activityScore: 0,
          matchCount: 0,
          likesReceived: 0,
        };
      });

      return NextResponse.json({
        data,
        sort,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
        },
      }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } });
    }

    // For 'popular' and 'active' sorts we need score-based ranking.
    // Fetch score aggregates and cap the user set to avoid OOM.
    const [likeCounts, matchCounts1, matchCounts2, totalUsers] = await Promise.all([
      db.like.groupBy({
        by: ['toUserId'],
        _count: { toUserId: true },
      }) as Promise<{ toUserId: string; _count: { toUserId: number } }[]>,
      db.match.groupBy({
        by: ['user1Id'],
        _count: { user1Id: true },
      }) as Promise<{ user1Id: string; _count: { user1Id: number } }[]>,
      db.match.groupBy({
        by: ['user2Id'],
        _count: { user2Id: true },
      }) as Promise<{ user2Id: string; _count: { user2Id: number } }[]>,
      db.user.count(where),
    ]);
    const likeMap = new Map(likeCounts.map((l) => [l.toUserId, l._count.toUserId]));

    const matchMap = new Map<string, number>();
    for (const m of matchCounts1) {
      matchMap.set(m.user1Id, (matchMap.get(m.user1Id) || 0) + m._count.user1Id);
    }
    for (const m of matchCounts2) {
      matchMap.set(m.user2Id, (matchMap.get(m.user2Id) || 0) + m._count.user2Id);
    }

    // Fetch users with a safety cap.
    const rawUsers = await db.user.findMany(where, {
      take: LEADERBOARD_MAX_USERS,
      orderBy: { createdAt: 'desc' },
      select: PUBLIC_USER_SELECT,
    });

    // Compute scores, sort, and paginate in memory.
    const ranked = rawUsers.map((u) => {
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

    if (sort === 'popular') {
      ranked.sort((a, b) => b.popularityScore - a.popularityScore);
    } else {
      ranked.sort((a, b) => b.activityScore - a.activityScore);
    }

    const paged = ranked.slice(skip, skip + limit);

    const cappedTotal = Math.min(totalUsers, LEADERBOARD_MAX_USERS);
    return NextResponse.json({
      data: paged,
      sort,
      pagination: {
        page,
        limit,
        total: cappedTotal,
        totalPages: Math.ceil(cappedTotal / limit),
      },
    }, { headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' } });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    logger.error('/api/leaderboard', 'GET error', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
