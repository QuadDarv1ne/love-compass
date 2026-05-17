import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guard';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

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
    activeUserIds,
  ] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ['gender'], _count: { gender: true } }),
    db.match.count(),
    db.message.count(),
    db.like.count(),
    db.moment.count(),
    db.report.count(),
    db.block.count(),
    db.user.count({ where: { createdAt: { gte: startOfDay } } }),
    db.user.count({ where: { createdAt: { gte: startOfWeek } } }),
    // Active users: sent a like or message in last 7 days
    Promise.all([
      db.like.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { fromUserId: true },
        distinct: ['fromUserId'],
      }),
      db.message.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { senderId: true },
        distinct: ['senderId'],
      }),
    ]),
  ]);

  const maleCount = genderBreakdown.find((g) => g.gender === 'male')?._count.gender ?? 0;
  const femaleCount = genderBreakdown.find((g) => g.gender === 'female')?._count.gender ?? 0;
  const otherCount = totalUsers - maleCount - femaleCount;

  const activeUserIdSet = new Set([
    ...activeUserIds[0].map((l) => l.fromUserId),
    ...activeUserIds[1].map((m) => m.senderId),
  ]);

  return NextResponse.json({
    data: {
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
    },
  });
}
