import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/constants';

const STATS_CACHE_TTL_MS = 60_000;
let cachedStats: { data: unknown; expiresAt: number } | null = null;

async function computeStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    genderBreakdown,
    totalMatches,
    totalMessages,
    totalLikes,
    totalMoments,
    totalReports,
    totalBlocks,
    newUsersToday,
    newUsersThisWeek,
    activeLikers,
    activeSenders,
  ] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ['gender'], _count: { gender: true } }) as Promise<{ gender: string; _count: { gender: number } }[]>,
    db.match.count(),
    db.message.count(),
    db.like.count(),
    db.moment.count(),
    db.report.count(),
    db.block.count(),
    db.user.count({ createdAt: { gte: startOfDay } }),
    db.user.count({ createdAt: { gte: startOfWeek } }),
    db.like.groupBy({
      by: ['fromUserId'],
      where: { createdAt: { gte: sevenDaysAgo } },
    }) as Promise<{ fromUserId: string }[]>,
    db.message.groupBy({
      by: ['senderId'],
      where: { createdAt: { gte: sevenDaysAgo } },
    }) as Promise<{ senderId: string }[]>,
  ]);

  const maleCount = genderBreakdown.find((g) => g.gender === 'male')?._count.gender ?? 0;
  const femaleCount = genderBreakdown.find((g) => g.gender === 'female')?._count.gender ?? 0;
  const otherCount = totalUsers - maleCount - femaleCount;

  const activeUserIdSet = new Set([
    ...activeLikers.map((l: { fromUserId: string }) => l.fromUserId),
    ...activeSenders.map((m: { senderId: string }) => m.senderId),
  ]);

  return {
    totalUsers,
    maleCount,
    femaleCount,
    otherCount,
    activeUsers: activeUserIdSet.size,
    totalMatches,
    totalMessages,
    totalLikes,
    totalMoments,
    totalReports,
    totalBlocks,
    newUsersToday,
    newUsersThisWeek,
  };
}

export async function GET(_request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const rateLimit = await checkRateLimit(
      `admin-stats:${user.id}`,
      RATE_LIMITS.ADMIN.MAX,
      RATE_LIMITS.ADMIN.WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, try again later' },
        { status: 429 }
      );
    }

    const now = Date.now();
    if (cachedStats && cachedStats.expiresAt > now) {
      return NextResponse.json({ data: cachedStats.data });
    }

    const data = await computeStats();
    cachedStats = { data, expiresAt: now + STATS_CACHE_TTL_MS };

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('/api/admin/stats', 'Admin stats error', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
