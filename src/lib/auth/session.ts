import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Edge-compatible session cookie utilities.
 * DB-dependent functions (createSession, validateSessionToken, etc.)
 * are exported from '@/lib/auth/session/server' to avoid pulling
 * Node.js modules into the Edge Runtime middleware.
 *
 * The session token is HMAC-signed before being stored in the cookie.
 * This prevents token forgery even if an attacker can write arbitrary
 * cookie values (defense in depth beyond httpOnly).
 */

function getSessionSigningKey(): string {
  const key = process.env.SESSION_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    return 'dev-secret-change-in-production';
  }
  if (key === 'change-me-to-a-random-base64-secret' && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be changed from the default value in production');
  }
  return key;
}

function signToken(token: string): string {
  const hmac = createHmac('sha256', getSessionSigningKey()).update(token).digest('hex');
  return `${token}.${hmac}`;
}

function verifySignedToken(signed: string): string | null {
  const dotIndex = signed.lastIndexOf('.');
  if (dotIndex === -1) return null;
  const token = signed.slice(0, dotIndex);
  const sig = signed.slice(dotIndex + 1);
  const expected = createHmac('sha256', getSessionSigningKey()).update(token).digest('hex');
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== sig.length) return null;
  let match = 0;
  for (let i = 0; i < expected.length; i++) {
    match |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return match === 0 ? token : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const signed = signToken(token);

  cookieStore.set(SESSION_COOKIE_NAME, signed, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    partitioned: isProduction,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    partitioned: isProduction,
  });
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const signed = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  if (!signed) return null;
  return verifySignedToken(signed);
}
