import { NextResponse } from 'next/server';
import { setCSRFTokenCookie } from '@/lib/auth/csrf';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const token = await setCSRFTokenCookie();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    logger.error('/api/auth/csrf-token', 'CSRF token error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
