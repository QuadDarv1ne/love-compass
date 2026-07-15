const REQUIRED_PROD_VARS = [
  'SESSION_SECRET',
  'DATABASE_URL',
] as const;

const REQUIRED_PROD_IF_FEATURE = [
  { var: 'RESEND_API_KEY', feature: 'email notifications' },
  { var: 'RESEND_FROM_EMAIL', feature: 'email notifications' },
  { var: 'JWT_SECRET', feature: 'JWT tokens (2FA flow)' },
] as const;

export function validateEnv(): void {
  // Skip validation during Next.js build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (process.env.NODE_ENV !== 'production') return;

  const missing: string[] = [];
  for (const v of REQUIRED_PROD_VARS) {
    if (!process.env[v]) missing.push(v);
  }

  for (const { var: v, feature } of REQUIRED_PROD_IF_FEATURE) {
    if (process.env[v] && process.env[v] !== 'change-me-to-a-random-base64-secret') continue;
    if (process.env[v] === undefined) {
      console.warn(`[ENV] ${v} is not set — ${feature} will be unavailable`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }

  if (process.env.SESSION_SECRET === 'change-me-to-a-random-base64-secret' || process.env.JWT_SECRET === 'change-me-to-a-random-base64-secret') {
    throw new Error(
      'SESSION_SECRET and JWT_SECRET must be changed from default values in production'
    );
  }
}
