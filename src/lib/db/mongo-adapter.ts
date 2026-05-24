import { MongoClient, ObjectId } from 'mongodb';
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
} from './types';

const COLLECTIONS = {
  users: 'users',
  sessions: 'sessions',
  likes: 'likes',
  matches: 'matches',
  messages: 'messages',
  blocks: 'blocks',
  reports: 'reports',
  rateLimits: 'rateLimits',
  moments: 'moments',
  momentComments: 'momentComments',
  momentReactions: 'momentReactions',
  momentLikes: 'momentLikes',
  userAchievements: 'userAchievements',
} as const;

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    return new ObjectId();
  }
}

function stripId(doc: Record<string, any> | null): Record<string, any> | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function stripMany<T extends Record<string, any>>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
  return docs.map(d => {
    const { _id, ...rest } = d;
    return { id: (_id as ObjectId).toString(), ...rest } as Omit<T, '_id'> & { id: string };
  });
}

function cleanWhere(where: Record<string, any> = {}): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function mongoOrder(orderBy?: Record<string, any>): Record<string, any> | undefined {
  if (!orderBy) return undefined;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(orderBy)) {
    result[key] = value === 'desc' ? -1 : 1;
  }
  return result;
}

export class MongoDBAdapter implements DatabaseAdapter {
  readonly dbType = 'mongodb' as const;

  protected client: MongoClient;
  protected dbName: string;

