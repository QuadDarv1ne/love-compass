import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

const blockSchema = z.object({
  blockedId: z.string().min(1),
  reason: z.string().optional(),
});

// Fields safe to expose for a blocked user profile
const blockedUserSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  avatar: true,
  city: true,
};

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { blockedId, reason } = blockSchema.parse(body);
    const blockerId = user.id;

    if (blockerId === blockedId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const existing = await db.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already blocked' }, { status: 409 });
    }

    const block = await db.block.create({
      data: { blockerId, blockedId, reason },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const blocks = await db.block.findMany({
      where: { blockerId: user.id },
      include: { blocked: { select: blockedUserSelect } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ blocks });
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

    await db.block.deleteMany({
      where: { blockerId: user.id, blockedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
