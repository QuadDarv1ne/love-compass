import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { RATE_LIMITS, VALIDATION } from '@/lib/constants';

const sendMessageSchema = z.object({
  matchId: z.string().min(1),
  content: z.string().min(1).max(VALIDATION.MESSAGE_MAX_LENGTH),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId parameter' }, { status: 400 });
    }

    // Verify user is a participant in this match
    const match = await db.match.findUnique({ id: matchId });

    if (!match || (match.user1Id !== auth.user.id && match.user2Id !== auth.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Pagination: default 50 messages, max 100
    const parsedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(parsedLimit, 100) : 50;
    const cursor = searchParams.get('cursor');

    const messages = await db.message.findMany(
      { matchId },
      { skip: cursor ? 1 : 0, take: limit, orderBy: { createdAt: 'asc' }, cursor: cursor ? { id: cursor } : undefined }
    );

    // Fetch sender data separately
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await db.user.findMany({ id: { in: senderIds } });
    const senderMap = new Map(senders.map((s) => [s.id, sanitizeUser(s)]));

    const data = messages.map((m) => ({
      ...m,
      sender: senderMap.get(m.senderId),
    }));

    const nextCursor = messages.length === limit ? messages[messages.length - 1]?.id : null;

    return NextResponse.json({ messages: data, nextCursor });
  } catch (error) {
    logger.error('/api/messages', 'Failed to fetch messages', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { matchId, content } = sendMessageSchema.parse(body);

    // Rate limit message sending
    const rateLimit = await checkRateLimit(`msg:${user.id}`, RATE_LIMITS.MESSAGE.MAX, RATE_LIMITS.MESSAGE.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many messages, try again later' }, { status: 429 });
    }

    // Verify user is a participant in this match
    const match = await db.match.findUnique({ id: matchId });

    if (!match || (match.user1Id !== user.id && match.user2Id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if either user has blocked the other
    const otherUserId = match.user1Id === user.id ? match.user2Id : match.user1Id;
    const existingBlock = await db.block.findFirst({
      OR: [
        { blockerId: user.id, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: user.id },
      ],
    });

    if (existingBlock) {
      return NextResponse.json({ error: 'Unable to interact with this user' }, { status: 403 });
    }

    const [message, sender] = await Promise.all([
      db.message.create({ matchId, senderId: user.id, content }),
      db.user.findUnique({ id: user.id }),
    ]);

    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    return NextResponse.json({ ...message, sender: { id: sender.id, name: sender.name, avatar: sender.avatar } }, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
