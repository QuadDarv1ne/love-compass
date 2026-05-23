import { DbType } from './types';
import { getOptimalPort as _getOptimalPort } from './port-detector';

export function detectDbType(url: string): DbType {
  if (!url) throw new Error('DATABASE_URL is not set');

  const trimmed = url.trim();

  if (trimmed.startsWith('file:') || trimmed.startsWith('sqlite:')) {
    return 'sqlite';
  }
  if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
    return 'postgresql';
  }
  if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
    return 'mongodb';
  }

  throw new Error(
    `Unknown DATABASE_URL format: "${trimmed.substring(0, 20)}...". ` +
    `Supported formats: file:./path.db (SQLite), postgresql://user:pass@host/db (PostgreSQL), mongodb://host/db (MongoDB)`
  );
}

export async function getOptimalPort(): Promise<number> {
  return _getOptimalPort();
}

export function getDatabaseInfo(dbType: DbType): { name: string; deployTarget: string; note: string } {
  const info = {
    sqlite: {
      name: 'SQLite',
      deployTarget: 'VPS, local development, Docker',
      note: 'File-based database, not suitable for serverless platforms',
    },
    postgresql: {
      name: 'PostgreSQL',
      deployTarget: 'Vercel, Railway, Neon, Supabase, any cloud platform',
      note: 'Recommended for production deployment',
    },
    mongodb: {
      name: 'MongoDB',
      deployTarget: 'Vercel, MongoDB Atlas, Railway, any cloud platform',
      note: 'Document-based database, great for horizontal scaling',
    },
  };
  return info[dbType];
}
