import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  generateSessionToken,
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';
import { getClientIp } from '@/lib/auth/crypto';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';

const demoLoginSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Demo mode is disabled' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const result = demoLoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { userId } = result.data;

    const user = await db.user.findUnique({ id: userId });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create session
    const sessionToken = generateSessionToken();
    const userAgent = request.headers.get('user-agent');
    const ipAddress = getClientIp(request);

    await createSession(sessionToken, user.id, userAgent, ipAddress);
    await setSessionCookie(sessionToken);

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    logger.error('/api/auth/demo-login', 'Demo login error', error);
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}
