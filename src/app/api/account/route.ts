import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuthWithCSRF } from '@/lib/auth/guard';
import { deleteSessionCookie } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const id = user.id;

    // Wrap all database deletions in a transaction for atomicity
    await db.transaction(async (tx) => {
      // Get all matches for this user
      const matches = await tx.match.findMany(
        { OR: [{ user1Id: id }, { user2Id: id }] }
      );
      const matchIds = matches.map((m) => m.id);

      // Delete all messages in those matches
      if (matchIds.length > 0) {
        await tx.message.deleteMany({ matchId: { in: matchIds } });
      }

      // Delete all likes (sent and received)
      await tx.like.deleteMany({ OR: [{ fromUserId: id }, { toUserId: id }] });

      // Delete all matches
      if (matchIds.length > 0) {
        await tx.match.deleteMany({ id: { in: matchIds } });
      }

      // Delete any remaining messages
      await tx.message.deleteMany({ senderId: id });

      // Delete blocks and reports
      await tx.block.deleteMany({ OR: [{ blockerId: id }, { blockedId: id }] });
      await tx.report.deleteMany({ OR: [{ reporterId: id }, { reportedId: id }] });

      // Delete moments, comments, reactions, likes, achievements
      await tx.moment.deleteMany({ userId: id });
      await tx.momentComment.deleteMany({ userId: id });
      await tx.momentReaction.deleteMany({ userId: id });
      await tx.momentLike.deleteMany({ userId: id });
      await tx.userAchievement.deleteMany({ userId: id });

      // Delete rate limit entries for all known prefixes
      await tx.rateLimit.deleteMany({ key: { startsWith: `auto-reply:${id}` } });
      await tx.rateLimit.deleteMany({ key: { startsWith: `report:${id}` } });
      await tx.rateLimit.deleteMany({ key: { startsWith: `like:${id}` } });
      // Email-based rate limits
      await tx.rateLimit.deleteMany({ key: { startsWith: `login:${user.email}` } });
      await tx.rateLimit.deleteMany({ key: { startsWith: `verify:${user.email}` } });

      // Invalidate sessions before deleting user (FK constraint requires sessions deleted first)
      await tx.session.deleteMany({ userId: id });

      // Finally delete the user
      await tx.user.delete({ id });
    });

    // Clear cookie after successful transaction
    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/account', 'Account deletion error', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
