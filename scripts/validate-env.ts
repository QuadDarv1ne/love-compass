/**
 * Validates environment variables at startup
 * Ensures all required env vars are present and valid
 */

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'RESEND_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

const errors: string[] = [];

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

// Validate DATABASE_URL format
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:') && !process.env.DATABASE_URL.startsWith('postgresql://')) {
  errors.push('DATABASE_URL must be a file: (SQLite) or postgresql:// URL');
}

// Validate NEXT_PUBLIC_APP_URL format
if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    new URL(process.env.NEXT_PUBLIC_APP_URL);
  } catch {
    errors.push('NEXT_PUBLIC_APP_URL must be a valid URL');
  }
}

if (errors.length > 0) {
  console.error('\n❌ Environment validation failed:');
  errors.forEach((err) => console.error(`  - ${err}`));
  console.error('\nPlease check your .env file and try again.\n');
  process.exit(1);
}

console.log('✓ Environment variables validated successfully');
