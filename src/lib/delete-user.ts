import type { DatabaseAdapter } from '@/lib/db';

interface UserInfo {
  id: string;
  email: string;
}

export async function deleteUserCascade(
  tx: DatabaseAdapter,
  user: UserInfo,
): Promise<void> {
  const id = user.id;

  const matches = await tx.match.findMany(
    { OR: [{ user1Id: id }, { user2Id: id }] }
  );
  const matchIds = matches.map((m) => m.id);

  if (matchIds.length > 0) {
    await tx.message.deleteMany({ matchId: { in: matchIds } });
  }

  await tx.message.deleteMany({ senderId: id });
  await tx.like.deleteMany({ OR: [{ fromUserId: id }, { toUserId: id }] });
  await tx.dislike.deleteMany({ OR: [{ fromUserId: id }, { toUserId: id }] });

  if (matchIds.length > 0) {
    await tx.match.deleteMany({ id: { in: matchIds } });
  }

  await tx.block.deleteMany({ OR: [{ blockerId: id }, { blockedId: id }] });
  await tx.report.deleteMany({ OR: [{ reporterId: id }, { reportedId: id }] });

  const moments = await tx.moment.findMany({ userId: id });
  const momentIds = moments.map((m) => m.id);
  if (momentIds.length > 0) {
    await tx.momentComment.deleteMany({ momentId: { in: momentIds } });
    await tx.momentReaction.deleteMany({ momentId: { in: momentIds } });
    await tx.momentLike.deleteMany({ momentId: { in: momentIds } });
  }
  await tx.moment.deleteMany({ userId: id });
  await tx.momentComment.deleteMany({ userId: id });
  await tx.momentReaction.deleteMany({ userId: id });
  await tx.momentLike.deleteMany({ userId: id });
  await tx.userAchievement.deleteMany({ userId: id });

  await tx.rateLimit.deleteMany({ key: { startsWith: `auto-reply:${id}` } });
  await tx.rateLimit.deleteMany({ key: { startsWith: `report:${id}` } });
  await tx.rateLimit.deleteMany({ key: { startsWith: `like:${id}` } });
  await tx.rateLimit.deleteMany({ key: { startsWith: `verify:${user.email}` } });

  await tx.session.deleteMany({ userId: id });
  await tx.user.delete({ id });
}
