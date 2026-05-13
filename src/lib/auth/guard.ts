import { NextResponse } from 'next/server';
import { getUserFromRequest } from './session';
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
