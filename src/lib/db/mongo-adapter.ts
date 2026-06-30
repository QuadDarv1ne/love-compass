import { MongoClient, ObjectId, ClientSession, type Document, type OptionalId } from 'mongodb';
import { appLogger } from '@/lib/logger';
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
  dislikes: 'dislikes',
} as const;

function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    appLogger.error('MongoDB', 'Invalid ObjectId', `Value "${id}" is not a valid 24-character hex string or 12-byte binary`);
    throw new Error(`Invalid MongoDB ObjectId: "${id}"`);
  }
}

function stripId(doc: Document | null): Omit<Document, '_id'> & { id: string } | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function stripMany<T extends Document>(docs: T[]): (Omit<T, '_id'> & { id: string })[] {
  return docs.map(d => {
    const { _id, ...rest } = d;
    return { id: (_id as ObjectId).toString(), ...rest } as Omit<T, '_id'> & { id: string };
  });
}

function cleanWhere(where: Record<string, unknown> = {}): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function parseAtomicOp(data: Record<string, unknown>): { $set: Record<string, unknown>; $inc: Record<string, number> } {
  const $set: Record<string, unknown> = {};
  const $inc: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in (value as Record<string, unknown>)) {
      $inc[key] = (value as Record<string, number>).increment!;
    } else if (value && typeof value === 'object' && 'decrement' in (value as Record<string, unknown>)) {
      $inc[key] = -(value as Record<string, number>).decrement!;
    } else {
      $set[key] = value;
    }
  }
  return { $set, $inc };
}

function mongoOrder(orderBy?: Record<string, 'asc' | 'desc'>): Record<string, 1 | -1> | undefined {
  if (!orderBy) return undefined;
  const result: Record<string, 1 | -1> = {};
  for (const [key, value] of Object.entries(orderBy)) {
    result[key] = value === 'desc' ? -1 : 1;
  }
  return result;
}

