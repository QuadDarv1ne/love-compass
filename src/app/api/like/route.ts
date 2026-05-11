import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const likeSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromUserId, toUserId } = likeSchema.parse(body);

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 });
    }

    // Check if like already exists
    const existingLike = await db.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ message: 'Already liked' });
    }

    // Create the like
    const like = await db.like.create({
      data: { fromUserId, toUserId },
    });

    // Check if there is a reverse like (mutual like)
    const reverseLike = await db.like.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: toUserId,
          toUserId: fromUserId,
        },
      },
    });

    let match = null;

    if (reverseLike) {
      // Check if match already exists
      const existingMatch = await db.match.findFirst({
        where: {
          OR: [
            { user1Id: fromUserId, user2Id: toUserId },
            { user1Id: toUserId, user2Id: fromUserId },
          ],
        },
      });

      if (!existingMatch) {
        match = await db.match.create({
          data: {
            user1Id: fromUserId < toUserId ? fromUserId : toUserId,
            user2Id: fromUserId < toUserId ? toUserId : fromUserId,
          },
        });
      } else {
        match = existingMatch;
      }
    }

    return NextResponse.json({ like, match, isMutual: !!match });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create like' }, { status: 500 });
  }
}
