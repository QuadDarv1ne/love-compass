import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = [
  '/api/profiles',
  '/api/profile',
  '/api/likes',
  '/api/like',
  '/api/dislike',
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

export async function middleware(request: NextRequest) {
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

  // Check session cookie presence for protected paths
  // Full token validation is handled by each API route via requireAuth()
  const sessionCookie = request.cookies.get('__session');

  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  const isAdminPath = ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if ((isProtectedPath || isAdminPath) && !sessionCookie) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Security: Validate origin header in production
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',')
          : [];
        // If ALLOWED_ORIGINS is not set, fall back to verifying the origin
        // matches the request's own host (same-origin check)
        if (allowedOrigins.length === 0) {
          const host = request.headers.get('host');
          const requestOrigin = `https://${host}`;
          if (originUrl.origin !== requestOrigin) {
            return NextResponse.json(
              { error: 'Forbidden' },
              { status: 403 }
            );
          }
        } else if (!allowedOrigins.includes(originUrl.origin)) {
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

  // Security headers are already set globally via next.config.ts headers()
  // (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  // Do NOT duplicate them here — two CSP headers with different values cause
  // the browser to enforce the intersection, blocking DiceBear avatars and fonts.
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
