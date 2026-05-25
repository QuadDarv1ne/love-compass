import { detectDbType, getOptimalPort, getDatabaseInfo } from './db/detect';
import { PrismaAdapter, profileSelect } from './db/prisma-adapter';
import { MongoDBAdapter } from './db/mongo-adapter';
import type { DatabaseAdapter, DbType } from './db/types';

export type { DbType };
export type {
  DatabaseAdapter,
  DbUser, DbSession, DbLike, DbMatch, DbMessage,
  DbBlock, DbReport, DbRateLimit, DbMoment, DbMomentComment,
  DbMomentReaction, DbMomentLike, DbUserAchievement,
  SessionWithUser, ProfileSelect,
} from './db/types';

export { profileSelect };

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

export const db: DatabaseAdapter = createAdapter();

export const dbType = db.dbType;

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

process.on('beforeExit', async () => {
  await disconnectDb();
});

process.on('SIGTERM', async () => {
  await disconnectDb();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await disconnectDb();
  process.exit(0);
});
