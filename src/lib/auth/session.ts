import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { generateRandomToken } from './crypto';
import type { User } from '@prisma/client';

export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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
    data: {
      token,
      userId,
      expiresAt,
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    },
  });
}

export async function validateSessionToken(token: string): Promise<{
  session: { id: string; userId: string; expiresAt: Date };
  user: User;
} | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  // Sliding expiration: extend if less than half life remains
  const halfLife = SESSION_MAX_AGE / 2;
  const timeLeft = session.expiresAt.getTime() - Date.now();
  if (timeLeft < halfLife * 1000) {
    await db.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
    });
  }

  return { session, user: session.user };
}

export async function invalidateSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}

export async function invalidateAllUserSessions(
  userId: string
): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export async function getUserFromRequest(): Promise<User | null> {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;

  const result = await validateSessionToken(token);
  return result?.user || null;
}
