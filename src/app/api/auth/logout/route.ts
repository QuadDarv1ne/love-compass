import { NextResponse } from 'next/server';
import {
  getSessionTokenFromCookie,
  invalidateSession,
  deleteSessionCookie,
} from '@/lib/auth/session';
import { validateCSRFToken } from '@/lib/auth/csrf';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const csrfValid = await validateCSRFToken(request);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const token = await getSessionTokenFromCookie();

    if (token) {
      await invalidateSession(token);
    }

    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('/api/auth/logout', 'Logout error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
