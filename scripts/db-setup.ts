#!/usr/bin/env bun

/**
 * DB-aware script dispatcher.
 * Routes database commands to the appropriate backend.
 * Usage: bun run scripts/db-setup.ts <command>
 * Commands: push, migrate, generate, reset, status
 */

import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

function loadEnvFile(): Map<string, string> {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return new Map();
  const content = readFileSync(envPath, 'utf-8');
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function detectDbType(): 'sqlite' | 'postgresql' | 'mongodb' {
  const env = loadEnvFile();
  const url = process.env.DATABASE_URL || env.get('DATABASE_URL') || '';

  if (url.startsWith('file:') || url.startsWith('sqlite:')) return 'sqlite';
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) return 'postgresql';
  if (url.startsWith('mongodb://') || url.startsWith('mongodb+srv://')) return 'mongodb';

  throw new Error('Cannot detect database type from DATABASE_URL');
}

function runPrisma(args: string[]): void {
  const env = loadEnvFile();
  const childEnv = { ...process.env };
  for (const [key, value] of env) {
    if (!childEnv[key]) childEnv[key] = value;
  }

  const result = spawnSync('npx', ['prisma', ...args], {
    cwd: rootDir,
    stdio: 'inherit',
    env: childEnv,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

async function handleMongoDBReset(): Promise<void> {
  const { MongoClient } = await import('mongodb');
  const env = loadEnvFile();
  const url = process.env.DATABASE_URL || env.get('DATABASE_URL') || '';

  if (!url) throw new Error('DATABASE_URL is not set');

  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('MongoDB: No collections to drop.');
      return;
    }

    const force = process.argv.includes('--force');
    if (!force) {
      console.log('\n⚠️  This will drop all collections in the MongoDB database.');
      console.log('   Use --force to skip confirmation.\n');
      process.exit(1);
    }

    for (const { name } of collections) {
      await db.collection(name).drop();
    }
    console.log(`MongoDB: Dropped ${collections.length} collections.`);
  } finally {
    await client.close();
  }
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.error('Usage: bun run scripts/db-setup.ts <command>');
    console.error('Commands: push, migrate, generate, reset, status');
    process.exit(1);
  }

  let dbType: 'sqlite' | 'postgresql' | 'mongodb';
  try {
    dbType = detectDbType();
  } catch (e) {
    console.error(`Error: ${e}`);
    process.exit(1);
  }

  console.log(`Database type: ${dbType}`);

  switch (command) {
    case 'generate':
      if (dbType === 'mongodb') {
        console.log('MongoDB: Native driver does not use Prisma. Skipping.');
        return;
      }
      runPrisma(['generate']);
      break;

    case 'push':
      if (dbType === 'mongodb') {
        console.log('MongoDB: Auto-creates collections on first write. No schema push needed.');
        return;
      }
      runPrisma(['db', 'push', '--accept-data-changes']);
      break;

    case 'migrate':
      if (dbType === 'mongodb') {
        console.log('MongoDB: Schemaless, no migrations needed.');
        return;
      }
      runPrisma(['migrate', 'dev']);
      break;

    case 'reset':
      if (dbType === 'mongodb') {
        await handleMongoDBReset();
        return;
      }
      runPrisma(['migrate', 'reset', '--force']);
      break;

    case 'status':
      if (dbType === 'mongodb') {
        console.log('MongoDB: Schemaless, no migration status.');
        return;
      }
      runPrisma(['migrate', 'status']);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Commands: push, migrate, generate, reset, status');
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
