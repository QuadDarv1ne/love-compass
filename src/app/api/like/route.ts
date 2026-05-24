import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const likeSchema = z.object({
  toUserId: z.string().min(1),
  isSuperLike: z.boolean().optional().default(false),
});

const SUPER_LIKE_DAILY_LIMIT = 3;

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { toUserId, isSuperLike } = likeSchema.parse(body);
    const fromUserId = user.id;

    // Rate limit likes to prevent spam
    const rateLimit = await checkRateLimit(`like:${fromUserId}`, 30, 600);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many likes, try again later' }, { status: 429 });
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 });
    }

    // Execute all operations in a transaction to prevent race conditions
    const result = await db.transaction(async (tx) => {
      // Check super like daily limit inside the transaction to prevent races
      if (isSuperLike) {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        const count = await tx.like.count({
          fromUserId,
          isSuperLike: true,
          createdAt: { gte: startOfDay, lt: endOfDay },
        });
        if (count >= SUPER_LIKE_DAILY_LIMIT) {
          throw Object.assign(new Error('Daily super like limit reached'), { limitExceeded: true, current: count });
        }
      }

      // Check if like already exists
      const existingLike = await tx.like.findUnique({
        fromUserId, toUserId,
      });

      if (existingLike) {
        return { like: existingLike, match: null, isMutual: false };
      }

      // Create the like
      const like = await tx.like.create({ fromUserId, toUserId, isSuperLike });

      // Check if there is a reverse like (mutual like)
      const reverseLike = await tx.like.findUnique({
        fromUserId: toUserId, toUserId: fromUserId,
      });

      if (!reverseLike) {
        return { like, match: null, isMutual: false };
      }

      // Check for existing match
      const existingMatch = await tx.match.findFirst({
        OR: [
          { user1Id: fromUserId, user2Id: toUserId },
          { user1Id: toUserId, user2Id: fromUserId },
        ],
      });

      if (existingMatch) {
        return { like, match: existingMatch, isMutual: true };
      }

      // Create new match (consistent ordering by ID)
      const match = await tx.match.create({
        user1Id: fromUserId < toUserId ? fromUserId : toUserId,
        user2Id: fromUserId < toUserId ? toUserId : fromUserId,
      });

      return { like, match, isMutual: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && 'limitExceeded' in error) {
      return NextResponse.json(
        { error: 'Daily super like limit reached', limit: SUPER_LIKE_DAILY_LIMIT, current: (error as any).current },
        { status: 429 }
      );
    }
    // Gracefully handle race condition where both users liked each other simultaneously
    // and both transactions tried to create a match (unique constraint violation)
    if (error instanceof Error && (error as any).code === 'P2002') {
      logger.warn('/api/like', 'Match race condition caught, returning existing match');
      return NextResponse.json({ error: 'Match already exists', raceHandled: true }, { status: 200 });
    }
    logger.error('/api/like', 'Failed to create like', error);
    return NextResponse.json({ error: 'Failed to create like' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    const toUserId = searchParams.get('toUserId')?.trim();

    if (!toUserId) {
      return NextResponse.json({ error: 'Missing toUserId parameter' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // Delete the like
      await tx.like.deleteMany({
        AND: [{ fromUserId: user.id }, { toUserId }],
      });

      // If a match exists, delete it too
      const match = await tx.match.findFirst({
        OR: [
          { user1Id: user.id, user2Id: toUserId },
          { user1Id: toUserId, user2Id: user.id },
        ],
      });

      if (match) {
        // Only delete match if the reverse like also doesn't exist
        const reverseLike = await tx.like.findUnique({
          fromUserId: toUserId, toUserId: user.id,
        });
        if (!reverseLike) {
          await tx.match.delete({ id: match.id });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/like', 'Failed to undo like', error);
    return NextResponse.json({ error: 'Failed to undo like' }, { status: 500 });
  }
}
