import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { RATE_LIMITS } from '@/lib/constants';

const dislikeSchema = z.object({
  toUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { toUserId } = dislikeSchema.parse(body);

    // Rate limit dislikes to prevent spam
    const rateLimit = await checkRateLimit(`dislike:${user.id}`, RATE_LIMITS.DISLIKE.MAX, RATE_LIMITS.DISLIKE.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Слишком много действий, попробуйте позже' }, { status: 429 });
    }

    if (user.id === toUserId) {
      return NextResponse.json({ error: 'Cannot dislike yourself' }, { status: 400 });
    }

    await db.dislike.create({ fromUserId: user.id, toUserId });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('/api/dislike', 'Failed to create dislike', error);
    return NextResponse.json({ error: 'Failed to create dislike' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const dislikes = await db.dislike.findMany({ fromUserId: user.id });
    const dislikedIds = dislikes.map((d) => d.toUserId);

    return NextResponse.json({ data: dislikedIds });
  } catch (error) {
    logger.error('/api/dislike', 'Failed to fetch dislikes', error);
    return NextResponse.json({ error: 'Failed to fetch dislikes' }, { status: 500 });
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

    await db.dislike.deleteMany({ fromUserId: user.id, toUserId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/dislike', 'Failed to undo dislike', error);
    return NextResponse.json({ error: 'Failed to undo dislike' }, { status: 500 });
  }
}
