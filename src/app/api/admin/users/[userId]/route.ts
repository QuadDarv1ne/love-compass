import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireAdmin, requireAdminWithCSRF, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { deleteUserCascade } from '@/lib/delete-user';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdmin();
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;

    const user = await db.user.findUnique({ id: userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const safeUser = sanitizeUser(user);

    const userMatches = await db.match.findMany({ OR: [{ user1Id: userId }, { user2Id: userId }] });
    const userMatchIds = userMatches.map(m => m.id);

    const [
      likesSent,
      likesReceived,
      matchCount,
      messagesSent,
      messagesReceived,
      momentsCount,
      momentCommentsCount,
      momentReactionsCount,
      blocksReceived,
      blocksSent,
      reportsReceived,
      reportsSent,
      achievementsCount,
      lastMessage,
    ] = await Promise.all([
      db.like.count({ fromUserId: userId }),
      db.like.count({ toUserId: userId }),
      db.match.count({ OR: [{ user1Id: userId }, { user2Id: userId }] }),
      db.message.count({ senderId: userId }),
      // Count messages received: all messages in user's matches where sender is not the user
      userMatchIds.length > 0
        ? db.message.count({ matchId: { in: userMatchIds }, senderId: { not: userId } })
        : Promise.resolve(0),
      db.moment.count({ userId }),
      db.momentComment.count({ userId }),
      db.momentReaction.count({ userId }),
      db.block.count({ blockedId: userId }),
      db.block.count({ blockerId: userId }),
      db.report.count({ reportedId: userId }),
      db.report.count({ reporterId: userId }),
      db.userAchievement.count({ userId }),
      userMatchIds.length > 0
        ? db.message.findFirst({ matchId: { in: userMatchIds } }, { orderBy: { createdAt: 'desc' } })
        : Promise.resolve(null),
    ]);

    const lastActivity = lastMessage ? lastMessage.createdAt.toISOString() : safeUser.updatedAt.toISOString();

    return NextResponse.json({
      data: {
        ...safeUser,
        createdAt: safeUser.createdAt.toISOString(),
        updatedAt: safeUser.updatedAt.toISOString(),
        stats: {
          likesSent,
          likesReceived,
          matchCount,
          messagesSent,
          messagesReceived,
          momentsCount,
          momentCommentsCount,
          momentReactionsCount,
          blocksReceived,
          blocksSent,
          reportsReceived,
          reportsSent,
          achievementsCount,
          lastActivity,
        },
      },
    });
  } catch (error) {
    logger.error('/api/admin/users/[userId]', 'Failed to fetch user details', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdminWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;

    const bodySchema = z.object({
      profileVisible: z.boolean().optional(),
      role: z.enum(['user', 'admin']).optional(),
    });

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ id: userId });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await db.user.update({ id: userId }, parsed.data);

    return NextResponse.json({ data: {
      id: updated.id,
      role: updated.role,
      profileVisible: updated.profileVisible,
    } });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    logger.error('admin.users.PATCH', 'Failed to update user', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const auth = await requireAdminWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { userId } = await params;

    // Prevent self-deletion
    const adminUser = (auth as { user: { id: string } }).user;
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Verify user exists
    const user = await db.user.findUnique({ id: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await deleteUserCascade(tx, { id: userId, email: user.email });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Failed to delete user: related data exists' }, { status: 409 });
    }
    logger.error('/api/admin/users/[userId]', 'Failed to delete user', error);
    return NextResponse.json({ error: 'Server error while deleting user' }, { status: 500 });
  }
}
