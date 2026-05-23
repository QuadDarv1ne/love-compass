import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, requireAdminWithCSRF } from '@/lib/auth/guard';
import { z } from 'zod';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, age: true, gender: true,
      bio: true, interests: true, avatar: true, city: true, lookingFor: true,
      role: true, emailVerified: true, profileVisible: true,
      showOnlineStatus: true, language: true, notificationsEnabled: true,
      createdAt: true, updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

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
    db.like.count({ where: { fromUserId: userId } }),
    db.like.count({ where: { toUserId: userId } }),
    db.match.count({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } }),
    db.message.count({ where: { senderId: userId } }),
    db.message.count({ where: { match: { OR: [{ user1Id: userId }, { user2Id: userId }] }, senderId: { not: userId } } }),
    db.moment.count({ where: { userId } }),
    db.momentComment.count({ where: { userId } }),
    db.momentReaction.count({ where: { userId } }),
    db.block.count({ where: { blockedId: userId } }),
    db.block.count({ where: { blockerId: userId } }),
    db.report.count({ where: { reportedId: userId } }),
    db.report.count({ where: { reporterId: userId } }),
    db.userAchievement.count({ where: { userId } }),
    db.message.findFirst({ where: { senderId: userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);

  const lastActivity = lastMessage ? lastMessage.createdAt.toISOString() : user.updatedAt.toISOString();

  return NextResponse.json({
    data: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
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

  const updated = await db.user.update({
    where: { id: userId },
    data: parsed.data,
    select: {
      id: true, role: true, profileVisible: true,
    },
  });

  return NextResponse.json({ data: updated });
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
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
  }

  try {
    // Delete all related data in a transaction to avoid FK constraint violations
    await db.$transaction(async (tx) => {
      // Matches and their messages
      const matches = await tx.match.findMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });
      for (const match of matches) {
        await tx.message.deleteMany({ where: { matchId: match.id } });
      }
      await tx.match.deleteMany({ where: { OR: [{ user1Id: userId }, { user2Id: userId }] } });

      // Direct likes
      await tx.like.deleteMany({ where: { OR: [{ fromUserId: userId }, { toUserId: userId }] } });

      // Blocks
      await tx.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });

      // Reports
      await tx.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } });

      // Moments and their comments/reactions
      const moments = await tx.moment.findMany({ where: { userId } });
      for (const moment of moments) {
        await tx.momentComment.deleteMany({ where: { momentId: moment.id } });
        await tx.momentReaction.deleteMany({ where: { momentId: moment.id } });
        await tx.momentLike.deleteMany({ where: { momentId: moment.id } });
      }
      await tx.moment.deleteMany({ where: { userId } });

      // Remaining moment comments/reactions by this user on others' moments
      await tx.momentComment.deleteMany({ where: { userId } });
      await tx.momentReaction.deleteMany({ where: { userId } });

      // Achievements
      await tx.userAchievement.deleteMany({ where: { userId } });

      // Sessions
      await tx.session.deleteMany({ where: { userId } });

      // Rate limits
      await tx.rateLimit.deleteMany({ where: { key: { startsWith: `login:${user.email.toLowerCase()}` } } });
      await tx.rateLimit.deleteMany({ where: { key: { startsWith: `verify:${user.email.toLowerCase()}` } } });

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } });
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete')) {
      return NextResponse.json({ error: 'Не удалось удалить пользователя: существуют связанные данные' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка сервера при удалении пользователя' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
