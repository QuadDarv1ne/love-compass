import { createHash, randomBytes } from 'crypto';

export function generateRandomToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function isValidIP(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }
  if (IPV6_REGEX.test(ip)) {
    return true;
  }
  return false;
}

/**
 * Extract the client IP from request headers.
 * Takes the first valid IP from x-forwarded-for to prevent spoofing.
 * Falls back to '127.0.0.1' for local development instead of 'unknown'.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIP = forwarded.split(',')[0]!.trim();
    if (isValidIP(firstIP)) {
      return firstIP;
    }
  }
  // For local development or direct connections
  return '127.0.0.1';
}
