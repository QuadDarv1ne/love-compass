import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { RATE_LIMITS, LOGIN_LIMITS, REGISTRATION_LIMITS } from '@/lib/constants';

// ─── Rate limiters ──────────────────────────────────────────────────────────
const rateLimiters = {
  api: createRateLimiter({ max: 100, windowMs: 60_000 }),          // 100 req/min per IP
  login: createRateLimiter({ max: LOGIN_LIMITS.MAX_ATTEMPTS, windowMs: LOGIN_LIMITS.LOCKOUT_WINDOW * 1000 }),
  register: createRateLimiter({ max: REGISTRATION_LIMITS.MAX_PER_HOUR, windowMs: REGISTRATION_LIMITS.WINDOW_SECONDS * 1000 }),
  forgotPassword: createRateLimiter({ max: RATE_LIMITS.FORGOT_PASSWORD.MAX, windowMs: RATE_LIMITS.FORGOT_PASSWORD.WINDOW * 1000 }),
  heavy: createRateLimiter({ max: 30, windowMs: 60_000 }),         // 30 req/min for write-heavy paths
};

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

function applyRateLimit(request: NextRequest, limiter: ReturnType<typeof createRateLimiter>): Response | null {
  const ip = getClientIp(request);
  const result = limiter.check(ip);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, result.reset - Math.floor(Date.now() / 1000))),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }
  return null;
}

function logRequest(method: string, pathname: string, status: number, duration: number, ip: string) {
  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      context: 'middleware',
      message: `${method} ${pathname} ${status}`,
      data: { duration: `${duration}ms`, ip },
    }));
  } else if (status >= 400) {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      context: 'middleware',
      message: `${method} ${pathname} ${status}`,
      data: { duration: `${duration}ms`, ip },
    }));
  }
}

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
  const startTime = Date.now();
  const method = request.method;
  const ip = getClientIp(request);

  // Skip non-API routes and health checks
  if (!pathname.startsWith('/api/') || pathname === '/api/health') {
    return NextResponse.next();
  }

  // ── Rate limiting ────────────────────────────────────────────────────────
  // Apply global API rate limit first
  const globalLimit = applyRateLimit(request, rateLimiters.api);
  if (globalLimit) {
    logRequest(method, pathname, 429, Date.now() - startTime, ip);
    return globalLimit;
  }

  // Stricter limits for auth endpoints
  if (pathname === '/api/auth/login') {
    const loginLimit = applyRateLimit(request, rateLimiters.login);
    if (loginLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return loginLimit;
    }
  } else if (pathname === '/api/auth/register') {
    const registerLimit = applyRateLimit(request, rateLimiters.register);
    if (registerLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return registerLimit;
    }
  } else if (pathname === '/api/auth/forgot-password') {
    const forgotLimit = applyRateLimit(request, rateLimiters.forgotPassword);
    if (forgotLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return forgotLimit;
    }
  }

  // Stricter limits for write-heavy API paths
  const heavyPaths = ['/api/like', '/api/dislike', '/api/messages', '/api/block', '/api/report', '/api/moments'];
  if (heavyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const heavyLimit = applyRateLimit(request, rateLimiters.heavy);
    if (heavyLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return heavyLimit;
    }
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
    logRequest(method, pathname, 401, Date.now() - startTime, ip);
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
            logRequest(method, pathname, 403, Date.now() - startTime, ip);
            return NextResponse.json(
              { error: 'Forbidden' },
              { status: 403 }
            );
          }
        } else if (!allowedOrigins.includes(originUrl.origin)) {
          logRequest(method, pathname, 403, Date.now() - startTime, ip);
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }
    } catch {
      // Invalid origin header
      logRequest(method, pathname, 400, Date.now() - startTime, ip);
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
