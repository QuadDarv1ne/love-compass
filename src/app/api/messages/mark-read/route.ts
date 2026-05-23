import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

const markReadSchema = z.object({
  messageIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const body = await request.json();
    const { messageIds } = markReadSchema.parse(body);

    // Verify all messages belong to matches the user participates in
    const messages = await db.message.findMany({
      where: {
        id: { in: messageIds },
        match: {
          OR: [{ user1Id: user.id }, { user2Id: user.id }],
        },
      },
      select: { id: true, matchId: true },
    });

    const foundIds = messages.map((m) => m.id);

    await db.message.updateMany({
      where: {
        id: { in: foundIds },
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ marked: foundIds.length });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('/api/messages/mark-read', 'Mark-read error', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}
