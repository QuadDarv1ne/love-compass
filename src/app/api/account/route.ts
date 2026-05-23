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
    await db.$transaction(async (tx) => {
      // Get all matches for this user
      const matches = await tx.match.findMany({
        where: { OR: [{ user1Id: id }, { user2Id: id }] },
        select: { id: true },
      });
      const matchIds = matches.map((m) => m.id);

      // Delete all messages in those matches
      if (matchIds.length > 0) {
        await tx.message.deleteMany({ where: { matchId: { in: matchIds } } });
      }

      // Delete all likes (sent and received)
      await tx.like.deleteMany({ where: { OR: [{ fromUserId: id }, { toUserId: id }] } });

      // Delete all matches
      if (matchIds.length > 0) {
        await tx.match.deleteMany({ where: { id: { in: matchIds } } });
      }

      // Delete any remaining messages
      await tx.message.deleteMany({ where: { senderId: id } });

      // Delete blocks and reports
      await tx.block.deleteMany({ where: { OR: [{ blockerId: id }, { blockedId: id }] } });
      await tx.report.deleteMany({ where: { OR: [{ reporterId: id }, { reportedId: id }] } });

      // Delete moments, comments, reactions, likes, achievements
      await tx.moment.deleteMany({ where: { userId: id } });
      await tx.momentComment.deleteMany({ where: { userId: id } });
      await tx.momentReaction.deleteMany({ where: { userId: id } });
      await tx.momentLike.deleteMany({ where: { userId: id } });
      await tx.userAchievement.deleteMany({ where: { userId: id } });

      // Delete rate limit entries for all known prefixes
      await tx.rateLimit.deleteMany({ where: { key: { startsWith: `auto-reply:${id}` } } });
      await tx.rateLimit.deleteMany({ where: { key: { startsWith: `report:${id}` } } });
      // Email-based rate limits (need to fetch email first)
      // Note: These are orphaned after user deletion but are harmless since RateLimit
      // has no FK to User. The periodic cleanup in rate-limit.ts handles them.

      // Finally delete the user
      await tx.user.delete({ where: { id } });

      // Invalidate sessions inside the transaction for atomicity
      await tx.session.deleteMany({ where: { userId: id } });
    });

    // Clear cookie after successful transaction
    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/account', 'Account deletion error', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