function toInsertDoc<T>(data: Partial<T>): OptionalId<T> {
  return data as unknown as OptionalId<T>;
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
    } catch (error) {
      // Already connected — safe to ignore
      if (error instanceof Error && !error.message.includes('already connected')) {
        appLogger.error('MongoDB', 'Connection error', error.message);
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  user = {
    create: async (data: Partial<DbUser>): Promise<DbUser> => {
      const result = await this.db.collection<DbUser>(COLLECTIONS.users).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbUser;
    },

    findUnique: async (where: { id?: string; email?: string; emailVerificationToken?: string; passwordResetToken?: string }): Promise<DbUser | null> => {
      const query = cleanWhere(where);
      if (query.id && typeof query.id === 'string') {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbUser>(COLLECTIONS.users).findOne(query);
      return stripId(doc) as DbUser | null;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'>; select?: Record<string, boolean>; cursor?: { id: string } }): Promise<(Omit<DbUser, '_id'> & { id: string })[]> => {
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
        { $set: toInsertDoc(data) },
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

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbUser>(COLLECTIONS.users).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean>; _sum?: Record<string, boolean>; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<Document[]> => {
      const pipeline: Document[] = [];
      if (params.where) {
        pipeline.push({ $match: cleanWhere(params.where) });
      }

      const groupKey: Record<string, unknown> = {};
      for (const field of params.by) {
        groupKey[field] = `$${field}`;
      }
      const groupStage: Record<string, unknown> = { _id: groupKey };
      if (params._count) {
        groupStage._count = { $sum: 1 };
      }
      if (params._sum) {
        for (const field of Object.keys(params._sum)) {
          groupStage[`_sum_${field}`] = { $sum: `$${field}` };
        }
      }

      pipeline.push({ $group: groupStage });

      if (params.orderBy) {
        const sort: Record<string, 1 | -1> = {};
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
      const result = await this.db.collection<DbSession>(COLLECTIONS.sessions).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbSession;
    },

    findUnique: async (where: { token?: string; id?: string }, includeUser?: boolean): Promise<DbSession | SessionWithUser | null> => {
      const query = cleanWhere(where);
      if (query.id && typeof query.id === 'string') {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbSession>(COLLECTIONS.sessions).findOne(query);
      if (!doc || !includeUser) return stripId(doc) as DbSession | null;

      const user = await this.db.collection<DbUser>(COLLECTIONS.users).findOne({ _id: toObjectId(doc.userId) });
      if (!user) throw new Error('Session references deleted user');
      return { ...stripId(doc), user: stripId(user) } as SessionWithUser;
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
      const query = cleanWhere(where);
      if (query.id && typeof query.id === 'string') {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      await this.db.collection<DbSession>(COLLECTIONS.sessions).deleteOne(query);
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbSession>(COLLECTIONS.sessions).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  like = {
    create: async (data: Partial<DbLike>): Promise<DbLike> => {
      const result = await this.db.collection<DbLike>(COLLECTIONS.likes).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbLike;
    },

    findUnique: async (where: { fromUserId?: string; toUserId?: string; id?: string }): Promise<DbLike | null> => {
      const query = cleanWhere(where);
      if (query.id && typeof query.id === 'string') {
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

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<DbLike[]> => {
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

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbLike>(COLLECTIONS.likes).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbLike>(COLLECTIONS.likes).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<Document[]> => {
      const pipeline: Document[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const groupKey: Record<string, unknown> = {};
      for (const field of params.by) groupKey[field] = `$${field}`;
      const groupStage: Record<string, unknown> = { _id: groupKey };
      if (params._count) {
        const countFields: Record<string, unknown> = {};
        for (const field of Object.keys(params._count)) countFields[field] = { $sum: 1 };
        groupStage._count = countFields;
      }
      pipeline.push({ $group: groupStage });
      return this.db.collection(COLLECTIONS.likes).aggregate(pipeline).toArray();
    },
  };

  match = {
    create: async (data: Partial<DbMatch>): Promise<DbMatch> => {
      const result = await this.db.collection<DbMatch>(COLLECTIONS.matches).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMatch;
    },

    findUnique: async (where: { user1Id?: string; user2Id?: string; id?: string }): Promise<DbMatch | null> => {
      const query = cleanWhere(where);
      if (query.id && typeof query.id === 'string') {
        query._id = toObjectId(query.id);
        delete query.id;
      }
      const doc = await this.db.collection<DbMatch>(COLLECTIONS.matches).findOne(query);
      return stripId(doc) as DbMatch | null;
    },

    findFirst: async (where?: Record<string, unknown>): Promise<DbMatch | null> => {
      const doc = await this.db.collection<DbMatch>(COLLECTIONS.matches).findOne(cleanWhere(where || {}));
      return stripId(doc) as DbMatch | null;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'>; includeLastMessage?: boolean }): Promise<(Omit<DbMatch, '_id'> & { id: string })[]> => {
      let pipeline: Document[] = [{ $match: cleanWhere(where || {}) }];

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

      const docs = await cursor.toArray() as DbMatch[];
      return stripMany(docs);
    },

    delete: async (where: { id: string }): Promise<void> => {
      await this.db.collection<DbMatch>(COLLECTIONS.matches).deleteOne({ _id: toObjectId(where.id) });
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMatch>(COLLECTIONS.matches).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbMatch>(COLLECTIONS.matches).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<Document[]> => {
      const pipeline: Document[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const groupKey: Record<string, unknown> = {};
      for (const field of params.by) groupKey[field] = `$${field}`;
      const groupStage: Record<string, unknown> = { _id: groupKey };
      if (params._count) {
        const countFields: Record<string, unknown> = {};
        for (const field of Object.keys(params._count)) countFields[field] = { $sum: 1 };
        groupStage._count = countFields;
      }
      pipeline.push({ $group: groupStage });
      return this.db.collection(COLLECTIONS.matches).aggregate(pipeline).toArray();
    },
  };

  message = {
    create: async (data: Partial<DbMessage>): Promise<DbMessage> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMessage;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'>; cursor?: Record<string, unknown> }): Promise<DbMessage[]> => {
      const filter = cleanWhere(where || {});
      if (options?.cursor?.id && options.skip) {
        filter._id = { $gt: toObjectId(options.cursor.id as string) };
      }
      const cursor = this.db.collection<DbMessage>(COLLECTIONS.messages)
        .find(filter)
        .skip(options?.skip || 0)
        .limit(options?.take || 0);

      if (options?.orderBy) {
        const s = mongoOrder(options.orderBy); if (s) cursor.sort(s);
      }

      const docs = await cursor.toArray();
      return stripMany(docs);
    },

    findFirst: async (where?: Record<string, unknown>, options?: { orderBy?: Record<string, 'asc' | 'desc'> }): Promise<DbMessage | null> => {
      const query = cleanWhere(where || {});
      const cursor = this.db.collection<DbMessage>(COLLECTIONS.messages).findOne(query);

      if (options?.orderBy) {
        return this.db.collection<DbMessage>(COLLECTIONS.messages).findOne(query, { sort: mongoOrder(options.orderBy) }) as Promise<DbMessage | null>;
      }

      const doc = await cursor;
      return stripId(doc) as DbMessage | null;
    },

    updateMany: async (where: Record<string, unknown>, data: Partial<DbMessage>): Promise<number> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).updateMany(cleanWhere(where), { $set: data });
      return result.modifiedCount;
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMessage>(COLLECTIONS.messages).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbMessage>(COLLECTIONS.messages).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<Document[]> => {
      const pipeline: Document[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const groupKey: Record<string, unknown> = {};
      for (const field of params.by) groupKey[field] = `$${field}`;
      const groupStage: Record<string, unknown> = { _id: groupKey };
      if (params._count) {
        const countFields: Record<string, unknown> = {};
        for (const field of Object.keys(params._count)) countFields[field] = { $sum: 1 };
        groupStage._count = countFields;
      }
      pipeline.push({ $group: groupStage });
      return this.db.collection(COLLECTIONS.messages).aggregate(pipeline).toArray();
    },
  };

  block = {
    create: async (data: Partial<DbBlock>): Promise<DbBlock> => {
      const result = await this.db.collection<DbBlock>(COLLECTIONS.blocks).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbBlock;
    },

    findUnique: async (where: { blockerId?: string; blockedId?: string }): Promise<DbBlock | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbBlock>(COLLECTIONS.blocks).findOne(query);
      return stripId(doc) as DbBlock | null;
    },

    findFirst: async (where?: Record<string, unknown>): Promise<DbBlock | null> => {
      const doc = await this.db.collection<DbBlock>(COLLECTIONS.blocks).findOne(cleanWhere(where || {}));
      return stripId(doc) as DbBlock | null;
    },

    findMany: async (where?: Record<string, unknown>): Promise<DbBlock[]> => {
      const docs = await this.db.collection<DbBlock>(COLLECTIONS.blocks).find(cleanWhere(where || {})).toArray();
      return stripMany(docs);
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbBlock>(COLLECTIONS.blocks).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbBlock>(COLLECTIONS.blocks).countDocuments(cleanWhere(where || {}));
    },
  };

  report = {
    create: async (data: Partial<DbReport>): Promise<DbReport> => {
      const result = await this.db.collection<DbReport>(COLLECTIONS.reports).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbReport;
    },

    findMany: async (where?: Record<string, unknown>): Promise<DbReport[]> => {
      return this.db.collection<DbReport>(COLLECTIONS.reports).find(cleanWhere(where || {})).toArray();
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbReport>(COLLECTIONS.reports).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbReport>(COLLECTIONS.reports).countDocuments(cleanWhere(where || {}));
    },
  };

  rateLimit = {
    findUnique: async (where: { key: string }): Promise<DbRateLimit | null> => {
      const doc = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).findOne({ key: where.key });
      return stripId(doc) as DbRateLimit | null;
    },

    create: async (data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
      const result = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).insertOne(toInsertDoc(data));
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

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbRateLimit>(COLLECTIONS.rateLimits).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  moment = {
    create: async (data: Partial<DbMoment>): Promise<DbMoment> => {
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMoment;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<DbMoment[]> => {
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

    update: async (where: { id: string }, data: Partial<DbMoment> | Record<string, unknown>): Promise<DbMoment> => {
      const { $set, $inc } = parseAtomicOp(data as Record<string, unknown>);
      const updateDoc: Record<string, unknown> = {};
      if (Object.keys($set).length > 0) updateDoc.$set = $set;
      if (Object.keys($inc).length > 0) updateDoc.$inc = $inc;
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).findOneAndUpdate(
        { _id: toObjectId(where.id) },
        updateDoc,
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Moment not found');
      return stripId(result) as DbMoment;
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMoment>(COLLECTIONS.moments).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbMoment>(COLLECTIONS.moments).countDocuments(cleanWhere(where || {}));
    },

    groupBy: async (params: { by: string[]; where?: Record<string, unknown>; _count?: Record<string, boolean> }): Promise<Document[]> => {
      const pipeline: Document[] = [];
      if (params.where) pipeline.push({ $match: cleanWhere(params.where) });
      const groupKey: Record<string, unknown> = {};
      for (const field of params.by) groupKey[field] = `$${field}`;
      const groupStage: Record<string, unknown> = { _id: groupKey };
      if (params._count) {
        const countFields: Record<string, unknown> = {};
        for (const field of Object.keys(params._count)) countFields[field] = { $sum: 1 };
        groupStage._count = countFields;
      }
      pipeline.push({ $group: groupStage });
      return this.db.collection(COLLECTIONS.moments).aggregate(pipeline).toArray();
    },
  };

  momentComment = {
    create: async (data: Partial<DbMomentComment>): Promise<DbMomentComment> => {
      const result = await this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMomentComment;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<DbMomentComment[]> => {
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

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbMomentComment>(COLLECTIONS.momentComments).countDocuments(cleanWhere(where || {}));
    },
  };

  momentReaction = {
    create: async (data: Partial<DbMomentReaction>): Promise<DbMomentReaction> => {
      const result = await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMomentReaction;
    },

    findMany: async (where?: Record<string, unknown>, options?: { skip?: number; take?: number; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<DbMomentReaction[]> => {
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

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).countDocuments(cleanWhere(where || {}));
    },
  };

  momentLike = {
    create: async (data: Partial<DbMomentLike>): Promise<DbMomentLike> => {
      const result = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbMomentLike;
    },

    findMany: async (where?: Record<string, unknown>): Promise<DbMomentLike[]> => {
      const docs = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).find(cleanWhere(where ?? {})).toArray();
      return docs.map((d) => stripId(d)) as DbMomentLike[];
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

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbMomentLike>(COLLECTIONS.momentLikes).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },
  };

  userAchievement = {
    create: async (data: Partial<DbUserAchievement>): Promise<DbUserAchievement> => {
      const result = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbUserAchievement;
    },

    findMany: async (where?: Record<string, unknown>): Promise<DbUserAchievement[]> => {
      const docs = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).find(cleanWhere(where || {})).toArray();
      return stripMany(docs);
    },

    findUnique: async (where: { userId?: string; achievementId?: string }): Promise<DbUserAchievement | null> => {
      const query = cleanWhere(where);
      if (Object.keys(query).length === 0) return null;
      const doc = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).findOne(query);
      return stripId(doc) as DbUserAchievement | null;
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).deleteMany(cleanWhere(where));
      return result.deletedCount;
    },

    count: async (where?: Record<string, unknown>): Promise<number> => {
      return this.db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).countDocuments(cleanWhere(where || {}));
    },
  };

  dislike = {
    create: async (data: Partial<DbDislike>): Promise<DbDislike> => {
      const result = await this.db.collection(COLLECTIONS.dislikes).insertOne(toInsertDoc(data));
      return { ...data, id: result.insertedId.toString() } as DbDislike;
    },

    findFirst: async (where?: Record<string, unknown>): Promise<DbDislike | null> => {
      const doc = await this.db.collection(COLLECTIONS.dislikes).findOne(cleanWhere(where || {}));
      return stripId(doc) as DbDislike | null;
    },

    findMany: async (where?: Record<string, unknown>): Promise<DbDislike[]> => {
      const docs = await this.db.collection(COLLECTIONS.dislikes).find(cleanWhere(where || {})).toArray();
      return stripMany(docs) as DbDislike[];
    },

    deleteMany: async (where: Record<string, unknown>): Promise<number> => {
      const result = await this.db.collection(COLLECTIONS.dislikes).deleteMany(cleanWhere(where));
      return result.deletedCount;
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
  private txSession: ClientSession;
  private _client: MongoClient;
  private _dbName: string;

  constructor(client: MongoClient, dbName: string, session: ClientSession) {
    super('mongodb://localhost');

    this.user = {
      ...this.user,
      create: async (data: Partial<DbUser>): Promise<DbUser> => {
        const result = await this._db.collection<DbUser>(COLLECTIONS.users).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbUser;
      },
      findUnique: async (where: Parameters<MongoDBAdapter['user']['findUnique']>[0]): Promise<DbUser | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (query.id && typeof query.id === 'string') { query._id = toObjectId(query.id); delete query.id; }
        const doc = await this._db.collection<DbUser>(COLLECTIONS.users).findOne(query, { session: this.txSession });
        return stripId(doc) as DbUser | null;
      },
      update: async (where: { id: string }, data: Partial<DbUser>): Promise<DbUser> => {
        const result = await this._db.collection<DbUser>(COLLECTIONS.users).findOneAndUpdate(
          { _id: toObjectId(where.id) }, { $set: toInsertDoc(data) }, { returnDocument: 'after', session: this.txSession }
        );
        if (!result) throw new Error('User not found');
        return stripId(result) as DbUser;
      },
    };

    this.session = {
      ...this.session,
      create: async (data: Partial<DbSession>): Promise<DbSession> => {
        const result = await this._db.collection<DbSession>(COLLECTIONS.sessions).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbSession;
      },
      findUnique: async (where: { token?: string; id?: string }, includeUser?: boolean): Promise<DbSession | SessionWithUser | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (query.id && typeof query.id === 'string') { query._id = toObjectId(query.id); delete query.id; }
        const doc = await this._db.collection<DbSession>(COLLECTIONS.sessions).findOne(query, { session: this.txSession });
        if (!doc || !includeUser) return stripId(doc) as DbSession | null;
        const user = await this._db.collection<DbUser>(COLLECTIONS.users).findOne({ _id: toObjectId(doc.userId) }, { session: this.txSession });
        if (!user) throw new Error('Session references deleted user');
        return { ...stripId(doc), user: stripId(user) } as SessionWithUser;
      },
      update: async (where: { id: string }, data: Partial<DbSession>): Promise<DbSession> => {
        const result = await this._db.collection<DbSession>(COLLECTIONS.sessions).findOneAndUpdate(
          { _id: toObjectId(where.id) }, { $set: data }, { returnDocument: 'after', session: this.txSession }
        );
        if (!result) throw new Error('Session not found');
        return stripId(result) as DbSession;
      },
      deleteMany: async (where: Record<string, unknown>): Promise<number> => {
        const result = await this._db.collection<DbSession>(COLLECTIONS.sessions).deleteMany(cleanWhere(where), { session: this.txSession });
        return result.deletedCount;
      },
    };

    this.like = {
      ...this.like,
      create: async (data: Partial<DbLike>): Promise<DbLike> => {
        const result = await this._db.collection<DbLike>(COLLECTIONS.likes).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbLike;
      },
      findUnique: async (where: { fromUserId?: string; toUserId?: string; id?: string }): Promise<DbLike | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (query.id && typeof query.id === 'string') { query._id = toObjectId(query.id); delete query.id; }
        const doc = await this._db.collection<DbLike>(COLLECTIONS.likes).findOne(query, { session: this.txSession });
        return stripId(doc) as DbLike | null;
      },
      deleteMany: async (where: Record<string, unknown>): Promise<number> => {
        const result = await this._db.collection<DbLike>(COLLECTIONS.likes).deleteMany(cleanWhere(where), { session: this.txSession });
        return result.deletedCount;
      },
    };

    this.match = {
      ...this.match,
      create: async (data: Partial<DbMatch>): Promise<DbMatch> => {
        const result = await this._db.collection<DbMatch>(COLLECTIONS.matches).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbMatch;
      },
      findFirst: async (where?: Record<string, unknown>): Promise<DbMatch | null> => {
        const doc = await this._db.collection<DbMatch>(COLLECTIONS.matches).findOne(cleanWhere(where || {}), { session: this.txSession });
        return stripId(doc) as DbMatch | null;
      },
    };

    this.rateLimit = {
      ...this.rateLimit,
      findUnique: async (where: { key: string }): Promise<DbRateLimit | null> => {
        const doc = await this._db.collection<DbRateLimit>(COLLECTIONS.rateLimits).findOne({ key: where.key }, { session: this.txSession });
        return stripId(doc) as DbRateLimit | null;
      },
      create: async (data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
        const result = await this._db.collection<DbRateLimit>(COLLECTIONS.rateLimits).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbRateLimit;
      },
      update: async (where: { key: string }, data: Partial<DbRateLimit>): Promise<DbRateLimit> => {
        const result = await this._db.collection<DbRateLimit>(COLLECTIONS.rateLimits).findOneAndUpdate(
          { key: where.key }, { $set: data }, { returnDocument: 'after', session: this.txSession }
        );
        if (!result) throw new Error('RateLimit not found');
        return stripId(result) as DbRateLimit;
      },
    };

    this.moment = {
      ...this.moment,
      update: async (where: { id: string }, data: Partial<DbMoment> | Record<string, unknown>): Promise<DbMoment> => {
        const { $set, $inc } = parseAtomicOp(data as Record<string, unknown>);
        const updateDoc: Record<string, unknown> = {};
        if (Object.keys($set).length > 0) updateDoc.$set = $set;
        if (Object.keys($inc).length > 0) updateDoc.$inc = $inc;
        const result = await this._db.collection<DbMoment>(COLLECTIONS.moments).findOneAndUpdate(
          { _id: toObjectId(where.id) }, updateDoc, { returnDocument: 'after', session: this.txSession }
        );
        if (!result) throw new Error('Moment not found');
        return stripId(result) as DbMoment;
      },
    };

    this.momentReaction = {
      ...this.momentReaction,
      create: async (data: Partial<DbMomentReaction>): Promise<DbMomentReaction> => {
        const result = await this._db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbMomentReaction;
      },
      findUnique: async (where: { momentId?: string; userId?: string; emoji?: string }): Promise<DbMomentReaction | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (Object.keys(query).length === 0) return null;
        const doc = await this._db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).findOne(query, { session: this.txSession });
        return stripId(doc) as DbMomentReaction | null;
      },
      delete: async (where: { id: string }): Promise<void> => {
        await this._db.collection<DbMomentReaction>(COLLECTIONS.momentReactions).deleteOne({ _id: toObjectId(where.id) }, { session: this.txSession });
      },
    };

    this.momentLike = {
      ...this.momentLike,
      create: async (data: Partial<DbMomentLike>): Promise<DbMomentLike> => {
        const result = await this._db.collection<DbMomentLike>(COLLECTIONS.momentLikes).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbMomentLike;
      },
      findMany: async (where?: Record<string, unknown>): Promise<DbMomentLike[]> => {
        const docs = await this._db.collection<DbMomentLike>(COLLECTIONS.momentLikes).find(cleanWhere(where ?? {})).toArray();
        return docs.map((d) => stripId(d)) as DbMomentLike[];
      },
      findUnique: async (where: { momentId?: string; userId?: string }): Promise<DbMomentLike | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (Object.keys(query).length === 0) return null;
        const doc = await this._db.collection<DbMomentLike>(COLLECTIONS.momentLikes).findOne(query, { session: this.txSession });
        return stripId(doc) as DbMomentLike | null;
      },
      delete: async (where: { id: string }): Promise<void> => {
        await this._db.collection<DbMomentLike>(COLLECTIONS.momentLikes).deleteOne({ _id: toObjectId(where.id) }, { session: this.txSession });
      },
    };

    this.message = {
      ...this.message,
      create: async (data: Partial<DbMessage>): Promise<DbMessage> => {
        const result = await this._db.collection<DbMessage>(COLLECTIONS.messages).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbMessage;
      },
    };

    this.block = {
      ...this.block,
      create: async (data: Partial<DbBlock>): Promise<DbBlock> => {
        const result = await this._db.collection<DbBlock>(COLLECTIONS.blocks).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbBlock;
      },
    };

    this.report = {
      ...this.report,
      create: async (data: Partial<DbReport>): Promise<DbReport> => {
        const result = await this._db.collection<DbReport>(COLLECTIONS.reports).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbReport;
      },
    };

    this.momentComment = {
      ...this.momentComment,
      create: async (data: Partial<DbMomentComment>): Promise<DbMomentComment> => {
        const result = await this._db.collection<DbMomentComment>(COLLECTIONS.momentComments).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbMomentComment;
      },
    };

    this.userAchievement = {
      ...this.userAchievement,
      create: async (data: Partial<DbUserAchievement>): Promise<DbUserAchievement> => {
        const result = await this._db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).insertOne(toInsertDoc(data), { session: this.txSession });
        return { ...data, id: result.insertedId.toString() } as DbUserAchievement;
      },
      findUnique: async (where: { userId?: string; achievementId?: string }): Promise<DbUserAchievement | null> => {
        const query = cleanWhere(where as Record<string, unknown>);
        if (Object.keys(query).length === 0) return null;
        const doc = await this._db.collection<DbUserAchievement>(COLLECTIONS.userAchievements).findOne(query, { session: this.txSession });
        return stripId(doc) as DbUserAchievement | null;
      },
    };

    this.dislike = {
      ...this.dislike,
    };

    this._client = client;
    this._dbName = dbName;
    this.txSession = session;
  }

  private get _db() {
    return this._client.db(this._dbName);
  }
}
