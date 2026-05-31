import { db, DbUser } from '@/lib/db';
import { generateRandomToken } from '@/lib/auth/crypto';
import { SESSION_MAX_AGE } from './session';

/**
 * Server-only session management functions.
 * These depend on the database adapter and Node.js modules,
 * so they must NOT be imported from Edge Runtime middleware.
 */

export function generateSessionToken(): string {
  return generateRandomToken(32);
}

export async function createSession(
  token: string,
  userId: string,
  userAgent?: string | null,
  ipAddress?: string | null
) {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  return db.session.create({
    token,
    userId,
    expiresAt,
    userAgent: userAgent || undefined,
    ipAddress: ipAddress || undefined,
  });
}

export async function validateSessionToken(token: string): Promise<{
  session: { id: string; userId: string; expiresAt: Date };
  user: DbUser;
} | null> {
  const result = await db.session.findUnique({ token }, true);

  if (!result || !('user' in result) || !result.user) {
    return null;
  }

  const session = result as { id: string; userId: string; expiresAt: Date; user: DbUser };
  if (session.expiresAt < new Date()) {
    if (session.id) {
      try {
        await db.session.delete({ id: session.id });
      } catch {
        // Session may have been deleted by a concurrent request — safe to ignore
      }
    }
    return null;
  }

  // Sliding expiration: extend if less than half life remains
  const halfLife = SESSION_MAX_AGE / 2;
  const timeLeft = session.expiresAt.getTime() - Date.now();
  if (timeLeft < halfLife * 1000) {
    await db.session.update({ id: session.id }, { expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) });
  }

  return { session, user: session.user };
}

export async function invalidateSession(token: string): Promise<void> {
  await db.session.delete({ token });
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ userId });
}

export async function getUserFromRequest(): Promise<DbUser | null> {
  const { getSessionTokenFromCookie } = await import('./session');
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const result = await validateSessionToken(token);
  return result?.user || null;
}
