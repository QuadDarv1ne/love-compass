/**
 * Validates environment variables at startup
 * Ensures all required env vars are present and valid
 */

import { existsSync } from 'fs';

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

const errors: string[] = [];
const warnings: string[] = [];

// Check if .env file exists
if (!existsSync('.env')) {
  console.error('\n⚠️  No .env file found.');
  console.error('   Run `bun run setup` to auto-generate one with optimal configuration.\n');
  process.exit(1);
}

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value) {
    errors.push(`Missing required env var: ${envVar}`);
  }
}

// Validate JWT_SECRET is not the default placeholder
if (process.env.JWT_SECRET === 'change-me-to-a-random-secure-value-before-deployment') {
  errors.push('JWT_SECRET is set to default placeholder. Generate a secure random value.');
}

// Validate DATABASE_URL format (supports SQLite, PostgreSQL, MongoDB)
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const isValidFormat =
    url.startsWith('file:') ||
    url.startsWith('sqlite:') ||
    url.startsWith('postgresql://') ||
    url.startsWith('postgres://') ||
    url.startsWith('mongodb://') ||
    url.startsWith('mongodb+srv://');

  if (!isValidFormat) {
    errors.push(
      'DATABASE_URL must be a valid database URL:\n' +
      '  SQLite:     file:./path/to/db.db\n' +
      '  PostgreSQL: postgresql://user:pass@host/dbname\n' +
      '  MongoDB:    mongodb://host/dbname or mongodb+srv://host/dbname'
    );
  }
}

// Validate DB_PROVIDER for Prisma databases (SQLite, PostgreSQL)
// Auto-infer from DATABASE_URL if not set
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const needsProvider =
    url.startsWith('file:') ||
    url.startsWith('sqlite:') ||
    url.startsWith('postgresql://') ||
    url.startsWith('postgres://');

  if (needsProvider && !process.env.DB_PROVIDER) {
    const inferred = url.startsWith('file:') || url.startsWith('sqlite:') ? 'sqlite' : 'postgresql';
    process.env.DB_PROVIDER = inferred;
    warnings.push(`DB_PROVIDER not set, inferred as "${inferred}" from DATABASE_URL`);
  }

  if (needsProvider && process.env.DB_PROVIDER && !['sqlite', 'postgresql'].includes(process.env.DB_PROVIDER)) {
    errors.push('DB_PROVIDER must be "sqlite" or "postgresql" for Prisma databases');
  }
}

// Validate NEXT_PUBLIC_APP_URL format
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    new URL(process.env.NEXT_PUBLIC_APP_URL);
  } catch {
    errors.push('NEXT_PUBLIC_APP_URL must be a valid URL');
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach((w) => console.log(`   - ${w}`));
}

if (errors.length > 0) {
  console.error('\n❌ Environment validation failed:');
  errors.forEach((err) => console.error(`  - ${err}`));
  console.error('\nPlease check your .env file and try again.');
  console.error('Or run `bun run setup` for automatic configuration.\n');
  process.exit(1);
}

console.log('✓ Environment variables validated successfully');
