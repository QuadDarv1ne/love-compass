import { createHash, randomBytes } from 'crypto';

export function generateRandomToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export { getClientIp } from '@/lib/ip';
