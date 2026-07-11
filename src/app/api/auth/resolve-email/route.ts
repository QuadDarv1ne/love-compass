import { NextResponse } from 'next/server';
import { verifyTempToken } from '@/lib/auth/jwt';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

function maskEmail(email: string): string {
  const parts = email.split('@');
  const local = parts[0] ?? '';
  const domain = parts[1] ?? '';
  if (local.length <= 2) return `${local[0] ?? ''}***@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string' || token.length > 128) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const payload = await verifyTempToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = await db.user.findUnique({ id: payload.userId });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ email: maskEmail(user.email) });
  } catch (error) {
    logger.error('/api/auth/resolve-email', 'Failed to resolve email from token', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
