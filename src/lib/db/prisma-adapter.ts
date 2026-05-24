import { PrismaClient } from '@prisma/client';
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
  SessionWithUser,
  ProfileSelect,
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
  createdAt: true,
  updatedAt: true,
};

import { detectDbType } from './detect';

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
      prisma.user.create({ data: data as any }) as Promise<DbUser>,

    findUnique: (where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }) =>
      prisma.user.findUnique({ where: where as any }) as Promise<DbUser | null>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; select?: Record<string, boolean>; cursor?: Record<string, unknown> }) =>
      prisma.user.findMany({ where, ...options } as any) as Promise<DbUser[]>,

    update: (where: { id: string }, data: Partial<DbUser>) =>
      prisma.user.update({ where, data: data as any }) as Promise<DbUser>,

    upsert: (where: { email: string }, create: Partial<DbUser>, update: Partial<DbUser>) =>
      prisma.user.upsert({ where, create: create as any, update: update as any }) as Promise<DbUser>,

    delete: (where: { id: string }) =>
      prisma.user.delete({ where }) as Promise<DbUser>,

    count: (where?: Record<string, unknown>) =>
      prisma.user.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, unknown> }) =>
      prisma.user.groupBy({ by: params.by as any, where: params.where, _count: params._count, _sum: params._sum, orderBy: params.orderBy } as any) as Promise<unknown[]>,
  };

  session = {
    create: (data: Partial<DbSession>) =>
      prisma.session.create({ data: data as any }) as Promise<DbSession>,

    findUnique: (where: { token?: string; id?: string }, includeUser?: boolean) => {
      if (includeUser) {
        return prisma.session.findUnique({
          where: where as any,
          include: { user: true },
        }) as Promise<SessionWithUser | null>;
      }
      return prisma.session.findUnique({ where: where as any }) as Promise<DbSession | null>;
    },

    update: (where: { id: string }, data: Partial<DbSession>) =>
      prisma.session.update({ where, data: data as any }) as Promise<DbSession>,

    delete: (where: { id?: string; token?: string }) =>
      prisma.session.deleteMany({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.session.deleteMany({ where }).then((r) => r.count),
  };

  like = {
    create: (data: Partial<DbLike>) =>
      prisma.like.create({ data: data as any }) as Promise<DbLike>,

    findUnique: (where: { fromUserId?: string; toUserId?: string; id?: string }) => {
      if (where.fromUserId && where.toUserId) {
        return prisma.like.findFirst({ where: where as any }) as Promise<DbLike | null>;
      }
      return prisma.like.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbLike | null>;
    },

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.like.findMany({ where, ...options } as any) as Promise<DbLike[]>,

    delete: (where: { id: string }) =>
      prisma.like.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.like.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.like.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.like.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbLike[]>,
  };

  match = {
    create: (data: Partial<DbMatch>) =>
      prisma.match.create({ data: data as any }) as Promise<DbMatch>,

    findUnique: (where: { user1Id?: string; user2Id?: string; id?: string }) => {
      if (where.user1Id && where.user2Id) {
        return prisma.match.findFirst({ where: where as any }) as Promise<DbMatch | null>;
      }
      return prisma.match.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbMatch | null>;
    },

    findFirst: (where?: Record<string, unknown>) =>
      prisma.match.findFirst({ where: where as any }) as Promise<DbMatch | null>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; includeLastMessage?: boolean }) => {
      const { includeLastMessage, ...restOptions } = options || {};
      if (includeLastMessage) {
        return prisma.match.findMany({
          where,
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          ...restOptions,
        }) as Promise<(DbMatch & { messages: DbMessage[] })[]>;
      }
      return prisma.match.findMany({ where, ...restOptions }) as Promise<DbMatch[]>;
    },

    delete: (where: { id: string }) =>
      prisma.match.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.match.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.match.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.match.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMatch[]>,
  };

  message = {
    create: (data: Partial<DbMessage>) =>
      prisma.message.create({ data: data as any }) as Promise<DbMessage>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.message.findMany({ where, ...options } as any) as Promise<DbMessage[]>,

    findFirst: (where?: Record<string, unknown>, options?: { orderBy?: Record<string, unknown> }) =>
      prisma.message.findFirst({ where, ...options }) as Promise<DbMessage | null>,

    updateMany: (where: Record<string, unknown>, data: Partial<DbMessage>) =>
      prisma.message.updateMany({ where, data: data as any }).then((r) => r.count),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.message.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.message.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.message.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMessage[]>,
  };

  block = {
    create: (data: Partial<DbBlock>) =>
      prisma.block.create({ data: data as any }) as Promise<DbBlock>,

    findUnique: (where: { blockerId?: string; blockedId?: string }) => {
      if (where.blockerId && where.blockedId) {
        return prisma.block.findFirst({ where: where as any }) as Promise<DbBlock | null>;
      }
      return Promise.resolve(null);
    },

    findMany: (where?: Record<string, unknown>) =>
      prisma.block.findMany({ where: where as any }) as Promise<DbBlock[]>,

    deleteMany: (where: Record<string, unknown>) =>
      prisma.block.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.block.count({ where }),
  };

  report = {
    create: (data: Partial<DbReport>) =>
      prisma.report.create({ data: data as any }) as Promise<DbReport>,

    deleteMany: (where: Record<string, unknown>) =>
      prisma.report.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.report.count({ where }),
  };

  rateLimit = {
    findUnique: (where: { key: string }) =>
      prisma.rateLimit.findUnique({ where }) as Promise<DbRateLimit | null>,

    create: (data: Partial<DbRateLimit>) =>
      prisma.rateLimit.create({ data: data as any }) as Promise<DbRateLimit>,

    update: (where: { key: string }, data: Partial<DbRateLimit>) =>
      prisma.rateLimit.update({ where: { key: where.key }, data: data as any }) as Promise<DbRateLimit>,

    deleteMany: (where: Record<string, unknown>) =>
      prisma.rateLimit.deleteMany({ where }).then((r) => r.count),
  };

  moment = {
    create: (data: Partial<DbMoment>) =>
      prisma.moment.create({ data: data as any }) as Promise<DbMoment>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.moment.findMany({ where, ...options } as any) as Promise<DbMoment[]>,

    findUnique: (where: { id: string }) =>
      prisma.moment.findUnique({ where }) as Promise<DbMoment | null>,

    update: (where: { id: string }, data: Partial<DbMoment>) =>
      prisma.moment.update({ where, data: data as any }) as Promise<DbMoment>,

    deleteMany: (where: Record<string, unknown>) =>
      prisma.moment.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.moment.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }) =>
      prisma.moment.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMoment[]>,
  };

  momentComment = {
    create: (data: Partial<DbMomentComment>) =>
      prisma.momentComment.create({ data: data as any }) as Promise<DbMomentComment>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.momentComment.findMany({ where, ...options } as any) as Promise<DbMomentComment[]>,

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentComment.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.momentComment.count({ where }),
  };

  momentReaction = {
    create: (data: Partial<DbMomentReaction>) =>
      prisma.momentReaction.create({ data: data as any }) as Promise<DbMomentReaction>,

    findMany: (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }) =>
      prisma.momentReaction.findMany({ where, ...options } as any) as Promise<DbMomentReaction[]>,

    findUnique: (where: { momentId?: string; userId?: string; emoji?: string }) => {
      if (where.momentId && where.userId && where.emoji) {
        return prisma.momentReaction.findFirst({ where: where as any }) as Promise<DbMomentReaction | null>;
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentReaction.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentReaction.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.momentReaction.count({ where }),
  };

  momentLike = {
    create: (data: Partial<DbMomentLike>) =>
      prisma.momentLike.create({ data: data as any }) as Promise<DbMomentLike>,

    findUnique: (where: { momentId?: string; userId?: string }) => {
      if (where.momentId && where.userId) {
        return prisma.momentLike.findFirst({ where: where as any }) as Promise<DbMomentLike | null>;
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentLike.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, unknown>) =>
      prisma.momentLike.deleteMany({ where }).then((r) => r.count),
  };

  userAchievement = {
    create: (data: Partial<DbUserAchievement>) =>
      prisma.userAchievement.create({ data: data as any }) as Promise<DbUserAchievement>,

    findMany: (where?: Record<string, unknown>) =>
      prisma.userAchievement.findMany({ where: where as any }) as Promise<DbUserAchievement[]>,

    findUnique: (where: { userId?: string; achievementId?: string }) => {
      if (where.userId && where.achievementId) {
        return prisma.userAchievement.findFirst({ where: where as any }) as Promise<DbUserAchievement | null>;
      }
      return Promise.resolve(null);
    },

    deleteMany: (where: Record<string, unknown>) =>
      prisma.userAchievement.deleteMany({ where }).then((r) => r.count),

    count: (where?: Record<string, unknown>) =>
      prisma.userAchievement.count({ where }),
  };

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const txAdapter: DatabaseAdapter = {
        ...this,
        user: {
          create: (data) => tx.user.create({ data: data as any }) as Promise<DbUser>,
          findUnique: (where) => tx.user.findUnique({ where: where as any }) as Promise<DbUser | null>,
          findMany: (where, options) => tx.user.findMany({ where, ...options } as any) as Promise<DbUser[]>,
          update: (where, data) => tx.user.update({ where, data: data as any }) as Promise<DbUser>,
          upsert: (where, create, update) => tx.user.upsert({ where, create: create as any, update: update as any }) as Promise<DbUser>,
          delete: (where) => tx.user.delete({ where }) as Promise<DbUser>,
          count: (where) => tx.user.count({ where }) as Promise<number>,
          groupBy: (params) => tx.user.groupBy({ by: params.by as any, where: params.where, _count: params._count, _sum: params._sum, orderBy: params.orderBy } as any) as Promise<DbUser[]>,
        },
        session: {
          create: (data) => tx.session.create({ data: data as any }) as Promise<DbSession>,
          findUnique: (where, includeUser) => {
            if (includeUser) {
              return tx.session.findUnique({ where: where as any, include: { user: true } }) as Promise<SessionWithUser | null>;
            }
            return tx.session.findUnique({ where: where as any }) as Promise<DbSession | null>;
          },
          update: (where, data) => tx.session.update({ where, data: data as any }) as Promise<DbSession>,
          delete: (where) => tx.session.deleteMany({ where }).then(() => {}),
          deleteMany: (where) => tx.session.deleteMany({ where }).then((r) => r.count),
        },
        like: {
          create: (data) => tx.like.create({ data: data as any }) as Promise<DbLike>,
          findUnique: (where) => {
            if (where.fromUserId && where.toUserId) {
              return tx.like.findFirst({ where: where as any }) as Promise<DbLike | null>;
            }
            return tx.like.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbLike | null>;
          },
          findMany: (where, options) => tx.like.findMany({ where, ...options } as any) as Promise<DbLike[]>,
          delete: (where) => tx.like.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.like.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.like.count({ where }) as Promise<number>,
          groupBy: (params) => tx.like.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbLike[]>,
        },
        match: {
          create: (data) => tx.match.create({ data: data as any }) as Promise<DbMatch>,
          findUnique: (where) => {
            if (where.user1Id && where.user2Id) {
              return tx.match.findFirst({ where: where as any }) as Promise<DbMatch | null>;
            }
            return tx.match.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbMatch | null>;
          },
          findFirst: (where) => tx.match.findFirst({ where: where as any }) as Promise<DbMatch | null>,
          findMany: (where, options) => {
            const { includeLastMessage, ...restOptions } = options || {};
            if (includeLastMessage) {
              return tx.match.findMany({ where, include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }, ...restOptions }) as Promise<(DbMatch & { messages: DbMessage[] })[]>;
            }
            return tx.match.findMany({ where, ...restOptions }) as Promise<DbMatch[]>;
          },
          delete: (where) => tx.match.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.match.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.match.count({ where }) as Promise<number>,
          groupBy: (params) => tx.match.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMatch[]>,
        },
        message: {
          create: (data) => tx.message.create({ data: data as any }) as Promise<DbMessage>,
          findMany: (where, options) => tx.message.findMany({ where, ...options } as any) as Promise<DbMessage[]>,
          findFirst: (where, options) => tx.message.findFirst({ where, ...options }) as Promise<DbMessage | null>,
          updateMany: (where, data) => tx.message.updateMany({ where, data: data as any }).then((r) => r.count),
          deleteMany: (where) => tx.message.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.message.count({ where }) as Promise<number>,
          groupBy: (params) => tx.message.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMessage[]>,
        },
        block: {
          create: (data) => tx.block.create({ data: data as any }) as Promise<DbBlock>,
          findUnique: (where) => {
            if (where.blockerId && where.blockedId) {
              return tx.block.findFirst({ where: where as any }) as Promise<DbBlock | null>;
            }
            return Promise.resolve(null);
          },
          findMany: (where) => tx.block.findMany({ where: where as any }) as Promise<DbBlock[]>,
          deleteMany: (where) => tx.block.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.block.count({ where }) as Promise<number>,
        },
        report: {
          create: (data) => tx.report.create({ data: data as any }) as Promise<DbReport>,
          deleteMany: (where) => tx.report.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.report.count({ where }) as Promise<number>,
        },
        rateLimit: {
          findUnique: (where) => tx.rateLimit.findUnique({ where: where as any }) as Promise<DbRateLimit | null>,
          create: (data) => tx.rateLimit.create({ data: data as any }) as Promise<DbRateLimit>,
          update: (where, data) => tx.rateLimit.update({ where: { key: where.key }, data: data as any }) as Promise<DbRateLimit>,
          deleteMany: (where) => tx.rateLimit.deleteMany({ where }).then((r) => r.count),
        },
        moment: {
          create: (data) => tx.moment.create({ data: data as any }) as Promise<DbMoment>,
          findMany: (where, options) => tx.moment.findMany({ where, ...options } as any) as Promise<DbMoment[]>,
          findUnique: (where) => tx.moment.findUnique({ where: where as any }) as Promise<DbMoment | null>,
          update: (where, data) => tx.moment.update({ where, data: data as any }) as Promise<DbMoment>,
          deleteMany: (where) => tx.moment.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.moment.count({ where }) as Promise<number>,
          groupBy: (params) => tx.moment.groupBy({ by: params.by as any, where: params.where, _count: params._count } as any) as Promise<DbMoment[]>,
        },
        momentComment: {
          create: (data) => tx.momentComment.create({ data: data as any }) as Promise<DbMomentComment>,
          findMany: (where, options) => tx.momentComment.findMany({ where, ...options } as any) as Promise<DbMomentComment[]>,
          deleteMany: (where) => tx.momentComment.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.momentComment.count({ where }) as Promise<number>,
        },
        momentReaction: {
          create: (data) => tx.momentReaction.create({ data: data as any }) as Promise<DbMomentReaction>,
          findMany: (where, options) => tx.momentReaction.findMany({ where, ...options } as any) as Promise<DbMomentReaction[]>,
          findUnique: (where) => {
            if (where.momentId && where.userId && where.emoji) {
              return tx.momentReaction.findFirst({ where: where as any }) as Promise<DbMomentReaction | null>;
            }
            return Promise.resolve(null);
          },
          delete: (where) => tx.momentReaction.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.momentReaction.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.momentReaction.count({ where }) as Promise<number>,
        },
        momentLike: {
          create: (data) => tx.momentLike.create({ data: data as any }) as Promise<DbMomentLike>,
          findUnique: (where) => {
            if (where.momentId && where.userId) {
              return tx.momentLike.findFirst({ where: where as any }) as Promise<DbMomentLike | null>;
            }
            return Promise.resolve(null);
          },
          delete: (where) => tx.momentLike.delete({ where }).then(() => {}),
          deleteMany: (where) => tx.momentLike.deleteMany({ where }).then((r) => r.count),
        },
        userAchievement: {
          create: (data) => tx.userAchievement.create({ data: data as any }) as Promise<DbUserAchievement>,
          findMany: (where) => tx.userAchievement.findMany({ where: where as any }) as Promise<DbUserAchievement[]>,
          findUnique: (where) => {
            if (where.userId && where.achievementId) {
              return tx.userAchievement.findFirst({ where: where as any }) as Promise<DbUserAchievement | null>;
            }
            return Promise.resolve(null);
          },
          deleteMany: (where) => tx.userAchievement.deleteMany({ where }).then((r) => r.count),
          count: (where) => tx.userAchievement.count({ where }) as Promise<number>,
        },
      };
      return fn(txAdapter);
    });
  }
}
