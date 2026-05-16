import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/guard';

const likeSchema = z.object({
  toUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { toUserId } = likeSchema.parse(body);
    const fromUserId = user.id;

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 });
    }

    // Execute all operations in a transaction to prevent race conditions
    const result = await db.$transaction(async (tx) => {
      // Check if like already exists
      const existingLike = await tx.like.findUnique({
        where: {
          fromUserId_toUserId: { fromUserId, toUserId },
        },
      });

      if (existingLike) {
        return { like: existingLike, match: null, isMutual: false };
      }

      // Create the like
      const like = await tx.like.create({
        data: { fromUserId, toUserId },
      });

      // Check if there is a reverse like (mutual like)
      const reverseLike = await tx.like.findUnique({
        where: {
          fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId },
        },
      });

      if (!reverseLike) {
        return { like, match: null, isMutual: false };
      }

      // Check for existing match
      const existingMatch = await tx.match.findFirst({
        where: {
          OR: [
            { user1Id: fromUserId, user2Id: toUserId },
            { user1Id: toUserId, user2Id: fromUserId },
          ],
        },
      });

      if (existingMatch) {
        return { like, match: existingMatch, isMutual: true };
      }

      // Create new match (consistent ordering by ID)
      const match = await tx.match.create({
        data: {
          user1Id: fromUserId < toUserId ? fromUserId : toUserId,
          user2Id: fromUserId < toUserId ? toUserId : fromUserId,
        },
      });

      return { like, match, isMutual: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create like' }, { status: 500 });
  }
}
