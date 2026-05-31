import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session-server';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(null, { status: 200 });
    }

    return NextResponse.json({
      user: sanitizeUser(user),
    });
  } catch (error) {
    logger.error('/api/auth/session', 'Session check error', error);
    return NextResponse.json(null, { status: 200 });
  }
}
