import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(null, { status: 200 });
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return NextResponse.json({
      user: safeUser,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(null, { status: 200 });
  }
}
