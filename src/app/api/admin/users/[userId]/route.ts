import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, requireAdminWithCSRF } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { z } from 'zod';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  const user = await db.user.findUnique({ id: userId });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const safeUser = sanitizeUser(user);

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
    db.message.count({ match: { OR: [{ user1Id: userId }, { user2Id: userId }] }, senderId: { not: userId } }),
    db.moment.count({ userId }),
    db.momentComment.count({ userId }),
    db.momentReaction.count({ userId }),
    db.block.count({ blockedId: userId }),
    db.block.count({ blockerId: userId }),
    db.report.count({ reportedId: userId }),
    db.report.count({ reporterId: userId }),
    db.userAchievement.count({ userId }),
    db.message.findFirst({ senderId: userId }, { orderBy: { createdAt: 'desc' } }),
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
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
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

  const updated = await db.user.update({ id: userId }, parsed.data);

  return NextResponse.json({ data: {
    id: updated.id,
    role: updated.role,
    profileVisible: updated.profileVisible,
  } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdminWithCSRF(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  // Prevent self-deletion
  const adminUser = (auth as { user: { id: string } }).user;
  if (userId === adminUser.id) {
    return NextResponse.json({ error: 'Нельзя удалить свой аккаунт' }, { status: 400 });
  }

  // Verify user exists
  const user = await db.user.findUnique({ id: userId });
  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  try {
    // Delete all related data in a transaction to avoid FK constraint violations
    await db.transaction(async (tx) => {
      // Matches and their messages
      const matches = await tx.match.findMany({ OR: [{ user1Id: userId }, { user2Id: userId }] });
      for (const match of matches) {
        await tx.message.deleteMany({ matchId: match.id });
      }
      await tx.match.deleteMany({ OR: [{ user1Id: userId }, { user2Id: userId }] });

      // Direct likes
      await tx.like.deleteMany({ OR: [{ fromUserId: userId }, { toUserId: userId }] });

      // Blocks
      await tx.block.deleteMany({ OR: [{ blockerId: userId }, { blockedId: userId }] });

      // Reports
      await tx.report.deleteMany({ OR: [{ reporterId: userId }, { reportedId: userId }] });

      // Moments and their comments/reactions
      const moments = await tx.moment.findMany({ userId });
      for (const moment of moments) {
        await tx.momentComment.deleteMany({ momentId: moment.id });
        await tx.momentReaction.deleteMany({ momentId: moment.id });
        await tx.momentLike.deleteMany({ momentId: moment.id });
      }
      await tx.moment.deleteMany({ userId });

      // Remaining moment comments/reactions by this user on others' moments
      await tx.momentComment.deleteMany({ userId });
      await tx.momentReaction.deleteMany({ userId });

      // Achievements
      await tx.userAchievement.deleteMany({ userId });

      // Sessions
      await tx.session.deleteMany({ userId });

      // Rate limits
      await tx.rateLimit.deleteMany({ key: { startsWith: `login:${user.email.toLowerCase()}` } });
      await tx.rateLimit.deleteMany({ key: { startsWith: `verify:${user.email.toLowerCase()}` } });

      // Finally delete the user
      await tx.user.delete({ id: userId });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete')) {
      return NextResponse.json({ error: 'Не удалось удалить пользователя: существуют связанные данные' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера при удалении пользователя' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
