import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Verify user exists
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete in order: messages → likes → matches → user
    // Prisma will handle cascading if relations are set up properly,
    // but since we have explicit relations, delete dependent records first

    // Get all matches for this user
    const matches = await db.match.findMany({
      where: {
        OR: [{ user1Id: id }, { user2Id: id }],
      },
      select: { id: true },
    });

    const matchIds = matches.map((m) => m.id);

    // Delete all messages in those matches
    if (matchIds.length > 0) {
      await db.message.deleteMany({
        where: { matchId: { in: matchIds } },
      });
    }

    // Delete all likes (sent and received)
    await db.like.deleteMany({
      where: { OR: [{ fromUserId: id }, { toUserId: id }] },
    });

    // Delete all matches
    if (matchIds.length > 0) {
      await db.match.deleteMany({
        where: { id: { in: matchIds } },
      });
    }

    // Delete any remaining messages sent by user (edge case)
    await db.message.deleteMany({
      where: { senderId: id },
    });

    // Finally delete the user
    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
