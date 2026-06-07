import { Prisma, PrismaClient } from '@prisma/client';
import { detectDbType } from './detect';
import type {
  DatabaseAdapter,
  DbUser,
  DbSession,
  DbLike,
  DbMatch,
  DbMessage,
  DbBlock,
  DbReport,
  DbRateLimit,
  DbMoment,
  DbMomentComment,
  DbMomentReaction,
  DbMomentLike,
  DbUserAchievement,
  DbDislike,
  SessionWithUser,
} from './types';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const profileSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  bio: true,
  interests: true,
  avatar: true,
  photos: true,
  city: true,
  lookingFor: true,
  profileVisible: true,
  showOnlineStatus: true,
  language: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
};

function toDbUser(u: Prisma.UserGetPayload<Record<string, never>>): DbUser {
  return u as unknown as DbUser;
}

function toDbSession(s: Prisma.SessionGetPayload<Record<string, never>>): DbSession {
  return s as unknown as DbSession;
}

function toSessionWithUser(s: Prisma.SessionGetPayload<{ include: { user: true } }>): SessionWithUser {
  return s as unknown as SessionWithUser;
}

function toDbLike(l: Prisma.LikeGetPayload<Record<string, never>>): DbLike {
  return l as unknown as DbLike;
}

function toDbMatch(m: Prisma.MatchGetPayload<Record<string, never>>): DbMatch {
  return m as unknown as DbMatch;
}

function toDbMessage(m: Prisma.MessageGetPayload<Record<string, never>>): DbMessage {
  return m as unknown as DbMessage;
}

function toDbBlock(b: Prisma.BlockGetPayload<Record<string, never>>): DbBlock {
  return b as unknown as DbBlock;
}

function toDbReport(r: Prisma.ReportGetPayload<Record<string, never>>): DbReport {
  return r as unknown as DbReport;
}

function toDbRateLimit(r: Prisma.RateLimitGetPayload<Record<string, never>>): DbRateLimit {
  return r as unknown as DbRateLimit;
}

function toDbMoment(m: Prisma.MomentGetPayload<Record<string, never>>): DbMoment {
  return m as unknown as DbMoment;
}

function toDbMomentComment(mc: Prisma.MomentCommentGetPayload<Record<string, never>>): DbMomentComment {
  return mc as unknown as DbMomentComment;
}

function toDbMomentReaction(mr: Prisma.MomentReactionGetPayload<Record<string, never>>): DbMomentReaction {
  return mr as unknown as DbMomentReaction;
}

function toDbMomentLike(ml: Prisma.MomentLikeGetPayload<Record<string, never>>): DbMomentLike {
  return ml as unknown as DbMomentLike;
}

function toDbDislike(d: Prisma.DislikeGetPayload<Record<string, never>>): DbDislike {
  return d as unknown as DbDislike;
}

function toDbUserAchievement(ua: Prisma.UserAchievementGetPayload<Record<string, never>>): DbUserAchievement {
  return ua as unknown as DbUserAchievement;
}

export class PrismaAdapter implements DatabaseAdapter {
  get dbType() {
    return detectDbType(process.env.DATABASE_URL || '');
  }

  async connect(): Promise<void> {
    await prisma.$connect();
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }

