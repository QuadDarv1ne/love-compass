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
      prisma.user.findUnique({ where } as any) as Promise<DbUser | null>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any>; select?: Record<string, boolean>; cursor?: Record<string, any> }) =>
      prisma.user.findMany({ where, ...options } as any) as Promise<any[]>,

    update: (where: { id: string }, data: Partial<DbUser>) =>
      prisma.user.update({ where, data: data as any }) as Promise<DbUser>,

    upsert: (where: { email: string }, create: Partial<DbUser>, update: Partial<DbUser>) =>
      prisma.user.upsert({ where, create: create as any, update: update as any }) as Promise<DbUser>,

    delete: (where: { id: string }) =>
      prisma.user.delete({ where }) as Promise<DbUser>,

    count: (where?: Record<string, any>) =>
      prisma.user.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, any> }) =>
      (prisma.user as any).groupBy({ by: params.by, where: params.where, _count: params._count, _sum: params._sum, orderBy: params.orderBy }) as Promise<any[]>,
  };

  session = {
    create: (data: Partial<DbSession>) =>
      prisma.session.create({ data: data as any }) as Promise<DbSession>,

    findUnique: (where: { token?: string; id?: string }, includeUser?: boolean) => {
      if (includeUser) {
        return prisma.session.findUnique({
          where,
          include: { user: true },
        } as any) as Promise<SessionWithUser | null>;
      }
      return (prisma.session as any).findUnique({ where }) as Promise<DbSession | null>;
    },

    update: (where: { id: string }, data: Partial<DbSession>) =>
      prisma.session.update({ where, data: data as any }) as Promise<DbSession>,

    delete: (where: { id?: string; token?: string }) =>
      prisma.session.deleteMany({ where }).then(() => {}),

    deleteMany: (where: Record<string, any>) =>
      prisma.session.deleteMany({ where }).then((r: { count: number }) => r.count),
  };

  like = {
    create: (data: Partial<DbLike>) =>
      prisma.like.create({ data: data as any }) as Promise<DbLike>,

    findUnique: (where: { fromUserId?: string; toUserId?: string; id?: string }) => {
      if (where.fromUserId && where.toUserId) {
        return prisma.like.findFirst({ where }) as Promise<DbLike | null>;
      }
      return prisma.like.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbLike | null>;
    },

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }) =>
      prisma.like.findMany({ where, ...options }) as Promise<DbLike[]>,

    delete: (where: { id: string }) =>
      prisma.like.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, any>) =>
      prisma.like.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.like.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }) =>
      (prisma.like as any).groupBy({ by: params.by, where: params.where, _count: params._count }) as Promise<any[]>,
  };

  match = {
    create: (data: Partial<DbMatch>) =>
      prisma.match.create({ data: data as any }) as Promise<DbMatch>,

    findUnique: (where: { user1Id?: string; user2Id?: string; id?: string }) => {
      if (where.user1Id && where.user2Id) {
        return prisma.match.findFirst({ where }) as Promise<DbMatch | null>;
      }
      return prisma.match.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbMatch | null>;
    },

    findFirst: (where?: Record<string, any>) =>
      prisma.match.findFirst({ where }) as Promise<DbMatch | null>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any>; includeLastMessage?: boolean }) => {
      if (options?.includeLastMessage) {
        return prisma.match.findMany({
          where,
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          ...options,
        } as any) as Promise<any[]>;
      }
      return (prisma.match as any).findMany({ where, skip: options?.skip, take: options?.take, orderBy: options?.orderBy }) as Promise<any[]>;
    },

    delete: (where: { id: string }) =>
      prisma.match.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, any>) =>
      prisma.match.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.match.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }) =>
      (prisma.match as any).groupBy({ by: params.by, where: params.where, _count: params._count }) as Promise<any[]>,
  };

  message = {
    create: (data: Partial<DbMessage>) =>
      prisma.message.create({ data: data as any }) as Promise<DbMessage>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }) =>
      prisma.message.findMany({ where, ...options }) as Promise<DbMessage[]>,

    findFirst: (where?: Record<string, any>, options?: { orderBy?: Record<string, any> }) =>
      prisma.message.findFirst({ where, ...options }) as Promise<DbMessage | null>,

    updateMany: (where: Record<string, any>, data: Partial<DbMessage>) =>
      prisma.message.updateMany({ where, data: data as any }).then((r: { count: number }) => r.count),

    deleteMany: (where: Record<string, any>) =>
      prisma.message.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.message.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }) =>
      (prisma.message as any).groupBy({ by: params.by, where: params.where, _count: params._count }) as Promise<any[]>,
  };

  block = {
    create: (data: Partial<DbBlock>) =>
      prisma.block.create({ data: data as any }) as Promise<DbBlock>,

    findUnique: (where: { blockerId?: string; blockedId?: string }) => {
      if (where.blockerId && where.blockedId) {
        return prisma.block.findFirst({ where }) as Promise<DbBlock | null>;
      }
      return Promise.resolve(null);
    },

    findMany: (where?: Record<string, any>) =>
      prisma.block.findMany({ where }) as Promise<DbBlock[]>,

    deleteMany: (where: Record<string, any>) =>
      prisma.block.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.block.count({ where }),
  };

  report = {
    create: (data: Partial<DbReport>) =>
      prisma.report.create({ data: data as any }) as Promise<DbReport>,

    deleteMany: (where: Record<string, any>) =>
      prisma.report.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.report.count({ where }),
  };

  rateLimit = {
    findUnique: (where: { key: string }) =>
      prisma.rateLimit.findUnique({ where }) as Promise<DbRateLimit | null>,

    create: (data: Partial<DbRateLimit>) =>
      prisma.rateLimit.create({ data: data as any }) as Promise<DbRateLimit>,

    update: (where: { key: string }, data: Partial<DbRateLimit>) =>
      prisma.rateLimit.update({ where: { key: where.key }, data: data as any }) as Promise<DbRateLimit>,

    deleteMany: (where: Record<string, any>) =>
      prisma.rateLimit.deleteMany({ where }).then((r: { count: number }) => r.count),
  };

  moment = {
    create: (data: Partial<DbMoment>) =>
      prisma.moment.create({ data: data as any }) as Promise<DbMoment>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }) =>
      prisma.moment.findMany({ where, ...options }) as Promise<DbMoment[]>,

    findUnique: (where: { id: string }) =>
      prisma.moment.findUnique({ where }) as Promise<DbMoment | null>,

    update: (where: { id: string }, data: Partial<DbMoment>) =>
      prisma.moment.update({ where, data: data as any }) as Promise<DbMoment>,

    deleteMany: (where: Record<string, any>) =>
      prisma.moment.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.moment.count({ where }),

    groupBy: (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }) =>
      (prisma.moment as any).groupBy({ by: params.by, where: params.where, _count: params._count }) as Promise<any[]>,
  };

  momentComment = {
    create: (data: Partial<DbMomentComment>) =>
      prisma.momentComment.create({ data: data as any }) as Promise<DbMomentComment>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }) =>
      prisma.momentComment.findMany({ where, ...options }) as Promise<DbMomentComment[]>,

    deleteMany: (where: Record<string, any>) =>
      prisma.momentComment.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.momentComment.count({ where }),
  };

  momentReaction = {
    create: (data: Partial<DbMomentReaction>) =>
      prisma.momentReaction.create({ data: data as any }) as Promise<DbMomentReaction>,

    findMany: (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }) =>
      prisma.momentReaction.findMany({ where, ...options }) as Promise<DbMomentReaction[]>,

    findUnique: (where: { momentId?: string; userId?: string; emoji?: string }) => {
      if (where.momentId && where.userId && where.emoji) {
        return prisma.momentReaction.findFirst({ where }) as Promise<DbMomentReaction | null>;
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentReaction.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, any>) =>
      prisma.momentReaction.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.momentReaction.count({ where }),
  };

  momentLike = {
    create: (data: Partial<DbMomentLike>) =>
      prisma.momentLike.create({ data: data as any }) as Promise<DbMomentLike>,

    findUnique: (where: { momentId?: string; userId?: string }) => {
      if (where.momentId && where.userId) {
        return prisma.momentLike.findFirst({ where }) as Promise<DbMomentLike | null>;
      }
      return Promise.resolve(null);
    },

    delete: (where: { id: string }) =>
      prisma.momentLike.delete({ where }).then(() => {}),

    deleteMany: (where: Record<string, any>) =>
      prisma.momentLike.deleteMany({ where }).then((r: { count: number }) => r.count),
  };

  userAchievement = {
    create: (data: Partial<DbUserAchievement>) =>
      prisma.userAchievement.create({ data: data as any }) as Promise<DbUserAchievement>,

    findMany: (where?: Record<string, any>) =>
      prisma.userAchievement.findMany({ where }) as Promise<DbUserAchievement[]>,

    findUnique: (where: { userId?: string; achievementId?: string }) => {
      if (where.userId && where.achievementId) {
        return prisma.userAchievement.findFirst({ where }) as Promise<DbUserAchievement | null>;
      }
      return Promise.resolve(null);
    },

    deleteMany: (where: Record<string, any>) =>
      prisma.userAchievement.deleteMany({ where }).then((r: { count: number }) => r.count),

    count: (where?: Record<string, any>) =>
      prisma.userAchievement.count({ where }),
  };

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      const txAdapter: DatabaseAdapter = {
        ...this,
        user: {
          ...this.user,
          create: (data) => (tx as any).user.create({ data: data as any }) as Promise<DbUser>,
          findUnique: (where) => (tx as any).user.findUnique({ where } as any) as Promise<DbUser | null>,
          findMany: (where, options) => (tx as any).user.findMany({ where, ...options } as any) as Promise<any[]>,
          update: (where, data) => (tx as any).user.update({ where, data: data as any }) as Promise<DbUser>,
          upsert: (where, create, update) => (tx as any).user.upsert({ where, create: create as any, update: update as any }) as Promise<DbUser>,
        },
        session: {
          ...this.session,
          create: (data) => (tx as any).session.create({ data: data as any }) as Promise<DbSession>,
          findUnique: (where, includeUser) => {
            if (includeUser) {
              return (tx as any).session.findUnique({ where, include: { user: true } } as any) as Promise<SessionWithUser | null>;
            }
            return (tx as any).session.findUnique({ where }) as Promise<DbSession | null>;
          },
          update: (where, data) => (tx as any).session.update({ where, data: data as any }) as Promise<DbSession>,
          deleteMany: (where) => (tx as any).session.deleteMany({ where }).then((r: { count: number }) => r.count),
        },
        like: {
          ...this.like,
          create: (data) => (tx as any).like.create({ data: data as any }) as Promise<DbLike>,
          findUnique: (where) => {
            if (where.fromUserId && where.toUserId) {
              return (tx as any).like.findFirst({ where }) as Promise<DbLike | null>;
            }
            return (tx as any).like.findUnique({ where: where.id ? { id: where.id } : undefined } as any) as Promise<DbLike | null>;
          },
          deleteMany: (where) => (tx as any).like.deleteMany({ where }).then((r: { count: number }) => r.count),
        },
        match: {
          ...this.match,
          create: (data) => (tx as any).match.create({ data: data as any }) as Promise<DbMatch>,
          findFirst: (where) => (tx as any).match.findFirst({ where }) as Promise<DbMatch | null>,
          deleteMany: (where) => (tx as any).match.deleteMany({ where }).then((r: { count: number }) => r.count),
        },
        rateLimit: {
          ...this.rateLimit,
          findUnique: (where) => (tx as any).rateLimit.findUnique({ where }) as Promise<DbRateLimit | null>,
          create: (data) => (tx as any).rateLimit.create({ data: data as any }) as Promise<DbRateLimit>,
          update: (where, data) => (tx as any).rateLimit.update({ where: { key: where.key }, data: data as any }) as Promise<DbRateLimit>,
        },
        moment: {
          ...this.moment,
          update: (where, data) => (tx as any).moment.update({ where, data: data as any }) as Promise<DbMoment>,
        },
        momentReaction: {
          ...this.momentReaction,
          findUnique: (where) => {
            if (where.momentId && where.userId && where.emoji) {
              return (tx as any).momentReaction.findFirst({ where }) as Promise<DbMomentReaction | null>;
            }
            return Promise.resolve(null);
          },
        },
        momentLike: {
          ...this.momentLike,
          findUnique: (where) => {
            if (where.momentId && where.userId) {
              return (tx as any).momentLike.findFirst({ where }) as Promise<DbMomentLike | null>;
            }
            return Promise.resolve(null);
          },
        },
        userAchievement: {
          ...this.userAchievement,
          findUnique: (where) => {
            if (where.userId && where.achievementId) {
              return (tx as any).userAchievement.findFirst({ where }) as Promise<DbUserAchievement | null>;
            }
            return Promise.resolve(null);
          },
        },
      };
      return fn(txAdapter);
    });
  }
}
