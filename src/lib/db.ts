import { detectDbType, getOptimalPort, getDatabaseInfo } from './db/detect';
import { PrismaAdapter } from './db/prisma-adapter';
import { MongoDBAdapter } from './db/mongo-adapter';
import type { DatabaseAdapter, DbType } from './db/types';

export type { DbType };
export type {
  DatabaseAdapter,
  DbUser, DbSession, DbLike, DbMatch, DbMessage,
  DbBlock, DbReport, DbRateLimit, DbMoment, DbMomentComment,
  DbMomentReaction, DbMomentLike, DbUserAchievement,
  SessionWithUser,
} from './db/types';


let _adapter: DatabaseAdapter | null = null;

function createAdapter(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const dbType = detectDbType(databaseUrl);

  switch (dbType) {
    case 'sqlite':
    case 'postgresql':
      return new PrismaAdapter();
    case 'mongodb':
      return new MongoDBAdapter(databaseUrl);
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}

function getAdapter(): DatabaseAdapter {
  if (!_adapter) _adapter = createAdapter();
  return _adapter;
}

export const db: DatabaseAdapter = new Proxy({} as DatabaseAdapter, {
  get(_, prop, receiver) {
    return Reflect.get(getAdapter(), prop, receiver);
  },
});

export function getDbType(): DbType {
  return detectDbType(process.env.DATABASE_URL || '');
}

export const dbType: DbType = (() => {
  try {
    return detectDbType(process.env.DATABASE_URL || '');
  } catch {
    return 'sqlite' as DbType;
  }
})();

export async function getDbInfo() {
  return {
    type: dbType,
    ...getDatabaseInfo(dbType),
    port: await getOptimalPort(),
  };
}

export async function connectDb() {
  await db.connect();
}

export async function disconnectDb() {
  await db.disconnect();
}
