import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { sanitizeUser } from '@/lib/auth/projections';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { PAGINATION, RATE_LIMITS } from '@/lib/constants';

const querySchema = z.object({
  gender: z.enum(['all', 'male', 'female', 'other']).default('all'),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.ADMIN_MAX_LIMIT).default(PAGINATION.ADMIN_DEFAULT_LIMIT),
  sort: z.enum(['newest', 'oldest', 'name', 'popular']).default('newest'),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const rateLimit = await checkRateLimit(
      `admin-users:${user.id}`,
      RATE_LIMITS.ADMIN.MAX,
      RATE_LIMITS.ADMIN.WINDOW
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests, try again later' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { gender, search, page, limit, sort } = parsed.data;

    const where: Record<string, unknown> = {};
    if (gender !== 'all') where.gender = gender;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    switch (sort) {
      case 'oldest': orderBy.createdAt = 'asc'; break;
      case 'name': orderBy.name = 'asc'; break;
      case 'popular': orderBy.createdAt = 'desc'; break;
      default: orderBy.createdAt = 'desc';
    }

    const [users, total] = await Promise.all([
      db.user.findMany(where, {
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count(where),
    ]);

    // Batch aggregations
    const userIds = users.map((u) => u.id);

    const [
      likesSent,
      likesReceived,
      matchCounts,
      messageCounts,
      momentCounts,
      lastActivityMap,
    ] = await Promise.all([
      db.like.groupBy({ by: ['fromUserId'], where: { fromUserId: { in: userIds } }, _count: { fromUserId: true } }),
      db.like.groupBy({ by: ['toUserId'], where: { toUserId: { in: userIds } }, _count: { toUserId: true } }),
      Promise.all([
        db.match.groupBy({ by: ['user1Id'], where: { user1Id: { in: userIds } }, _count: { user1Id: true } }),
        db.match.groupBy({ by: ['user2Id'], where: { user2Id: { in: userIds } }, _count: { user2Id: true } }),
      ]),
      db.message.groupBy({ by: ['senderId'], where: { senderId: { in: userIds } }, _count: { senderId: true } }),
      db.moment.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { userId: true } }),
      // Last activity = most recent message createdAt per sender
      // Fetch without take limit; with default 20 users per page, this is negligible
      db.message.findMany({ senderId: { in: userIds } }, {
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type GroupCountResult = {
      _count: Record<string, number>;
      [key: string]: unknown;
    };
    const toMap = (
      arr: GroupCountResult[],
      key: string,
      countKey: string,
    ) =>
      arr.reduce<Record<string, number>>((acc, item) => {
        acc[item[key] as string] = item._count[countKey] ?? 0;
        return acc;
      }, {});

    const likesSentMap = toMap(likesSent as GroupCountResult[], 'fromUserId', 'fromUserId');
    const likesReceivedMap = toMap(likesReceived as GroupCountResult[], 'toUserId', 'toUserId');
    const matchCountsMap = toMap(matchCounts[0] as GroupCountResult[], 'user1Id', 'user1Id');
    for (const m of matchCounts[1] as GroupCountResult[]) {
      const id = String(m.user2Id);
      const counts = m._count as Record<string, number> | undefined;
      matchCountsMap[id] = (matchCountsMap[id] || 0) + (counts?.user2Id ?? 0);
    }
    const messageCountsMap = toMap(messageCounts as GroupCountResult[], 'senderId', 'senderId');
    const momentCountsMap = toMap(momentCounts as GroupCountResult[], 'userId', 'userId');

    const lastActivity: Record<string, string> = {};
    for (const msg of lastActivityMap) {
      if (!lastActivity[msg.senderId]) {
        lastActivity[msg.senderId] = msg.createdAt.toISOString();
      }
    }

    const data = users.map((u) => {
      const safe = sanitizeUser(u);
      return {
      ...safe,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      likesSent: likesSentMap[u.id] ?? 0,
      likesReceived: likesReceivedMap[u.id] ?? 0,
      matchCount: matchCountsMap[u.id] ?? 0,
      messageCount: messageCountsMap[u.id] ?? 0,
      momentsCount: momentCountsMap[u.id] ?? 0,
      lastActivity: lastActivity[u.id] ?? u.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    logger.error('/api/admin/users', 'Admin users GET error', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