  constructor(connectionString: string) {
    this.client = new MongoClient(connectionString);
    const url = new URL(connectionString);
    this.dbName = url.pathname.replace(/^\//, '') || 'love_compass';
  }

  protected get db() {
    return this.client.db(this.dbName);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      // Already connected or error — safe to ignore, will be caught by actual queries
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  user = {
    create: async (data: Partial<DbUser>): Promise<DbUser> => {
      const result = await this.db.collection<DbUser>(COLLECTIONS.users).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbUser;
    },

    findUnique: async (where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }): Promise<DbUser | null> => {
      const query = cleanWhere(where);
      if (query.id) {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbUser>(COLLECTIONS.users).findOne(query);
      return stripId(doc) as DbUser | null;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any>; select?: Record<string, boolean>; cursor?: Record<string, any> }): Promise<any[]> => {
      let cursor = undefined;
      if (options?.cursor?.id) {
        const cursorDoc = await this.db.collection<DbUser>(COLLECTIONS.users).findOne({ _id: toObjectId(options.cursor.id) });
        if (cursorDoc) {
          cursor = cursorDoc;
        }
      }
      const skip = options?.skip || (cursor && options?.take ? 1 : 0);
      const c = this.db.collection<DbUser>(COLLECTIONS.users)
        .find(cleanWhere(where || {}))
        .skip(skip)
        .limit(options?.take || 0);
      if (options?.orderBy) {
        const sortObj = mongoOrder(options.orderBy);
        if (sortObj) c.sort(sortObj);
      }
      if (options?.select) {
        const projection: Record<string, number> = {};
        for (const [key, value] of Object.entries(options.select)) projection[key] = value ? 1 : 0;
        c.project(projection);
      }
      const docs = await c.toArray();
      return stripMany(docs);
    },

    update: async (where: { id: string }, data: Partial<DbUser>): Promise<DbUser> => {
      const result = await this.db.collection<DbUser>(COLLECTIONS.users).findOneAndUpdate(
        { _id: toObjectId(where.id) },
        { $set: data as any },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('User not found');
      return stripId(result) as DbUser;
    },

    upsert: async (where: { email: string }, create: Partial<DbUser>, update: Partial<DbUser>): Promise<DbUser> => {
      const existing = await this.db.collection<DbUser>(COLLECTIONS.users).findOne({ email: where.email });
      if (existing) {
        return this.user.update({ id: (existing._id as ObjectId).toString() }, update);
      }
      return this.user.create(create);
    },

    delete: async (where: { id: string }): Promise<DbUser> => {
      const doc = await this.db.collection<DbUser>(COLLECTIONS.users).findOneAndDelete({ _id: toObjectId(where.id) });
      if (!doc) throw new Error('User not found');
      return stripId(doc) as DbUser;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbUser>(COLLECTIONS.users).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, any> }): Promise<any[]> => {
      const pipeline: any[] = [];
      if (params.where) {
        pipeline.push({ $match: cleanWhere(params.where) });
      }

      const _id: Record<string, any> = {};
      for (const field of params.by) {
        _id[field] = `$${field}`;
      }
      if (params._count) {
        _id._count = { $sum: 1 };
      }
      if (params._sum) {
        for (const field of Object.keys(params._sum)) {
          _id[`_sum_${field}`] = { $sum: `$${field}` };
        }
      }

      pipeline.push({ $group: _id });

      if (params.orderBy) {
        const sort: Record<string, any> = {};
        for (const [key, value] of Object.entries(params.orderBy)) {
          sort[key] = value === 'desc' ? -1 : 1;
        }
        pipeline.push({ $sort: sort });
      }

      return this.db.collection<DbUser>(COLLECTIONS.users).aggregate(pipeline).toArray();
    },
  };

  session = {
    create: async (data: Partial<DbSession>): Promise<DbSession> => {
      const result = await this.db.collection<DbSession>(COLLECTIONS.sessions).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbSession;
    },

    findUnique: async (where: { token?: string; id?: string }, includeUser?: boolean): Promise<DbSession | SessionWithUser | null> => {
      const query = cleanWhere(where);
      if (query.id) {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbSession>(COLLECTIONS.sessions).findOne(query);
      if (!doc || !includeUser) return stripId(doc) as DbSession | null;

      const user = await this.db.collection<DbUser>(COLLECTIONS.users).findOne({ _id: toObjectId(doc.userId) });
      return { ...stripId(doc)!, user: stripId(user)! } as SessionWithUser;
    },

    update: async (where: { id: string }, data: Partial<DbSession>): Promise<DbSession> => {
      const result = await this.db.collection<DbSession>(COLLECTIONS.sessions).findOneAndUpdate(
        { _id: toObjectId(where.id) },
        { $set: data },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Session not found');
      return stripId(result) as DbSession;
    },

    delete: async (where: { id?: string; token?: string }): Promise<void> => {
      const query = cleanWhere(where as any);
      if (query.id) {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      await this.db.collection<DbSession>(COLLECTIONS.sessions).deleteOne(query);
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbSession>(COLLECTIONS.sessions).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  like = {
    create: async (data: Partial<DbLike>): Promise<DbLike> => {
      const result = await this.db.collection<DbLike>(COLLECTIONS.likes).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbLike;
    },

    findUnique: async (where: { fromUserId?: string; toUserId?: string; id?: string }): Promise<DbLike | null> => {
      const query = cleanWhere(where);
      if (query.id) {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      if (query.fromUserId && query.toUserId) {
        const doc = await this.db.collection<DbLike>(COLLECTIONS.likes).findOne(query);
        return stripId(doc) as DbLike | null;
      }
      if (query._id) {
        const doc = await this.db.collection<DbLike>(COLLECTIONS.likes).findOne({ _id: query._id });
        return stripId(doc) as DbLike | null;
      }
      return null;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }): Promise<DbLike[]> => {
      const cursor = this.db.collection<DbLike>(COLLECTIONS.likes)
        .find(cleanWhere(where || {}))
        .skip(options?.skip || 0)
        .limit(options?.take || 0);

      if (options?.orderBy) {
        const sortObj = mongoOrder(options.orderBy);
        if (sortObj) cursor.sort(sortObj);
      }

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    delete: async (where: { id: string }): Promise<void> => {
      await this.db.collection<DbLike>(COLLECTIONS.likes).deleteOne({ _id: toObjectId(where.id) });
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbLike>(COLLECTIONS.likes).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbLike>(COLLECTIONS.likes).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }): Promise<any[]> => {
      const pipeline: any[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const _id: Record<string, any> = {};
      for (const field of params.by) _id[field] = `$${field}`;
      if (params._count) {
        for (const field of Object.keys(params._count)) _id[`_count_${field}`] = { $sum: 1 };
      }
      pipeline.push({ $group: _id });
      return this.db.collection<DbLike>(COLLECTIONS.likes).aggregate(pipeline).toArray();
    },
  };

  match = {
    create: async (data: Partial<DbMatch>): Promise<DbMatch> => {
      const result = await this.db.collection<DbMatch>(COLLECTIONS.matches).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMatch;
    },

    findUnique: async (where: { user1Id?: string; user2Id?: string; id?: string }): Promise<DbMatch | null> => {
      const query = cleanWhere(where);
      if (query.id) {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbMatch>(COLLECTIONS.matches).findOne(query);
      return stripId(doc) as DbMatch | null;
    },

    findFirst: async (where?: Record<string, any>): Promise<DbMatch | null> => {
      const doc = await this.db.collection<DbMatch>(COLLECTIONS.matches).findOne(cleanWhere(where || {}));
      return stripId(doc) as DbMatch | null;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any>; includeLastMessage?: boolean }): Promise<any[]> => {
      let pipeline: any[] = [{ $match: cleanWhere(where || {}) }];

      if (options?.includeLastMessage) {
        pipeline = [
          { $match: cleanWhere(where || {}) },
          {
            $lookup: {
              from: COLLECTIONS.messages,
              let: { matchId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$matchId', '$$matchId'] } } },
                { $sort: { createdAt: -1 } },
                { $limit: 1 },
              ],
              as: 'messages',
            },
          },
        ];
      }

      const cursor = this.db.collection<DbMatch>(COLLECTIONS.matches).aggregate(pipeline);

      if (options?.orderBy) {
        const s = mongoOrder(options.orderBy); if (s) cursor.sort(s);
      }

      if (options?.skip) cursor.skip(options.skip);
      if (options?.take) cursor.limit(options.take);

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    delete: async (where: { id: string }): Promise<void> => {
      await this.db.collection<DbMatch>(COLLECTIONS.matches).deleteOne({ _id: toObjectId(where.id) });
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMatch>(COLLECTIONS.matches).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbMatch>(COLLECTIONS.matches).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }): Promise<any[]> => {
      const pipeline: any[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const _id: Record<string, any> = {};
      for (const field of params.by) _id[field] = `$${field}`;
      if (params._count) {
        for (const field of Object.keys(params._count)) _id[`_count_${field}`] = { $sum: 1 };
      }
      pipeline.push({ $group: _id });
      return this.db.collection<DbMatch>(COLLECTIONS.matches).aggregate(pipeline).toArray();
    },
  };

  message = {
    create: async (data: Partial<DbMessage>): Promise<DbMessage> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMessage;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }): Promise<DbMessage[]> => {
      const cursor = this.db.collection<DbMessage>(COLLECTIONS.messages)
        .find(cleanWhere(where || {}))
        .skip(options?.skip || 0)
        .limit(options?.take || 0);

      if (options?.orderBy) {
        const s = mongoOrder(options.orderBy); if (s) cursor.sort(s);
      }

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    findFirst: async (where?: Record<string, any>, options?: { orderBy?: Record<string, any> }): Promise<DbMessage | null> => {
      const query = cleanWhere(where || {});
      const cursor = this.db.collection<DbMessage>(COLLECTIONS.messages).findOne(query);

      if (options?.orderBy) {
        return this.db.collection<DbMessage>(COLLECTIONS.messages).findOne(query, { sort: mongoOrder(options.orderBy) });
      }

      const doc = await cursor;
      return stripId(doc) as DbMessage | null;
    },

    updateMany: async (where: Record<string, any>, data: Partial<DbMessage>): Promise<number> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).updateMany(cleanWhere(where), { $set: data });
      return result.modifiedCount;
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbMessage>(COLLECTIONS.messages).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }): Promise<any[]> => {
      const pipeline: any[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const _id: Record<string, any> = {};
      for (const field of params.by) _id[field] = `$${field}`;
      if (params._count) {
        for (const field of Object.keys(params._count)) _id[`_count_${field}`] = { $sum: 1 };
      }
      pipeline.push({ $group: _id });
      return this.db.collection<DbMessage>(COLLECTIONS.messages).aggregate(pipeline).toArray();
    },
  };

  block = {
    create: async (data: Partial<DbBlock>): Promise<DbBlock> => {
      const result = await this.db.collection<DbBlock>(COLLECTIONS.blocks).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbBlock;
    },

    findUnique: async (where: { blockerId?: string; blockedId?: string }): Promise<DbBlock | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbBlock>(COLLECTIONS.blocks).findOne(query);
      return stripId(doc) as DbBlock | null;
    },

    findMany: async (where?: Record<string, any>): Promise<DbBlock[]> => {
      const docs = await this.db.collection<DbBlock>(COLLECTIONS.blocks).find(cleanWhere(where || {})).toArray();
      return stripMany(docs);
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbBlock>(COLLECTIONS.blocks).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbBlock>(COLLECTIONS.blocks).countDocuments(cleanWhere(where || {}));
    },
  };

  report = {
    create: async (data: Partial<DbReport>): Promise<DbReport> => {
      const result = await this.db.collection<DbReport>(COLLECTIONS.reports).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbReport;
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbReport>(COLLECTIONS.reports).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbReport>(COLLECTIONS.reports).countDocuments(cleanWhere(where || {}));
    },
  };

  rateLimit = {
    findUnique: async (where: { key: string }): Promise<DbRateLimit | null> => {
      const doc = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).findOne({ key: where.key });
      return stripId(doc) as DbRateLimit | null;
    },

    create: async (data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
      const result = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbRateLimit;
    },

    update: async (where: { key: string }, data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
      const result = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).findOneAndUpdate(
        { key: where.key },
        { $set: data },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('RateLimit not found');
      return stripId(result) as DbRateLimit;
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  moment = {
    create: async (data: Partial<DbMoment>): Promise<DbMoment> => {
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMoment;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }): Promise<DbMoment[]> => {
      const cursor = this.db.collection<DbMoment>(COLLECTIONS.moments)
        .find(cleanWhere(where || {}))
        .skip(options?.skip || 0)
        .limit(options?.take || 0);

      if (options?.orderBy) {
        const s = mongoOrder(options.orderBy); if (s) cursor.sort(s);
      }

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    findUnique: async (where: { id: string }): Promise<DbMoment | null> => {
      const doc = await this.db.collection<DbMoment>(COLLECTIONS.moments).findOne({ _id: toObjectId(where.id) });
      return stripId(doc) as DbMoment | null;
    },

    update: async (where: { id: string }, data: Partial<DbMoment>): Promise<DbMoment> => {
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).findOneAndUpdate(
        { _id: toObjectId(where.id) },
        { $set: data },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Moment not found');
      return stripId(result) as DbMoment;
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbMoment>(COLLECTIONS.moments).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, any>; _count?: Record<string, boolean> }): Promise<any[]> => {
      const pipeline: any[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const _id: Record<string, any> = {};
      for (const field of params.by) _id[field] = `$${field}`;
      if (params._count) {
        for (const field of Object.keys(params._count)) _id[`_count_${field}`] = { $sum: 1 };
      }
      pipeline.push({ $group: _id });
      return this.db.collection<DbMoment>(COLLECTIONS.moments).aggregate(pipeline).toArray();
    },
  };

  momentComment = {
    create: async (data: Partial<DbMomentComment>): Promise<DbMomentComment> => {
      const result = await this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMomentComment;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }): Promise<DbMomentComment[]> => {
      const cursor = this.db.collection<DbMomentComment>(COLLECTIONS.momentComments)
        .find(cleanWhere(where || {}))
        .skip(options?.skip || 0)
        .limit(options?.take || 0);

      if (options?.orderBy) {
        const s = mongoOrder(options.orderBy); if (s) cursor.sort(s);
      }

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).countDocuments(cleanWhere(where || {}));
    },
  };

  momentReaction = {
    create: async (data: Partial<DbMomentReaction>): Promise<DbMomentReaction> => {
      const result = await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMomentReaction;
    },

    findMany: async (where?: Record<string, any>, options?: { skip?: number; take?: number; orderBy?: Record<string, any> }): Promise<DbMomentReaction[]> => {
      const cursor = this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions)
        .find(cleanWhere(where || {}))
        .skip(options?.skip || 0)
        .limit(options?.take || 0);
      if (options?.orderBy) {
        const sortObj = mongoOrder(options.orderBy);
        if (sortObj) cursor.sort(sortObj);
      }
      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    findUnique: async (where: { momentId?: string; userId?: string; emoji?: string }): Promise<DbMomentReaction | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).findOne(query);
      return stripId(doc) as DbMomentReaction | null;
    },

    delete: async (where: { id: string }): Promise<void> => {
      await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).deleteOne({ _id: toObjectId(where.id) });
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).countDocuments(cleanWhere(where || {}));
    },
  };

  momentLike = {
    create: async (data: Partial<DbMomentLike>): Promise<DbMomentLike> => {
      const result = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbMomentLike;
    },

    findUnique: async (where: { momentId?: string; userId?: string }): Promise<DbMomentLike | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).findOne(query);
      return stripId(doc) as DbMomentLike | null;
    },

    delete: async (where: { id: string }): Promise<void> => {
      await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).deleteOne({ _id: toObjectId(where.id) });
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  userAchievement = {
    create: async (data: Partial<DbUserAchievement>): Promise<DbUserAchievement> => {
      const result = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).insertOne(data as any);
      return { ...data, id: result.insertedId.toString() } as DbUserAchievement;
    },

    findMany: async (where?: Record<string, any>): Promise<DbUserAchievement[]> => {
      const docs = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).find(cleanWhere(where || {})).toArray();
      return stripMany(docs);
    },

    findUnique: async (where: { userId?: string; achievementId?: string }): Promise<DbUserAchievement | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).findOne(query);
      return stripId(doc) as DbUserAchievement | null;
    },

    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, any>): Promise<number> => {
      return this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).countDocuments(cleanWhere(where || {}));
    },
  };

  async transaction<T>(fn: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    const session = this.client.startSession();
    try {
      return await session.withTransaction(async () => {
        const txAdapter = new MongoDBAdapterForTransaction(this.client, this.dbName, session);
        return fn(txAdapter);
      });
    } finally {
      await session.endSession();
    }
  }
}

