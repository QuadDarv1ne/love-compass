import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { VALIDATION, PAGINATION, RATE_LIMITS } from '@/lib/constants';

const createMomentSchema = z.object({
  content: z.string().min(1).max(VALIDATION.MOMENT_MAX_LENGTH),
  gradient: z.string().default('from-rose-400 to-pink-500'),
});

const commentSchema = z.object({
  content: z.string().min(1).max(VALIDATION.COMMENT_MAX_LENGTH),
});

const reactionSchema = z.object({
  emoji: z.string().regex(/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D]+$/u, 'Must be a valid emoji'),
});

const actionSchema = z.object({
  id: z.string(),
  action: z.enum(['like', 'comment', 'react']),
  emoji: z.string().optional(),
  content: z.string().optional(),
});

const momentsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(PAGINATION.MOMENTS_MAX_LIMIT).default(PAGINATION.MOMENTS_DEFAULT_LIMIT),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const parsed = momentsQuerySchema.safeParse({
      limit: parseInt(searchParams.get('limit') || String(PAGINATION.MOMENTS_DEFAULT_LIMIT)),
    });

    const limit = parsed.success ? parsed.data.limit : PAGINATION.MOMENTS_DEFAULT_LIMIT;

    const moments = await db.moment.findMany({}, {
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Fetch related data separately
    const userIds = [...new Set(moments.map((m) => m.userId))];
    const momentIds = moments.map((m) => m.id);

    const [users, comments, reactions, totalMoments, userLikes] = await Promise.all([
      db.user.findMany({ id: { in: userIds } }),
      db.momentComment.findMany({ momentId: { in: momentIds } }, { orderBy: { createdAt: 'asc' } }),
      db.momentReaction.findMany({ momentId: { in: momentIds } }),
      db.moment.count({}),
      db.momentLike.findMany({ userId: auth.user.id }),
    ]);
    const likedMomentIds = new Set(userLikes.map((l) => l.momentId));

    // Fetch comment users
    const commentUserIds = [...new Set(comments.map((c) => c.userId))];
    const commentUsers = await db.user.findMany({ id: { in: commentUserIds } });
    const commentUserMap = new Map(commentUsers.map((u) => [u.id, u]));

    const userMap = new Map(users.map((u) => [u.id, u]));

    const commentsByMoment = new Map<string, typeof comments>();
    for (const c of comments) {
      const arr = commentsByMoment.get(c.momentId);
      if (arr) {
        arr.push(c);
      } else {
        commentsByMoment.set(c.momentId, [c]);
      }
    }

    const reactionsByMoment = new Map<string, typeof reactions>();
    const userReactionsByMoment = new Map<string, Set<string>>();
    for (const r of reactions) {
      const arr = reactionsByMoment.get(r.momentId);
      if (arr) {
        arr.push(r);
      } else {
        reactionsByMoment.set(r.momentId, [r]);
      }
      if (r.userId === auth.user.id) {
        let set = userReactionsByMoment.get(r.momentId);
        if (!set) {
          set = new Set();
          userReactionsByMoment.set(r.momentId, set);
        }
        set.add(r.emoji);
      }
    }

    const data = moments.map((moment) => {
      const momentComments = commentsByMoment.get(moment.id) || [];
      const momentReactions = reactionsByMoment.get(moment.id) || [];
      const user = userMap.get(moment.userId);

      return {
        id: moment.id,
        userId: moment.userId,
        userName: user?.name,
        userAvatar: user?.avatar,
        content: moment.content,
        gradient: moment.gradient,
        createdAt: moment.createdAt.toISOString(),
        likes: moment.likes,
        userLiked: likedMomentIds.has(moment.id),
        userReactions: Array.from(userReactionsByMoment.get(moment.id) ?? []),
        comments: momentComments.map((c) => {
          const cu = commentUserMap.get(c.userId);
          return {
            id: c.id,
            userId: c.userId,
            userName: cu?.name,
            userAvatar: cu?.avatar,
            content: c.content,
            createdAt: c.createdAt.toISOString(),
          };
        }),
        reactions: momentReactions.reduce<Record<string, number>>((acc, r) => {
          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
          return acc;
        }, {}),
      };
    });

    return NextResponse.json({ data, total: totalMoments });
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

    // Rate limit moment creation
    const rateLimit = await checkRateLimit(`moment:${user.id}`, RATE_LIMITS.MOMENT.MAX, RATE_LIMITS.MOMENT.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many posts, try again later' }, { status: 429 });
    }

    const moment = await db.moment.create({
      userId: user.id,
      content,
      gradient,
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
    const moment = await db.moment.findUnique({ id });
    if (!moment) {
      return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
    }

    if (action === 'like') {
      const result = await db.transaction(async (tx) => {
        const existing = await tx.momentLike.findUnique({
          momentId: id, userId: auth.user.id,
        });

        if (existing) {
          await tx.momentLike.delete({ id: existing.id });
          const updated = await tx.moment.update(
            { id },
            { likes: { decrement: 1 } }
          );
          return { likes: updated.likes, liked: false };
        }

        await tx.momentLike.create({ momentId: id, userId: auth.user.id });
        const updated = await tx.moment.update(
          { id },
          { likes: { increment: 1 } }
        );
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
        momentId: id,
        userId: auth.user.id,
        content: commentResult.data.content,
      });

      const commenter = await db.user.findUnique({ id: auth.user.id });

      return NextResponse.json({
        data: {
          id: comment.id,
          userId: comment.userId,
          userName: commenter?.name ?? null,
          userAvatar: commenter?.avatar ?? null,
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

      // Atomic toggle: use transaction to prevent race condition
      const result = await db.transaction(async (tx) => {
        const existing = await tx.momentReaction.findUnique({
          momentId: id, userId: auth.user.id, emoji: reactionResult.data.emoji,
        });

        if (existing) {
          await tx.momentReaction.delete({ id: existing.id });
          return { removed: true };
        }

        await tx.momentReaction.create({
          momentId: id,
          userId: auth.user.id,
          emoji: reactionResult.data.emoji,
        });
        return { added: true };
      });

      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    // Handle concurrent unique constraint violation on momentLike/momentReaction
    if (error instanceof Error && 'code' in error && (error as Error & { code: string }).code === 'P2002') {
      try {
        const raw = await request.clone().json();
        const parsed = actionSchema.safeParse(raw);
        if (parsed.success && parsed.data.action === 'like') {
          const auth = await requireAuth();
          if (auth instanceof NextResponse) return auth;
          const existing = await db.momentLike.findUnique({ momentId: parsed.data.id, userId: auth.user.id });
          const moment = await db.moment.findUnique({ id: parsed.data.id });
          return NextResponse.json({ data: { liked: !!existing, likes: moment?.likes ?? 0 } });
        }
        if (parsed.success && parsed.data.action === 'react' && parsed.data.emoji) {
          const auth = await requireAuth();
          if (auth instanceof NextResponse) return auth;
          const existing = await db.momentReaction.findUnique({
            momentId: parsed.data.id, userId: auth.user.id, emoji: parsed.data.emoji,
          });
          return NextResponse.json({ data: existing ? { added: true } : { removed: true } });
        }
      } catch (innerError) {
        logger.warn('/api/moments', 'P2002 recovery query failed', innerError);
      }
      return NextResponse.json({ error: 'Conflict, please retry' }, { status: 409 });
    }
    logger.error('/api/moments', 'PATCH error', error);
    return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
  }
}
