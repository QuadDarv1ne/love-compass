import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const matches = await db.match.findMany(
      {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
      },
      {
        orderBy: { createdAt: 'desc' },
      }
    );

    // Fetch related data separately
    const userIds = new Set<string>();
    for (const m of matches) {
      userIds.add(m.user1Id);
      userIds.add(m.user2Id);
    }

    const [users, allMessages] = await Promise.all([
      db.user.findMany({ id: { in: [...userIds] } }),
      db.message.findMany({ matchId: { in: matches.map((m) => m.id) } }),
    ]);

    // Group messages by matchId and get last message per match
    const lastMsgMap = new Map<string, typeof allMessages[number] | null>();
    for (const msg of allMessages) {
      const existing = lastMsgMap.get(msg.matchId);
      if (!existing || new Date(msg.createdAt) > new Date(existing.createdAt)) {
        lastMsgMap.set(msg.matchId, msg);
      }
    }

    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = matches.map((m) => {
      const u1 = userMap.get(m.user1Id);
      const u2 = userMap.get(m.user2Id);
      return {
      ...m,
      user1: u1 ? sanitizeUser(u1) : null,
      user2: u2 ? sanitizeUser(u2) : null,
      messages: lastMsgMap.get(m.id) ? [lastMsgMap.get(m.id)] : [],
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('/api/matches', 'Failed to fetch matches', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