  user = {
    create: (data: Partial<DbUser>) =>
      prisma.user.create({ data: data as Prisma.UserCreateInput }).then(toDbUser),

    findUnique: (where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }) => {
      const w = {} as Prisma.UserWhereUniqueInput;
      if (where.id) w.id = where.id;
      if (where.email) w.email = where.email;
      if (where.emailVerificationToken) w.emailVerificationToken = where.emailVerificationToken;
      if (where.passwordResetToken) w.passwordResetToken = where.passwordResetToken;
      return prisma.user.findUnique({ where: w }).then((r) => (r ? toDbUser(r) : null));
    },

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; select?: Record<string, boolean>; cursor?: Record<string, unknown> }) =>
      prisma.user.findMany({ where: where as Prisma.UserWhereInput, ...(options as Omit<Prisma.UserFindManyArgs, 'where'>) }).then((arr) => arr.map(toDbUser)),

    update: (where: { id: string }, data: Partial<DbUser>) =>
      prisma.user.update({ where, data: data as Prisma.UserUpdateInput }).then(toDbUser),

    upsert: (where: { email: string }, create: Partial<DbUser>, update: Partial<DbUser>) =>
      prisma.user.upsert({ where, create: create as Prisma.UserCreateInput, update: update as Prisma.UserUpdateInput }).then(toDbUser),

    delete: (where: { id: string }) =>
      prisma.user.delete({ where }).then(toDbUser),

    count: (where?: Record<string, unknown>) =>
      prisma.user.count({ where: where as Prisma.UserWhereInput }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, unknown> }) =>
      prisma.user.groupBy(params as unknown as Parameters<typeof prisma.user.groupBy>[0]),
  };

  session = {
    create: (data: Partial<DbSession>) =>
      prisma.session.create({ data: data as Prisma.SessionCreateInput }).then(toDbSession),

    findUnique: (where: { token?: string; id?: string }, includeUser?: boolean) => {
      const w = {} as Prisma.SessionWhereUniqueInput;
      if (where.token) w.token = where.token;
      if (where.id) w.id = where.id;
      if (includeUser) {
        return prisma.session.findUnique({ where: w, include: { user: true } }).then((r) => (r ? toSessionWithUser(r) : null));
      }
      return prisma.session.findUnique({ where: w }).then((r) => (r ? toDbSession(r) : null));
    },

    update: (where: { id: string }, data: Partial<DbSession>) =>
      prisma.session.update({ where, data: data as Prisma.SessionUpdateInput }).then(toDbSession),

    delete: (where: { id?: string; token?: string }) => {
      const w = {} as Prisma.SessionWhereUniqueInput;
      if (where.token) w.token = where.token;
      if (where.id) w.id = where.id;
      return prisma.session.delete({ where: w }).then(() => {});
    },

    deleteMany: (where: Record<string, unknown>) =>
      prisma.session.deleteMany({ where: where as Prisma.SessionWhereInput }).then((r) => r.count),
  };

  like = {
    create: (data: Partial<DbLike>) =>
      prisma.like.create({ data: data as Prisma.LikeCreateInput }).then(toDbLike),

    findUnique: (where: { fromUserId?: string; toUserId?: string; id?: string }) => {
      if (where.fromUserId && where.toUserId) {
        return prisma.like.findFirst({ where: { fromUserId: where.fromUserId, toUserId: where.toUserId } }).then((r) => (r ? toDbLike(r) : null));
      }
      if (where.id) {
        return prisma.like.findUnique({ where: { id: where.id } }).then((r) => (r ? toDbLike(r) : null));
      }
      return Promise.resolve(null);
    },

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.like.findMany({ where: where as Prisma.LikeWhereInput, ...options }).then((arr) => arr.map(toDbLike)),

    delete: (where: { id: string }) =>
      prisma.like.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.like.deleteMany({ where: where as Prisma.LikeWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.like.count({ where: where as Prisma.LikeWhereInput }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.like.groupBy(params as unknown as Parameters<typeof prisma.like.groupBy>[0]),
  };

  match = {
    create: (data: Partial<DbMatch>) =>
      prisma.match.create({ data: data as Prisma.MatchCreateInput }).then(toDbMatch),

    findUnique: (where: { user1Id?: string; user2Id?: string; id?: string }) => {
      if (where.user1Id && where.user2Id) {
        return prisma.match.findFirst({ where: { user1Id: where.user1Id, user2Id: where.user2Id } }).then((r) => (r ? toDbMatch(r) : null));
      }
      if (where.id) {
        return prisma.match.findUnique({ where: { id: where.id } }).then((r) => (r ? toDbMatch(r) : null));
      }
      return Promise.resolve(null);
    },

    findFirst: (where?: Record<string, unknown>) =>
      prisma.match.findFirst({ where: where as Prisma.MatchWhereInput }).then((r) => (r ? toDbMatch(r) : null)),

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; includeLastMessage?: boolean }) => {
      const { includeLastMessage, ...restOptions } = options || {};
      if (includeLastMessage) {
        return prisma.match
          .findMany({
            where: where as Prisma.MatchWhereInput,
            include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
            ...restOptions,
          })
          .then((arr) =>
            arr.map((m) => ({
              ...toDbMatch(m),
              messages: m.messages.map(toDbMessage),
            }))
          );
      }
      return prisma.match.findMany({ where: where as Prisma.MatchWhereInput, ...restOptions }).then((arr) => arr.map(toDbMatch));
    },

    delete: (where: { id: string }) =>
      prisma.match.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.match.deleteMany({ where: where as Prisma.MatchWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.match.count({ where: where as Prisma.MatchWhereInput }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.match.groupBy(params as unknown as Parameters<typeof prisma.match.groupBy>[0]),
  };

  message = {
    create: (data: Partial<DbMessage>) =>
      prisma.message.create({ data: data as Prisma.MessageCreateInput }).then(toDbMessage),

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; cursor?: Record<string, unknown> }) =>
      prisma.message.findMany({ where: where as Prisma.MessageWhereInput, ...(options as Prisma.MessageFindManyArgs) }).then((arr) => arr.map(toDbMessage)),

    findFirst: (where?: Record<string, unknown>, options?: { orderBy?: Record<string, unknown> }) =>
      prisma.message.findFirst({ where: where as Prisma.MessageWhereInput, ...options }).then((r) => (r ? toDbMessage(r) : null)),

    updateMany: (where: Record<string, unknown>, data: Partial<DbMessage>) =>
      prisma.message.updateMany({ where: where as Prisma.MessageWhereInput, data: data as Prisma.MessageUpdateInput }).then((r) => r.count),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.message.deleteMany({ where: where as Prisma.MessageWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.message.count({ where: where as Prisma.MessageWhereInput }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.message.groupBy(params as unknown as Parameters<typeof prisma.message.groupBy>[0]),
  };

  block = {
    create: (data: Partial<DbBlock>) =>
      prisma.block.create({ data: data as Prisma.BlockCreateInput }).then(toDbBlock),

    findUnique: (where: { blockerId?: string; blockedId?: string }) => {
      if (where.blockerId && where.blockedId) {
        return prisma.block.findFirst({ where: { blockerId: where.blockerId, blockedId: where.blockedId } }).then((r) => (r ? toDbBlock(r) : null));
      }
      return Promise.resolve(null);
    },

    findFirst: (where?: Record<string, unknown>) =>
      prisma.block.findFirst({ where: where as Prisma.BlockWhereInput }).then((r) => (r ? toDbBlock(r) : null)),

    findMany: (where?: Record<string, unknown>) =>
      prisma.block.findMany({ where: where as Prisma.BlockWhereInput }).then((arr) => arr.map(toDbBlock)),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.block.deleteMany({ where: where as Prisma.BlockWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.block.count({ where: where as Prisma.BlockWhereInput }),
  };

  report = {
    create: (data: Partial<DbReport>) =>
      prisma.report.create({ data: data as Prisma.ReportCreateInput }).then(toDbReport),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.report.deleteMany({ where: where as Prisma.ReportWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.report.count({ where: where as Prisma.ReportWhereInput }),
  };

  rateLimit = {
    findUnique: (where: { key: string }) =>
      prisma.rateLimit.findUnique({ where }).then((r) => (r ? toDbRateLimit(r) : null)),

    create: (data: Partial<DbRateLimit>) =>
      prisma.rateLimit.create({ data: data as Prisma.RateLimitCreateInput }).then(toDbRateLimit),

    update: (where: { key: string }, data: Partial<DbRateLimit>) =>
      prisma.rateLimit.update({ where: { key: where.key }, data: data as Prisma.RateLimitUpdateInput }).then(toDbRateLimit),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.rateLimit.deleteMany({ where: where as Prisma.RateLimitWhereInput }).then((r) => r.count),
  };

  moment = {
    create: (data: Partial<DbMoment>) =>
      prisma.moment.create({ data: data as Prisma.MomentCreateInput }).then(toDbMoment),

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.moment.findMany({ where: where as Prisma.MomentWhereInput, ...options }).then((arr) => arr.map(toDbMoment)),

    findUnique: (where: { id: string }) =>
      prisma.moment.findUnique({ where }).then((r) => (r ? toDbMoment(r) : null)),

    update: (where: { id: string }, data: Partial<DbMoment>) =>
      prisma.moment.update({ where, data: data as Prisma.MomentUpdateInput }).then(toDbMoment),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.moment.deleteMany({ where: where as Prisma.MomentWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.moment.count({ where: where as Prisma.MomentWhereInput }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.moment.groupBy(params as unknown as Parameters<typeof prisma.moment.groupBy>[0]),
  };

  momentComment = {
    create: (data: Partial<DbMomentComment>) =>
      prisma.momentComment.create({ data: data as Prisma.MomentCommentCreateInput }).then(toDbMomentComment),

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.momentComment.findMany({ where: where as Prisma.MomentCommentWhereInput, ...options }).then((arr) => arr.map(toDbMomentComment)),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentComment.deleteMany({ where: where as Prisma.MomentCommentWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.momentComment.count({ where: where as Prisma.MomentCommentWhereInput }),
  };

  momentReaction = {
    create: (data: Partial<DbMomentReaction>) =>
      prisma.momentReaction.create({ data: data as Prisma.MomentReactionCreateInput }).then(toDbMomentReaction),

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.momentReaction.findMany({ where: where as Prisma.MomentReactionWhereInput, ...options }).then((arr) => arr.map(toDbMomentReaction)),

    findUnique: (where: { momentId?: string; userId?: string; emoji?: string }) => {
      if (where.momentId && where.userId && where.emoji) {
        return prisma.momentReaction.findFirst({ where: { momentId: where.momentId, userId: where.userId, emoji: where.emoji } }).then((r) => (r ? toDbMomentReaction(r) : null));
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentReaction.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentReaction.deleteMany({ where: where as Prisma.MomentReactionWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.momentReaction.count({ where: where as Prisma.MomentReactionWhereInput }),
  };

  momentLike = {
    create: (data: Partial<DbMomentLike>) =>
      prisma.momentLike.create({ data: data as Prisma.MomentLikeCreateInput }).then(toDbMomentLike),

    findMany: (where?: Record<string, unknown>) =>
      prisma.momentLike.findMany({ where: where as Prisma.MomentLikeWhereInput }).then((arr) => arr.map(toDbMomentLike)),

    findUnique: (where: { momentId?: string; userId?: string }) => {
      if (where.momentId && where.userId) {
        return prisma.momentLike.findFirst({ where: { momentId: where.momentId, userId: where.userId } }).then((r) => (r ? toDbMomentLike(r) : null));
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentLike.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentLike.deleteMany({ where: where as Prisma.MomentLikeWhereInput }).then((r) => r.count),
  };

  userAchievement = {
    create: (data: Partial<DbUserAchievement>) =>
      prisma.userAchievement.create({ data: data as Prisma.UserAchievementCreateInput }).then(toDbUserAchievement),

    findMany: (where?: Record<string, unknown>) =>
      prisma.userAchievement.findMany({ where: where as Prisma.UserAchievementWhereInput }).then((arr) => arr.map(toDbUserAchievement)),

    findUnique: (where: { userId?: string; achievementId?: string }) => {
      if (where.userId && where.achievementId) {
        return prisma.userAchievement.findFirst({ where: { userId: where.userId, achievementId: where.achievementId } }).then((r) => (r ? toDbUserAchievement(r) : null));
      }
      return Promise.resolve(null);
    },

    deleteMany: (where: Record<string, unknown>) =>
      prisma.userAchievement.deleteMany({ where: where as Prisma.UserAchievementWhereInput }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.userAchievement.count({ where: where as Prisma.UserAchievementWhereInput }),
  };

  dislike = {
    create: (data: Partial<DbDislike>) =>
      prisma.dislike.create({ data: data as Prisma.DislikeCreateInput }).then(toDbDislike),

    findFirst: (where?: Record<string, unknown>) =>
      prisma.dislike.findFirst({ where: where as Prisma.DislikeWhereInput }).then((r) => (r ? toDbDislike(r) : null)),

    findMany: (where?: Record<string, unknown>) =>
      prisma.dislike.findMany({ where: where as Prisma.DislikeWhereInput }).then((arr) => arr.map(toDbDislike)),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.dislike.deleteMany({ where: where as Prisma.DislikeWhereInput }).then((r) => r.count),
  };

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const txAdapter: DatabaseAdapter = {
        ...this,
        user: {
          create: (data) => tx.user.create({ data: data as Prisma.UserCreateInput }).then(toDbUser),
          findUnique: (where) => {
            const w = {} as Prisma.UserWhereUniqueInput;
            if (where.id) w.id = where.id;
            if (where.email) w.email = where.email;
            if (where.emailVerificationToken) w.emailVerificationToken = where.emailVerificationToken;
            if (where.passwordResetToken) w.passwordResetToken = where.passwordResetToken;
            return tx.user.findUnique({ where: w }).then((r) => (r ? toDbUser(r) : null));
          },
          findMany: (where, options) => tx.user.findMany({ where: where as Prisma.UserWhereInput, ...(options as Prisma.UserFindManyArgs) }).then((arr) => arr.map(toDbUser)),
          update: (where, data) => tx.user.update({ where, data: data as Prisma.UserUpdateInput }).then(toDbUser),
          upsert: (where, create, update) => tx.user.upsert({ where, create: create as Prisma.UserCreateInput, update: update as Prisma.UserUpdateInput }).then(toDbUser),
          delete: (where) => tx.user.delete({ where }).then(toDbUser),
          count: (where) => tx.user.count({ where: where as Prisma.UserWhereInput }),
          groupBy: (params) => (tx.user.groupBy as (args: unknown) => Promise<unknown[]>)(params),
        },
        session: {
          create: (data) => tx.session.create({ data: data as Prisma.SessionCreateInput }).then(toDbSession),
          findUnique: (where, includeUser) => {
            const w = {} as Prisma.SessionWhereUniqueInput;
            if (where.token) w.token = where.token;
            if (where.id) w.id = where.id;
            if (includeUser) {
              return tx.session.findUnique({ where: w, include: { user: true } }).then((r) => (r ? toSessionWithUser(r) : null));
            }
            return tx.session.findUnique({ where: w }).then((r) => (r ? toDbSession(r) : null));
          },
          update: (where, data) => tx.session.update({ where, data: data as Prisma.SessionUpdateInput }).then(toDbSession),
          delete: (where) => {
            const w = {} as Prisma.SessionWhereUniqueInput;
            if (where.token) w.token = where.token;
            if (where.id) w.id = where.id;
            return tx.session.delete({ where: w }).then(() => {});
          },
          deleteMany: (where) => tx.session.deleteMany({ where: where as Prisma.SessionWhereInput }).then((r) => r.count),
        },
        like: {
          create: (data) => tx.like.create({ data: data as Prisma.LikeCreateInput }).then(toDbLike),
          findUnique: (where) => {
            if (where.fromUserId && where.toUserId) {
              return tx.like.findFirst({ where: { fromUserId: where.fromUserId, toUserId: where.toUserId } }).then((r) => (r ? toDbLike(r) : null));
            }
            if (where.id) {
              return tx.like.findUnique({ where: { id: where.id } }).then((r) => (r ? toDbLike(r) : null));
            }
            return Promise.resolve(null);
          },
          findMany: (where, options) => tx.like.findMany({ where: where as Prisma.LikeWhereInput, ...(options as Prisma.LikeFindManyArgs) }).then((arr) => arr.map(toDbLike)),
          delete: (where) => tx.like.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.like.deleteMany({ where: where as Prisma.LikeWhereInput }).then((r) => r.count),
          count: (where) => tx.like.count({ where: where as Prisma.LikeWhereInput }),
          groupBy: (params) => (tx.like.groupBy as (args: unknown) => Promise<unknown[]>)(params),
        },
        match: {
          create: (data) => tx.match.create({ data: data as Prisma.MatchCreateInput }).then(toDbMatch),
          findUnique: (where) => {
            if (where.user1Id && where.user2Id) {
              return tx.match.findFirst({ where: { user1Id: where.user1Id, user2Id: where.user2Id } }).then((r) => (r ? toDbMatch(r) : null));
            }
            if (where.id) {
              return tx.match.findUnique({ where: { id: where.id } }).then((r) => (r ? toDbMatch(r) : null));
            }
            return Promise.resolve(null);
          },
          findFirst: (where) => tx.match.findFirst({ where: where as Prisma.MatchWhereInput }).then((r) => (r ? toDbMatch(r) : null)),
          findMany: (where, options) => {
            const { includeLastMessage, ...restOptions } = options || {};
            if (includeLastMessage) {
              return tx.match
                .findMany({ where: where as Prisma.MatchWhereInput, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }, ...(restOptions as Omit<Prisma.MatchFindManyArgs, 'where'>) })
                .then((arr) => arr.map((m) => ({ ...toDbMatch(m as unknown as Prisma.MatchGetPayload<Record<string, never>>), messages: (m as unknown as { messages: Prisma.MessageGetPayload<Record<string, never>>[] }).messages.map(toDbMessage) })));
            }
            return tx.match.findMany({ where: where as Prisma.MatchWhereInput, ...(restOptions as Omit<Prisma.MatchFindManyArgs, 'where'>) }).then((arr) => arr.map(toDbMatch));
          },
          delete: (where) => tx.match.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.match.deleteMany({ where: where as Prisma.MatchWhereInput }).then((r) => r.count),
          count: (where) => tx.match.count({ where: where as Prisma.MatchWhereInput }),
          groupBy: (params) => (tx.match.groupBy as (args: unknown) => Promise<unknown[]>)(params),
        },
        message: {
          create: (data) => tx.message.create({ data: data as Prisma.MessageCreateInput }).then(toDbMessage),
          findMany: (where, options) => tx.message.findMany({ where: where as Prisma.MessageWhereInput, ...(options as Prisma.MessageFindManyArgs) }).then((arr) => arr.map(toDbMessage)),
          findFirst: (where, options) => tx.message.findFirst({ where: where as Prisma.MessageWhereInput, ...(options as Prisma.MessageFindFirstArgs) }).then((r) => (r ? toDbMessage(r) : null)),
          updateMany: (where, data) => tx.message.updateMany({ where: where as Prisma.MessageWhereInput, data: data as Prisma.MessageUpdateInput }).then((r) => r.count),
          deleteMany: (where) => tx.message.deleteMany({ where: where as Prisma.MessageWhereInput }).then((r) => r.count),
          count: (where) => tx.message.count({ where: where as Prisma.MessageWhereInput }),
          groupBy: (params) => (tx.message.groupBy as (args: unknown) => Promise<unknown[]>)(params),
        },
        block: {
          create: (data) => tx.block.create({ data: data as Prisma.BlockCreateInput }).then(toDbBlock),
          findUnique: (where) => {
            if (where.blockerId && where.blockedId) {
              return tx.block.findFirst({ where: { blockerId: where.blockerId, blockedId: where.blockedId } }).then((r) => (r ? toDbBlock(r) : null));
            }
            return Promise.resolve(null);
          },
          findFirst: (where) => tx.block.findFirst({ where: where as Prisma.BlockWhereInput }).then((r) => (r ? toDbBlock(r) : null)),
          findMany: (where) => tx.block.findMany({ where: where as Prisma.BlockWhereInput }).then((arr) => arr.map(toDbBlock)),
          deleteMany: (where) => tx.block.deleteMany({ where: where as Prisma.BlockWhereInput }).then((r) => r.count),
          count: (where) => tx.block.count({ where: where as Prisma.BlockWhereInput }),
        },
        report: {
          create: (data) => tx.report.create({ data: data as Prisma.ReportCreateInput }).then(toDbReport),
          deleteMany: (where) => tx.report.deleteMany({ where: where as Prisma.ReportWhereInput }).then((r) => r.count),
          count: (where) => tx.report.count({ where: where as Prisma.ReportWhereInput }),
        },
        rateLimit: {
          findUnique: (where) => tx.rateLimit.findUnique({ where: where as Prisma.RateLimitWhereUniqueInput }).then((r) => (r ? toDbRateLimit(r) : null)),
          create: (data) => tx.rateLimit.create({ data: data as Prisma.RateLimitCreateInput }).then(toDbRateLimit),
          update: (where, data) => tx.rateLimit.update({ where: { key: where.key }, data: data as Prisma.RateLimitUpdateInput }).then(toDbRateLimit),
          deleteMany: (where) => tx.rateLimit.deleteMany({ where: where as Prisma.RateLimitWhereInput }).then((r) => r.count),
        },
        moment: {
          create: (data) => tx.moment.create({ data: data as Prisma.MomentCreateInput }).then(toDbMoment),
          findMany: (where, options) => tx.moment.findMany({ where: where as Prisma.MomentWhereInput, ...(options as Prisma.MomentFindManyArgs) }).then((arr) => arr.map(toDbMoment)),
          findUnique: (where) => tx.moment.findUnique({ where: where as Prisma.MomentWhereUniqueInput }).then((r) => (r ? toDbMoment(r) : null)),
          update: (where, data) => tx.moment.update({ where, data: data as Prisma.MomentUpdateInput }).then(toDbMoment),
          deleteMany: (where) => tx.moment.deleteMany({ where: where as Prisma.MomentWhereInput }).then((r) => r.count),
          count: (where) => tx.moment.count({ where: where as Prisma.MomentWhereInput }),
          groupBy: (params) => (tx.moment.groupBy as (args: unknown) => Promise<unknown[]>)(params),
        },
        momentComment: {
          create: (data) => tx.momentComment.create({ data: data as Prisma.MomentCommentCreateInput }).then(toDbMomentComment),
          findMany: (where, options) => tx.momentComment.findMany({ where: where as Prisma.MomentCommentWhereInput, ...(options as Prisma.MomentCommentFindManyArgs) }).then((arr) => arr.map(toDbMomentComment)),
          deleteMany: (where) => tx.momentComment.deleteMany({ where: where as Prisma.MomentCommentWhereInput }).then((r) => r.count),
          count: (where) => tx.momentComment.count({ where: where as Prisma.MomentCommentWhereInput }),
        },
        momentReaction: {
          create: (data) => tx.momentReaction.create({ data: data as Prisma.MomentReactionCreateInput }).then(toDbMomentReaction),
          findMany: (where, options) => tx.momentReaction.findMany({ where: where as Prisma.MomentReactionWhereInput, ...(options as Prisma.MomentReactionFindManyArgs) }).then((arr) => arr.map(toDbMomentReaction)),
          findUnique: (where) => {
            if (where.momentId && where.userId && where.emoji) {
              return tx.momentReaction.findFirst({ where: { momentId: where.momentId, userId: where.userId, emoji: where.emoji } }).then((r) => (r ? toDbMomentReaction(r) : null));
            }
            return Promise.resolve(null);
          },
          delete: (where) => tx.momentReaction.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.momentReaction.deleteMany({ where: where as Prisma.MomentReactionWhereInput }).then((r) => r.count),
          count: (where) => tx.momentReaction.count({ where: where as Prisma.MomentReactionWhereInput }),
        },
        momentLike: {
          create: (data) => tx.momentLike.create({ data: data as Prisma.MomentLikeCreateInput }).then(toDbMomentLike),
          findMany: (where) => tx.momentLike.findMany({ where: where as Prisma.MomentLikeWhereInput }).then((arr) => arr.map(toDbMomentLike)),
          findUnique: (where) => {
            if (where.momentId && where.userId) {
              return tx.momentLike.findFirst({ where: { momentId: where.momentId, userId: where.userId } }).then((r) => (r ? toDbMomentLike(r) : null));
            }
            return Promise.resolve(null);
          },
          delete: (where) => tx.momentLike.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.momentLike.deleteMany({ where: where as Prisma.MomentLikeWhereInput }).then((r) => r.count),
        },
        userAchievement: {
          create: (data) => tx.userAchievement.create({ data: data as Prisma.UserAchievementCreateInput }).then(toDbUserAchievement),
          findMany: (where) => tx.userAchievement.findMany({ where: where as Prisma.UserAchievementWhereInput }).then((arr) => arr.map(toDbUserAchievement)),
          findUnique: (where) => {
            if (where.userId && where.achievementId) {
              return tx.userAchievement.findFirst({ where: { userId: where.userId, achievementId: where.achievementId } }).then((r) => (r ? toDbUserAchievement(r) : null));
            }
            return Promise.resolve(null);
          },
          deleteMany: (where) => tx.userAchievement.deleteMany({ where: where as Prisma.UserAchievementWhereInput }).then((r) => r.count),
          count: (where) => tx.userAchievement.count({ where: where as Prisma.UserAchievementWhereInput }),
        },
        dislike: {
          create: (data) => tx.dislike.create({ data: data as Prisma.DislikeCreateInput }).then(toDbDislike),
          findFirst: (where) => tx.dislike.findFirst({ where: where as Prisma.DislikeWhereInput }).then((r) => (r ? toDbDislike(r) : null)),
          findMany: (where) => tx.dislike.findMany({ where: where as Prisma.DislikeWhereInput }).then((arr) => arr.map(toDbDislike)),
          deleteMany: (where) => tx.dislike.deleteMany({ where: where as Prisma.DislikeWhereInput }).then((r) => r.count),
        },
      };
      return fn(txAdapter);
    });
  }
}
