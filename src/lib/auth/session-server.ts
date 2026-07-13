import { db, DbUser } from '@/lib/db';
import { generateRandomToken, hashToken } from '@/lib/auth/crypto';
import { SESSION_MAX_AGE } from './session';
import { SESSION } from '@/lib/constants';

/**
 * Server-only session management functions.
 * These depend on the database adapter and Node.js modules,
 * so they must NOT be imported from Edge Runtime middleware.
 *
 * Session tokens are stored as SHA-256 hashes in the database,
 * preventing session hijacking in case of a DB breach.
 * The raw token is only exposed via the HTTP-only cookie.
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
  const tokenHash = hashToken(token);

  // Enforce max concurrent sessions per user — delete oldest if over limit
  const sessionCount = await db.session.count({ userId });
  if (sessionCount >= SESSION.MAX_CONCURRENT_PER_USER) {
    const oldestSessions = await db.session.findMany(
      { userId },
      {
        orderBy: { createdAt: 'asc' as const },
        take: sessionCount - SESSION.MAX_CONCURRENT_PER_USER + 1,
        select: { id: true },
      }
    );
    if (oldestSessions.length > 0) {
      await db.session.deleteMany({
        id: { in: oldestSessions.map((s: { id: string }) => s.id) },
      });
    }
  }

  return db.session.create({
    token: tokenHash,
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
  const tokenHash = hashToken(token);
  const result = await db.session.findUnique({ token: tokenHash }, true);

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
  const tokenHash = hashToken(token);
  await db.session.delete({ token: tokenHash });
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
