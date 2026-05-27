export type DbType = 'sqlite' | 'postgresql' | 'mongodb';

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string;
  avatar: string;
  photos: string;
  city: string;
  lookingFor: string;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpiry: Date | null;
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  totpSecret: string | null;
  totpEnabled: boolean;
  totpBackupCodes: string;
  loginAttempts: number;
  lockedUntil: Date | null;
  notificationsEnabled: boolean;
  profileVisible: boolean;
  role: string;
  showOnlineStatus: boolean;
  language: string;
  showDistance: boolean;
  soundEnabled: boolean;
  matchNotifications: boolean;
  likeNotifications: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface DbLike {
  id: string;
  fromUserId: string;
  toUserId: string;
  isSuperLike: boolean;
  createdAt: Date;
}

export interface DbMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}

export interface DbMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface DbBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  reason: string | null;
  createdAt: Date;
}

export interface DbReport {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  details: string | null;
  createdAt: Date;
}

export interface DbRateLimit {
  id: string;
  key: string;
  count: number;
  resetAt: Date;
}

export interface DbMoment {
  id: string;
  userId: string;
  content: string;
  gradient: string;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbMomentComment {
  id: string;
  momentId: string;
  userId: string;
  content: string;
  createdAt: Date;
}

export interface DbMomentReaction {
  id: string;
  momentId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface DbMomentLike {
  id: string;
  momentId: string;
  userId: string;
  createdAt: Date;
}

export interface DbUserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

export interface DbDislike {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
}

export type SessionWithUser = DbSession & { user: DbUser };

export interface ProfileSelect {
  id: string;
  name: string;
  age: number;
  gender: string;
  bio: string;
  interests: string;
  avatar: string;
  photos: string;
  city: string;
  lookingFor: string;
  profileVisible: boolean;
  showOnlineStatus: boolean;
  language: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseAdapter {
  readonly dbType: DbType;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  user: {
    create(data: Partial<DbUser>): Promise<DbUser>;
    findUnique(where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }): Promise<DbUser | null>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; select?: Record<string, boolean>; cursor?: Record<string, unknown> }): Promise<DbUser[]>;
    update(where: { id: string }, data: Partial<DbUser>): Promise<DbUser>;
    upsert(where: { email: string }, create: Partial<DbUser>, update: Partial<DbUser>): Promise<DbUser>;
    delete(where: { id: string }): Promise<DbUser>;
    count(where?: Record<string, unknown>): Promise<number>;
    groupBy(params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, unknown> }): Promise<unknown[]>;
  };

  session: {
    create(data: Partial<DbSession>): Promise<DbSession>;
    findUnique(where: { token?: string; id?: string }, includeUser?: boolean): Promise<DbSession | (SessionWithUser) | null>;
    update(where: { id: string }, data: Partial<DbSession>): Promise<DbSession>;
    delete(where: { id?: string; token?: string }): Promise<void>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
  };

  like: {
    create(data: Partial<DbLike>): Promise<DbLike>;
    findUnique(where: { fromUserId?: string; toUserId?: string; id?: string }): Promise<DbLike | null>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }): Promise<DbLike[]>;
    delete(where: { id: string }): Promise<void>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
    groupBy(params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<unknown[]>;
  };

  match: {
    create(data: Partial<DbMatch>): Promise<DbMatch>;
    findUnique(where: { user1Id?: string; user2Id?: string; id?: string }): Promise<DbMatch | null>;
    findFirst(where?: Record<string, unknown>): Promise<DbMatch | null>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; includeLastMessage?: boolean }): Promise<(DbMatch & { messages?: DbMessage[] })[]>;
    delete(where: { id: string }): Promise<void>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
    groupBy(params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<unknown[]>;
  };

  message: {
    create(data: Partial<DbMessage>): Promise<DbMessage>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown>; cursor?: Record<string, unknown> }): Promise<DbMessage[]>;
    findFirst(where?: Record<string, unknown>, options?: { orderBy?: Record<string, unknown> }): Promise<DbMessage | null>;
    updateMany(where: Record<string, unknown>, data: Partial<DbMessage>): Promise<number>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
    groupBy(params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<unknown[]>;
  };

  block: {
    create(data: Partial<DbBlock>): Promise<DbBlock>;
    findUnique(where: { blockerId?: string; blockedId?: string }): Promise<DbBlock | null>;
    findMany(where?: Record<string, unknown>): Promise<DbBlock[]>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
  };

  report: {
    create(data: Partial<DbReport>): Promise<DbReport>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
  };

  rateLimit: {
    findUnique(where: { key: string }): Promise<DbRateLimit | null>;
    create(data: Partial<DbRateLimit>): Promise<DbRateLimit>;
    update(where: { key: string }, data: Partial<DbRateLimit>): Promise<DbRateLimit>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
  };

  moment: {
    create(data: Partial<DbMoment>): Promise<DbMoment>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }): Promise<DbMoment[]>;
    findUnique(where: { id: string }): Promise<DbMoment | null>;
    update(where: { id: string }, data: Partial<DbMoment> | Record<string, unknown>): Promise<DbMoment>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
    groupBy(params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<unknown[]>;
  };

  momentComment: {
    create(data: Partial<DbMomentComment>): Promise<DbMomentComment>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }): Promise<DbMomentComment[]>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
  };

  momentReaction: {
    create(data: Partial<DbMomentReaction>): Promise<DbMomentReaction>;
    findMany(where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, unknown> }): Promise<DbMomentReaction[]>;
    findUnique(where: { momentId?: string; userId?: string; emoji?: string }): Promise<DbMomentReaction | null>;
    delete(where: { id: string }): Promise<void>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
  };

  momentLike: {
    create(data: Partial<DbMomentLike>): Promise<DbMomentLike>;
    findUnique(where: { momentId?: string; userId?: string }): Promise<DbMomentLike | null>;
    delete(where: { id: string }): Promise<void>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
  };

  userAchievement: {
    create(data: Partial<DbUserAchievement>): Promise<DbUserAchievement>;
    findMany(where?: Record<string, unknown>): Promise<DbUserAchievement[]>;
    findUnique(where: { userId?: string; achievementId?: string }): Promise<DbUserAchievement | null>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
    count(where?: Record<string, unknown>): Promise<number>;
  };

  dislike: {
    create(data: Partial<DbDislike>): Promise<DbDislike>;
    findFirst(where?: Record<string, unknown>): Promise<DbDislike | null>;
    findMany(where?: Record<string, unknown>): Promise<DbDislike[]>;
    deleteMany(where: Record<string, unknown>): Promise<number>;
  };

  transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
}
