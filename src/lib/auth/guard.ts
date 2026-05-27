import { NextResponse } from 'next/server';
import { getUserFromRequest } from './session';
import { validateCSRFToken } from './csrf';
import type { DbUser } from '@/lib/db';

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
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
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
      { error: 'Подтвердите email', needsEmailVerification: true },
      { status: 403 }
    );
  }

  return auth;
}

export async function requireAdmin(): Promise<{ user: DbUser } | NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  if (auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
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
