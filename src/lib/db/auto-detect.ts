import net from 'net';
import { DB } from '@/lib/constants';

export interface AvailableDBs {
  sqlite: boolean;
  postgresql: { available: boolean; host: string; port: number };
  mongodb: { available: boolean; host: string; port: number };
}

function checkPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });

    socket.connect(port, host);
  });
}

export async function checkPostgreSQL(host = 'localhost', port: number = DB.PG_PORT): Promise<boolean> {
  return checkPort(host, port);
}

export async function checkMongoDB(host = 'localhost', port: number = DB.MONGO_PORT): Promise<boolean> {
  return checkPort(host, port);
}

export async function checkSQLite(): Promise<boolean> {
  return true;
}

export async function detectAvailableDatabases(): Promise<AvailableDBs> {
  const pgHost = process.env.PG_HOST || 'localhost';
  const pgPort = parseInt(process.env.PG_PORT || String(DB.PG_PORT), 10);
  const mongoHost = process.env.MONGO_HOST || 'localhost';
  const mongoPort = parseInt(process.env.MONGO_PORT || String(DB.MONGO_PORT), 10);

  const [sqlite, postgresql, mongodb] = await Promise.all([
    checkSQLite(),
    checkPostgreSQL(pgHost, pgPort),
    checkMongoDB(mongoHost, mongoPort),
  ]);

  return {
    sqlite,
    postgresql: { available: postgresql, host: pgHost, port: pgPort },
    mongodb: { available: mongodb, host: mongoHost, port: mongoPort },
  };
}

export function recommendDatabase(
  available: AvailableDBs,
  isProduction = false
): { url: string; provider: string; reason: string } {
  const preference = process.env.DB_PREFERENCE?.toLowerCase();

  if (preference === 'postgresql' && available.postgresql.available) {
    const { host, port } = available.postgresql;
    return {
      url: `postgresql://postgres:postgres@${host}:${port}/love_compass`,
      provider: 'postgresql',
      reason: 'DB_PREFERENCE=postgresql and PostgreSQL is running',
    };
  }

  if (preference === 'mongodb' && available.mongodb.available) {
    const { host, port } = available.mongodb;
    return {
      url: `mongodb://${host}:${port}/love_compass`,
      provider: 'mongodb',
      reason: 'DB_PREFERENCE=mongodb and MongoDB is running',
    };
  }

  if (isProduction) {
    if (available.postgresql.available) {
      const { host, port } = available.postgresql;
      return {
        url: `postgresql://postgres:postgres@${host}:${port}/love_compass`,
        provider: 'postgresql',
        reason: 'PostgreSQL is recommended for production',
      };
    }
    if (available.mongodb.available) {
      const { host, port } = available.mongodb;
      return {
        url: `mongodb://${host}:${port}/love_compass`,
        provider: 'mongodb',
        reason: 'MongoDB is available and suitable for production',
      };
    }
  }

  return {
    url: 'file:./db/custom.db',
    provider: 'sqlite',
    reason: 'SQLite is always available and requires zero configuration',
  };
}
