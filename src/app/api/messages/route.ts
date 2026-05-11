import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const sendMessageSchema = z.object({
  matchId: z.string().min(1),
  senderId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId parameter' }, { status: 400 });
    }

    const messages = await db.message.findMany({
      where: { matchId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matchId, senderId, content } = sendMessageSchema.parse(body);

    const message = await db.message.create({
      data: { matchId, senderId, content },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
