import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { VALIDATION, RATE_LIMITS } from '@/lib/constants';

const blockSchema = z.object({
  blockedId: z.string().min(1),
  reason: z.string().max(VALIDATION.BLOCK_REASON_MAX_LENGTH).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { blockedId, reason } = blockSchema.parse(body);
    const blockerId = user.id;

    // Rate limit blocks to prevent abuse
    const rateLimit = await checkRateLimit(`block:${blockerId}`, RATE_LIMITS.BLOCK.MAX, RATE_LIMITS.BLOCK.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many actions, try again later' }, { status: 429 });
    }

    if (blockerId === blockedId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const existing = await db.block.findUnique({
      blockerId, blockedId,
    });
    if (existing) {
      return NextResponse.json({ error: 'Already blocked' }, { status: 409 });
    }

    const block = await db.block.create({ blockerId, blockedId, reason });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    // Handle unique constraint violation from TOCTOU race
    if (
      error instanceof Error &&
      (error.message.includes('Unique constraint failed') || error.message.includes('UNIQUE constraint failed'))
    ) {
      return NextResponse.json({ error: 'Already blocked' }, { status: 409 });
    }
    logger.error('/api/block', 'Failed to block user', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const blocks = await db.block.findMany(
      { blockerId: user.id }
    );

    return NextResponse.json({ data: blocks });
  } catch (error) {
    logger.error('/api/block', 'Failed to fetch blocked users', error);
    return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { blockedId } = z.object({
      blockedId: z.string().min(1),
    }).parse(body);

    await db.block.deleteMany({ blockerId: user.id, blockedId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
