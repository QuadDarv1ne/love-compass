import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Edge-compatible session cookie utilities.
 * DB-dependent functions (createSession, validateSessionToken, etc.)
 * are exported from '@/lib/auth/session/server' to avoid pulling
 * Node.js modules into the Edge Runtime middleware.
 */

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
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
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}
