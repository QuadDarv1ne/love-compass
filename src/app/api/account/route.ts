import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { invalidateAllUserSessions, deleteSessionCookie, getSessionTokenFromCookie } from '@/lib/auth/session';

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const id = user.id;

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

    // Delete any remaining messages
    await db.message.deleteMany({
      where: { senderId: id },
    });

    // Delete blocks and reports
    await db.block.deleteMany({
      where: { OR: [{ blockerId: id }, { blockedId: id }] },
    });
    await db.report.deleteMany({
      where: { OR: [{ reporterId: id }, { reportedId: id }] },
    });

    // Delete all sessions
    await invalidateAllUserSessions(id);

    // Finally delete the user
    await db.user.delete({ where: { id } });

    // Clear session cookie
    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
