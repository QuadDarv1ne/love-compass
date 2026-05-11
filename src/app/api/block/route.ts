import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const blockSchema = z.object({
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { blockerId, blockedId, reason } = blockSchema.parse(body);

    if (blockerId === blockedId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Check if already blocked
    const existing = await db.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already blocked', block: existing }, { status: 409 });
    }

    const block = await db.block.create({
      data: { blockerId, blockedId, reason },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const blocks = await db.block.findMany({
      where: { blockerId: userId },
      include: { blocked: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ blocks });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch blocked users' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { blockerId, blockedId } = z.object({
      blockerId: z.string().min(1),
      blockedId: z.string().min(1),
    }).parse(body);

    await db.block.deleteMany({
      where: { blockerId, blockedId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}
