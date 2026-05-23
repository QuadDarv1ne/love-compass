import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

// Fields safe to expose in match user profiles
const matchUserSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  bio: true,
  interests: true,
  avatar: true,
  city: true,
  lookingFor: true,
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const matches = await db.match.findMany({
      where: {
        OR: [{ user1Id: user.id }, { user2Id: user.id }],
      },
      include: {
        user1: { select: matchUserSelect },
        user2: { select: matchUserSelect },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: matches });
  } catch (error) {
    logger.error('/api/matches', 'Failed to fetch matches', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
