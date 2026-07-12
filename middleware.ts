import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { LOGIN_LIMITS, REGISTRATION_LIMITS } from '@/lib/constants';
import { RATE_LIMITS } from '@/lib/constants';
import { logger } from '@/lib/logger';

function validateOrigin(request: NextRequest): string | NextResponse {
  const origin = request.headers.get('origin');
  if (!origin) return '';
  try {
    const originUrl = new URL(origin);
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : [];
      if (allowedOrigins.length > 0) {
        if (!allowedOrigins.includes(originUrl.origin)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        // Fallback: validate against Host header (set by reverse proxy, not client)
        const host = request.headers.get('host');
        if (host) {
          const requestOrigin = `${originUrl.protocol}//${host}`;
          if (originUrl.origin !== requestOrigin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        } else {
          // No host header — reject to prevent origin spoofing
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }
    return origin;
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}

// ─── Rate limiters ──────────────────────────────────────────────────────────
const rateLimiters = {
  api: createRateLimiter({ max: 100, windowMs: 60_000 }),          // 100 req/min per IP
  login: createRateLimiter({ max: LOGIN_LIMITS.MAX_ATTEMPTS, windowMs: LOGIN_LIMITS.LOCKOUT_WINDOW * 1000 }),
  register: createRateLimiter({ max: REGISTRATION_LIMITS.MAX_PER_HOUR, windowMs: REGISTRATION_LIMITS.WINDOW_SECONDS * 1000 }),
  forgotPassword: createRateLimiter({ max: RATE_LIMITS.FORGOT_PASSWORD.MAX, windowMs: RATE_LIMITS.FORGOT_PASSWORD.WINDOW * 1000 }),
  demoLogin: createRateLimiter({ max: RATE_LIMITS.DEMO_LOGIN.MAX, windowMs: RATE_LIMITS.DEMO_LOGIN.WINDOW * 1000 }),
  csrfToken: createRateLimiter({ max: RATE_LIMITS.CSRF_TOKEN.MAX, windowMs: RATE_LIMITS.CSRF_TOKEN.WINDOW * 1000 }),
  heavy: createRateLimiter({ max: 30, windowMs: 60_000 }),         // 30 req/min for write-heavy paths
};

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIP(ip: string): boolean {
  if (IPV4_REGEX.test(ip)) {
    return ip.split('.').map(Number).every((p) => p >= 0 && p <= 255);
  }
  return false;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIP = forwarded.split(',')[0]?.trim();
    if (firstIP && isValidIP(firstIP)) {
      return firstIP;
    }
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
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
  const data = { duration: `${duration}ms`, ip };
  if (status >= 500) {
    logger.error('middleware', `${method} ${pathname} ${status}`, data);
  } else if (status >= 400) {
    logger.warn('middleware', `${method} ${pathname} ${status}`, data);
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
  '/api/profile/photos',
  '/api/profile/avatar',
  '/api/auth/2fa/enable',
  '/api/auth/2fa/setup',
  '/api/auth/2fa/disable',
  '/api/auth/change-password',
  '/api/payment',
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

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    const originResult = validateOrigin(request);
    if (originResult instanceof NextResponse) {
      logRequest(method, pathname, 403, Date.now() - startTime, ip);
      return originResult;
    }
    const origin = originResult || '*';
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-csrf-token, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    if (origin !== '*') {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    return new NextResponse(null, {
      status: 204,
      headers,
    });
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
  } else if (pathname === '/api/auth/demo-login') {
    const demoLimit = applyRateLimit(request, rateLimiters.demoLogin);
    if (demoLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return demoLimit;
    }
  } else if (pathname === '/api/auth/csrf-token') {
    const csrfLimit = applyRateLimit(request, rateLimiters.csrfToken);
    if (csrfLimit) {
      logRequest(method, pathname, 429, Date.now() - startTime, ip);
      return csrfLimit;
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

  // Validate origin for all requests (including public auth paths)
  const originResult = validateOrigin(request);
  if (originResult instanceof NextResponse) {
    logRequest(method, pathname, 403, Date.now() - startTime, ip);
    return originResult;
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

  // Security headers are already set globally via next.config.ts headers()
  // (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  // Do NOT duplicate them here — two CSP headers with different values cause
  // the browser to enforce the intersection, blocking DiceBear avatars and fonts.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/(login|register|forgot-password|reset-password|verify-email|verify-email-pending|2fa-verify)',
  ],
};
