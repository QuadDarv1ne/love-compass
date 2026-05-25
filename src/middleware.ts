import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = [
  '/api/profiles',
  '/api/profile',
  '/api/likes',
  '/api/like',
  '/api/matches',
  '/api/messages',
  '/api/settings',
  '/api/account',
  '/api/block',
  '/api/report',
  '/api/moments',
  '/api/achievements',
  '/api/leaderboard',
  '/api/superlike',
];

// Paths that require admin role
const ADMIN_PATHS = [
  '/api/admin',
];

// Public auth paths (no session required)
const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/2fa/verify',
  '/api/auth/csrf-token',
  '/api/auth/session',
  '/api/auth/demo-login',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-API routes and health checks
  if (!pathname.startsWith('/api/') || pathname === '/api/health') {
    return NextResponse.next();
  }

  // Check if this is a public auth path
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  if (isPublicAuthPath) {
    return NextResponse.next();
  }

  // Verify session cookie exists for protected paths
  const sessionCookie = request.cookies.get('__session');

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  const isAdminPath = ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if ((isProtectedPath || isAdminPath) && !sessionCookie) {
    return NextResponse.json(
      { error: 'Необходима авторизация' },
      { status: 401 }
    );
  }

  // Security: Block requests with suspicious origin header spoofing
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // In production, validate against allowed origins
      if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
        if (!allowedOrigins.includes(originUrl.origin)) {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }
    } catch {
      // Invalid origin header
      return NextResponse.json(
        { error: 'Bad Request' },
        { status: 400 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (logo, robots.txt, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|.*\\.svg).*)',
  ],
};
