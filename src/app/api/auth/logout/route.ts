import { NextResponse } from 'next/server';
import {
  getSessionTokenFromCookie,
  invalidateSession,
  deleteSessionCookie,
} from '@/lib/auth/session';

export async function POST() {
  try {
    const token = await getSessionTokenFromCookie();

    if (token) {
      await invalidateSession(token);
    }

    await deleteSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
