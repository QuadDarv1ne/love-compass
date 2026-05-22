import { createHash, randomBytes } from 'crypto';

export function generateRandomToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Extract the client IP from request headers.
 * Takes the first IP from x-forwarded-for to prevent spoofing.
 * Falls back to '127.0.0.1' for local development instead of 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // For local development or direct connections
  return '127.0.0.1';
}
