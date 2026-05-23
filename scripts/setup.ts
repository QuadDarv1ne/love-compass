#!/usr/bin/env bun

/**
 * Interactive setup wizard for Love Compass.
 * Detects available databases, finds free ports, generates/merges .env,
 * and initializes the database.
 *
 * Usage: bun run scripts/setup.ts [--no-interactive]
 */

import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { detectAvailableDatabases, recommendDatabase } from '@/lib/db/auto-detect';
import { ensureEnvFile, readEnvFile, parseEnvFile } from '@/lib/db/env-generator';
import { findFreePort } from '@/lib/db/port-detector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const noInteractive = process.argv.includes('--no-interactive') || process.env.CI === 'true';

function loadEnvFile(): Map<string, string> {
  const envPath = join(rootDir, '.env');
  return readEnvFile(envPath);
}

function printHeader() {
  console.log('\n Love Compass Setup');
  console.log('═'.repeat(60));
}

function printSection(title: string) {
  console.log(`\n${title}`);
  console.log('─'.repeat(60));
}

async function detectAndReport(): Promise<void> {
  printSection('🔍 Detecting system configuration...');

  const available = await detectAvailableDatabases();

  console.log(`\n SQLite:      ${available.sqlite ? 'Available (always)' : 'N/A'}`);
  console.log(` PostgreSQL:  ${available.postgresql.available ? `Running on ${available.postgresql.host}:${available.postgresql.port}` : 'Not detected'}`);
  console.log(` MongoDB:     ${available.mongodb.available ? `Running on ${available.mongodb.host}:${available.mongodb.port}` : 'Not detected'}`);

  const rec = recommendDatabase(available);
  console.log(`\n Recommended: ${rec.reason}`);
  console.log(`   URL:       ${rec.url}`);
  console.log(`   Provider:  ${rec.provider}`);
}

async function handleEnvFile(): Promise<void> {
  printSection('📝 Environment Configuration');

  const envPath = join(rootDir, '.env');
  const hasEnv = existsSync(envPath);

  if (!hasEnv) {
    console.log('\n No .env file found. Generating one with optimal configuration...');
    const result = await ensureEnvFile(envPath);
    console.log(` ✅ .env created at ${result.path}`);
    return;
  }

  const env = loadEnvFile();
  const hasDatabaseUrl = env.has('DATABASE_URL') && env.get('DATABASE_URL') !== '';
  const hasJwtSecret = env.has('JWT_SECRET') && env.get('JWT_SECRET') !== '';

  if (hasDatabaseUrl && hasJwtSecret) {
    console.log('\n ✅ .env exists and appears complete.');
    console.log(`   DATABASE_URL: ${env.get('DATABASE_URL')?.substring(0, 30)}...`);
    return;
  }

  console.log('\n ⚠️  .env exists but is incomplete.');
  console.log('   Merging missing values from defaults...');

  const result = await ensureEnvFile(envPath);

  if (result.merged) {
    console.log(' ✅ .env updated with missing values.');
  } else {
    console.log(' ✅ .env is already complete.');
  }
}

async function handlePrismaSchema(): Promise<void> {
  printSection('🗄️  Prisma Schema');

  const env = loadEnvFile();
  const provider = env.get('DB_PROVIDER') || 'sqlite';

  const schemaPath = join(rootDir, 'prisma', 'schema.prisma');
  if (!existsSync(schemaPath)) {
    console.log('\n ⚠️  prisma/schema.prisma not found. Skipping.');
    return;
  }

  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const hasEnvProvider = schemaContent.includes('provider = env("DB_PROVIDER")');

  if (!hasEnvProvider) {
    console.log('\n ⚠️  Schema has hardcoded provider. It should use env("DB_PROVIDER").');
    console.log('   The setup script already updated it, but please verify manually.');
    return;
  }

  console.log(`\n ✅ Schema uses env("DB_PROVIDER") — will use "${provider}" from .env`);
}

async function initializeDatabase(): Promise<void> {
  printSection('🚀 Initializing Database');

  const env = loadEnvFile();
  const url = env.get('DATABASE_URL') || '';
  const provider = env.get('DB_PROVIDER') || 'sqlite';

  const isMongo = url.startsWith('mongodb://') || url.startsWith('mongodb+srv://');

  if (isMongo) {
    console.log('\n MongoDB: Collections are auto-created on first write.');
    console.log(' ✅ No initialization needed.');
    return;
  }

  console.log(`\n Running Prisma generate (${provider})...`);
  const childEnv = { ...process.env };
  for (const [key, value] of env) {
    if (!childEnv[key]) childEnv[key] = value;
  }

  const genResult = spawnSync('npx', ['prisma', 'generate'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: childEnv,
  });

  if (genResult.status !== 0) {
    console.error('\n ❌ Prisma generate failed.');
    return;
  }

  console.log('\n Running Prisma db push...');
  const pushResult = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-changes'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: childEnv,
  });

  if (pushResult.status !== 0) {
    console.error('\n ❌ Prisma db push failed. You may need to run it manually.');
    return;
  }

  console.log('\n ✅ Database initialized successfully.');
}

async function printSummary(): Promise<void> {
  printSection('📊 Setup Summary');

  const env = loadEnvFile();
  const url = env.get('DATABASE_URL') || 'not set';
  const provider = env.get('DB_PROVIDER') || 'not set';
  const port = process.env.PORT || '3000';

  const dbType = url.startsWith('file:') || url.startsWith('sqlite:') ? 'SQLite'
    : url.startsWith('postgresql://') || url.startsWith('postgres://') ? 'PostgreSQL'
    : url.startsWith('mongodb://') || url.startsWith('mongodb+srv://') ? 'MongoDB'
    : 'Unknown';

  console.log(`\n Database:    ${dbType} (${url.substring(0, 40)}...)`);
  console.log(` Provider:    ${provider}`);
  console.log(` Port:        ${port}`);
  console.log(` .env file:   ${existsSync(join(rootDir, '.env')) ? 'Configured' : 'Missing'}`);

  console.log('\n Next steps:');
  console.log('   bun run dev        - Start development server');
  console.log('   bun run dev:auto   - Start on auto-detected free port');
  console.log('   bun run seed       - Seed database with sample data');
  console.log('═'.repeat(60) + '\n');
}

async function main() {
  printHeader();

  await detectAndReport();
  await handleEnvFile();
  await handlePrismaSchema();
  await initializeDatabase();
  await printSummary();
}

main().catch((e) => {
  console.error(`\n❌ Setup failed: ${e}`);
  process.exit(1);
});
