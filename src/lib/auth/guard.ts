import { NextResponse } from 'next/server';
import { getUserFromRequest } from './session';
import { validateCSRFToken } from './csrf';
import type { User } from '@prisma/client';

export async function requireAuth(
  request: Request
): Promise<{ user: User } | NextResponse> {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
  }

  return { user };
}

export async function requireAuthWithCSRF(
  request: Request
): Promise<{ user: User } | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const csrfValid = await validateCSRFToken(request);
  if (!csrfValid) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  return auth;
}

export async function requireVerifiedEmail(
  request: Request
): Promise<{ user: User } | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!auth.user.emailVerified) {
    return NextResponse.json(
      { error: 'Подтвердите email', needsEmailVerification: true },
      { status: 403 }
    );
  }

  return auth;
}
