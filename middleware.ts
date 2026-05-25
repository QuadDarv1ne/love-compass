import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/verify-email-pending',
  '/reset-password',
  '/forgot-password',
  '/2fa-verify',
];

const SESSION_COOKIE_NAME = '__session';

async function validateSession(token: string): Promise<boolean> {
  try {
    const result = await db.session.findUnique({ token }, true);

    if (!result || !('user' in result) || !result.user) {
      return false;
    }

    const session = result as { id: string; expiresAt: Date };
    if (session.expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, favicons, etc.
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff2?|ttf|eot|json)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow auth API routes
  if (pathname.startsWith('/api/auth/') || pathname === '/api/health') {
    return NextResponse.next();
  }

  // Check and validate session cookie for all other paths
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Validate session against database to catch expired/revoked tokens
  const isValid = await validateSession(sessionToken);

  if (!isValid) {
    // Session is expired or revoked — clear cookie and redirect
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { error: 'Сессия истекла или была отозвана' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  }

  // Update lastSeenAt for the authenticated user (throttled to once per minute)
  try {
    const session = await db.session.findUnique({ token: sessionToken }, true);
    if (session && 'userId' in session && session.userId) {
      await db.user.update({ id: session.userId }, { lastSeenAt: new Date() });
    }
  } catch {
    // Non-critical, don't break the request
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
