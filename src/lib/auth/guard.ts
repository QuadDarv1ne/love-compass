import { NextResponse } from 'next/server';
import { getUserFromRequest } from './session-server';
import { validateCSRFToken } from './csrf';
import { db } from '@/lib/db';
import type { DbUser } from '@/lib/db';
import { logger } from '@/lib/logger';

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

  // Update lastSeenAt for online status tracking (fire-and-forget)
  db.user.update({ id: user.id }, { lastSeenAt: new Date() }).catch(() => {
    logger.warn('guard.requireAuth', 'Failed to update lastSeenAt', { userId: user.id });
  });

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