class MongoDBAdapterForTransaction extends MongoDBAdapter {
  private txSession: any;

  constructor(client: MongoClient, dbName: string, session: any) {
    // Call parent with a dummy connection string; we override client/dbName directly
    super('mongodb://localhost');
    this.client = client;
    this.dbName = dbName;
    this.txSession = session;
  }

  protected get txDb() {
    return this.client.db(this.dbName);
  }

  private getDb() {
    return this.txDb;
  }

  user = {
    ...(MongoDBAdapter.prototype.user as any),
    create: async (data: Partial<DbUser>): Promise<DbUser> => {
      const result = await this.getDb().collection<DbUser>(COLLECTIONS.users).insertOne(data as any, { session: this.txSession });
      return { ...data, id: result.insertedId.toString() } as DbUser;
    },
    findUnique: async (where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }): Promise<DbUser | null> => {
      const query = cleanWhere(where);
      if (query.id) { query._id = toObjectId(query.id); delete query.id; }
      const doc = await this.getDb().collection<DbUser>(COLLECTIONS.users).findOne(query, { session: this.txSession });
      return stripId(doc) as DbUser | null;
    },
    update: async (where: { id: string }, data: Partial<DbUser>): Promise<DbUser> => {
      const result = await this.getDb().collection<DbUser>(COLLECTIONS.users).findOneAndUpdate(
        { _id: toObjectId(where.id) }, { $set: data as any }, { returnDocument: 'after', session: this.txSession }
      );
      if (!result) throw new Error('User not found');
      return stripId(result) as DbUser;
    },
  };

  session = {
    ...(MongoDBAdapter.prototype.session as any),
    create: async (data: Partial<DbSession>): Promise<DbSession> => {
      const result = await this.getDb().collection<DbSession>(COLLECTIONS.sessions).insertOne(data as any, { session: this.txSession });
      return { ...data, id: result.insertedId.toString() } as DbSession;
    },
    findUnique: async (where: { token?: string; id?: string }, includeUser?: boolean): Promise<DbSession | SessionWithUser | null> => {
      const query = cleanWhere(where);
      if (query.id) { query._id = toObjectId(query.id); delete query.id; }
      const doc = await this.getDb().collection<DbSession>(COLLECTIONS.sessions).findOne(query, { session: this.txSession });
      if (!doc || !includeUser) return stripId(doc) as DbSession | null;
      const user = await this.getDb().collection<DbUser>(COLLECTIONS.users).findOne({ _id: toObjectId(doc.userId) }, { session: this.txSession });
      return { ...stripId(doc)!, user: stripId(user)! } as SessionWithUser;
    },
    update: async (where: { id: string }, data: Partial<DbSession>): Promise<DbSession> => {
      const result = await this.getDb().collection<DbSession>(COLLECTIONS.sessions).findOneAndUpdate(
        { _id: toObjectId(where.id) }, { $set: data }, { returnDocument: 'after', session: this.txSession }
      );
      if (!result) throw new Error('Session not found');
      return stripId(result) as DbSession;
    },
    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.getDb().collection<DbSession>(COLLECTIONS.sessions).deleteMany(cleanWhere(where), { session: this.txSession });
      return result.deletedCount;
    },
  };

  like = {
    ...(MongoDBAdapter.prototype.like as any),
    create: async (data: Partial<DbLike>): Promise<DbLike> => {
      const result = await this.getDb().collection<DbLike>(COLLECTIONS.likes).insertOne(data as any, { session: this.txSession });
      return { ...data, id: result.insertedId.toString() } as DbLike;
    },
    findUnique: async (where: { fromUserId?: string; toUserId?: string; id?: string }): Promise<DbLike | null> => {
      const query = cleanWhere(where);
      if (query.id) { query._id = toObjectId(query.id); delete query.id; }
      const doc = await this.getDb().collection<DbLike>(COLLECTIONS.likes).findOne(query, { session: this.txSession });
      return stripId(doc) as DbLike | null;
    },
    deleteMany: async (where: Record<string, any>): Promise<number> => {
      const result = await this.getDb().collection<DbLike>(COLLECTIONS.likes).deleteMany(cleanWhere(where), { session: this.txSession });
      return result.deletedCount;
    },
  };

  match = {
    ...(MongoDBAdapter.prototype.match as any),
    create: async (data: Partial<DbMatch>): Promise<DbMatch> => {
      const result = await this.getDb().collection<DbMatch>(COLLECTIONS.matches).insertOne(data as any, { session: this.txSession });
      return { ...data, id: result.insertedId.toString() } as DbMatch;
    },
    findFirst: async (where?: Record<string, any>): Promise<DbMatch | null> => {
      const doc = await this.getDb().collection<DbMatch>(COLLECTIONS.matches).findOne(cleanWhere(where || {}), { session: this.txSession });
      return stripId(doc) as DbMatch | null;
    },
  };

  rateLimit = {
    ...(MongoDBAdapter.prototype.rateLimit as any),
    findUnique: async (where: { key: string }): Promise<DbRateLimit | null> => {
      const doc = await this.getDb().collection<DbRateLimit>(COLLECTIONS.rateLimits).findOne({ key: where.key }, { session: this.txSession });
      return stripId(doc) as DbRateLimit | null;
    },
    create: async (data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
      const result = await this.getDb().collection<DbRateLimit>(COLLECTIONS.rateLimits).insertOne(data as any, { session: this.txSession });
      return { ...data, id: result.insertedId.toString() } as DbRateLimit;
    },
    update: async (where: { key: string }, data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
      const result = await this.getDb().collection<DbRateLimit>(COLLECTIONS.rateLimits).findOneAndUpdate(
        { key: where.key }, { $set: data }, { returnDocument: 'after', session: this.txSession }
      );
      if (!result) throw new Error('RateLimit not found');
      return stripId(result) as DbRateLimit;
    },
  };

  moment = {
    ...(MongoDBAdapter.prototype.moment as any),
    update: async (where: { id: string }, data: Partial<DbMoment>): Promise<DbMoment> => {
      const result = await this.getDb().collection<DbMoment>(COLLECTIONS.moments).findOneAndUpdate(
        { _id: toObjectId(where.id) }, { $set: data }, { returnDocument: 'after', session: this.txSession }
      );
      if (!result) throw new Error('Moment not found');
      return stripId(result) as DbMoment;
    },
  };

  momentReaction = {
    ...(MongoDBAdapter.prototype.momentReaction as any),
    findUnique: async (where: { momentId?: string; userId?: string; emoji?: string }): Promise<DbMomentReaction | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.getDb().collection<DbMomentReaction>(COLLECTIONS.momentReactions).findOne(query, { session: this.txSession });
      return stripId(doc) as DbMomentReaction | null;
    },
  };

  momentLike = {
    ...(MongoDBAdapter.prototype.momentLike as any),
    findUnique: async (where: { momentId?: string; userId?: string }): Promise<DbMomentLike | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.getDb().collection<DbMomentLike>(COLLECTIONS.momentLikes).findOne(query, { session: this.txSession });
      return stripId(doc) as DbMomentLike | null;
    },
  };

  userAchievement = {
    ...(MongoDBAdapter.prototype.userAchievement as any),
    findUnique: async (where: { userId?: string; achievementId?: string }): Promise<DbUserAchievement | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.getDb().collection<DbUserAchievement>(COLLECTIONS.userAchievements).findOne(query, { session: this.txSession });
      return stripId(doc) as DbUserAchievement | null;
    },
  };
}
