import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

const createMomentSchema = z.object({
  content: z.string().min(1).max(200),
  gradient: z.string().default('from-rose-400 to-pink-500'),
});

const commentSchema = z.object({
  content: z.string().min(1).max(500),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(4),
});

const actionSchema = z.object({
  id: z.string(),
  action: z.enum(['like', 'comment', 'react']),
  emoji: z.string().optional(),
  content: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const moments = await db.moment.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reactions: {
          select: {
            emoji: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = moments.map((moment) => ({
      id: moment.id,
      userId: moment.userId,
      userName: moment.user.name,
      userAvatar: moment.user.avatar,
      content: moment.content,
      gradient: moment.gradient,
      createdAt: moment.createdAt.toISOString(),
      likes: moment.likes,
      comments: moment.comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.user.name,
        userAvatar: c.user.avatar,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      reactions: moment.reactions.reduce<Record<string, number>>((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
      }, {}),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    logger.error('/api/moments', 'GET error', error);
    return NextResponse.json({ error: 'Failed to fetch moments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const result = createMomentSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const { content, gradient } = result.data;

    const moment = await db.moment.create({
      data: {
        userId: user.id,
        content,
        gradient,
      },
    });

    return NextResponse.json({ data: moment }, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    logger.error('/api/moments', 'POST error', error);
    return NextResponse.json({ error: 'Failed to create moment' }, { status: 500 });
  }
}

// Like a moment
export async function PATCH(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const result = actionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.issues }, { status: 400 });
    }

    const { id, action, emoji, content } = result.data;

    // Verify moment exists
    const moment = await db.moment.findUnique({ where: { id } });
    if (!moment) {
      return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
    }

    if (action === 'like') {
      const result = await db.$transaction(async (tx) => {
        const existing = await tx.momentLike.findUnique({
          where: { momentId_userId: { momentId: id, userId: auth.user.id } },
        });

        if (existing) {
          // Unlike: remove the like and decrement count
          await tx.momentLike.delete({ where: { id: existing.id } });
          const updated = await db.moment.update({
            where: { id },
            data: { likes: { decrement: 1 } },
          });
          return { likes: updated.likes, liked: false };
        }

        // Like: create record and increment count
        await tx.momentLike.create({
          data: { momentId: id, userId: auth.user.id },
        });
        const updated = await db.moment.update({
          where: { id },
          data: { likes: { increment: 1 } },
        });
        return { likes: updated.likes, liked: true };
      });

      return NextResponse.json({ data: result });
    }

    if (action === 'comment') {
      if (!content) {
        return NextResponse.json({ error: 'Content is required for comment' }, { status: 400 });
      }
      const commentResult = commentSchema.safeParse({ content });
      if (!commentResult.success) {
        return NextResponse.json({ error: 'Invalid input', details: commentResult.error.issues }, { status: 400 });
      }

      const comment = await db.momentComment.create({
        data: {
          momentId: id,
          userId: auth.user.id,
          content: commentResult.data.content,
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      return NextResponse.json({
        data: {
          id: comment.id,
          userId: comment.userId,
          userName: comment.user.name,
          userAvatar: comment.user.avatar,
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
        },
      }, { status: 201 });
    }

    if (action === 'react') {
      if (!emoji) {
        return NextResponse.json({ error: 'Emoji is required for reaction' }, { status: 400 });
      }
      const reactionResult = reactionSchema.safeParse({ emoji });
      if (!reactionResult.success) {
        return NextResponse.json({ error: 'Invalid input', details: reactionResult.error.issues }, { status: 400 });
      }

      // Upsert: toggle reaction
      const existing = await db.momentReaction.findUnique({
        where: { momentId_userId_emoji: { momentId: id, userId: auth.user.id, emoji: reactionResult.data.emoji } },
      });

      if (existing) {
        await db.momentReaction.delete({ where: { id: existing.id } });
        return NextResponse.json({ data: { removed: true } });
      }

      await db.momentReaction.create({
        data: {
          momentId: id,
          userId: auth.user.id,
          emoji: reactionResult.data.emoji,
        },
      });

      return NextResponse.json({ data: { added: true } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    logger.error('/api/moments', 'PATCH error', error);
    return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
  }
}
