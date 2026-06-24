import { NextResponse } from 'next/server';
import { getUserFromRequest } from './session-server';
import { validateCSRFToken } from './csrf';
import { db } from '@/lib/db';
import type { DbUser } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ONLINE_PRESENCE } from '@/lib/constants';

const lastSeenCache = new Map<string, number>();
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean up stale entries from the lastSeen cache to prevent memory leaks.
 * Called periodically during requireAuth.
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [id, timestamp] of lastSeenCache.entries()) {
    if (now - timestamp > MAX_CACHE_AGE) {
      lastSeenCache.delete(id);
    }
  }
}

/**
 * Check if an error is a Zod validation error.
 * Works with both Zod v3 and v4.
 */
export function isZodError(error: unknown): error is { name: 'ZodError'; issues: Array<{ message: string; path: (string | number)[] }> } {
  return error instanceof Error && error.name === 'ZodError';
}

export async function requireAuth(): Promise<{ user: DbUser } | NextResponse> {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Update lastSeenAt at most once per ONLINE_PRESENCE.ACTIVE_THRESHOLD_MS
  // to avoid a DB write on every single API call
  const now = Date.now();
  const lastUpdate = lastSeenCache.get(user.id) ?? 0;
  if (now - lastUpdate >= ONLINE_PRESENCE.ACTIVE_THRESHOLD_MS) {
    lastSeenCache.set(user.id, now);
    db.user.update({ id: user.id }, { lastSeenAt: new Date() }).catch(() => {
      logger.warn('guard.requireAuth', 'Failed to update lastSeenAt', { userId: user.id });
    });
  }

  // Periodically clean up stale cache entries (every ~1000 calls)
  if (Math.random() < 0.001) {
    cleanupCache();
  }

  return { user };
}

export async function requireAuthWithCSRF(
  request: Request
): Promise<{ user: DbUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const csrfValid = await validateCSRFToken(request);
  if (!csrfValid) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  return auth;
}

export async function requireVerifiedEmail(): Promise<{ user: DbUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (!auth.user.emailVerified) {
    return NextResponse.json(
      { error: 'Verify your email', needsEmailVerification: true },
      { status: 403 }
    );
  }

  return auth;
}

export async function requireAdmin(): Promise<{ user: DbUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}

export async function requireAdminWithCSRF(
  request: Request
): Promise<{ user: DbUser } | NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const csrfValid = await validateCSRFToken(request);
  if (!csrfValid) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  return auth;
}
