import { NextResponse } from 'next/server';
import { setCSRFTokenCookie } from '@/lib/auth/csrf';

export async function GET() {
  try {
    const token = await setCSRFTokenCookie();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error('CSRF token error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
