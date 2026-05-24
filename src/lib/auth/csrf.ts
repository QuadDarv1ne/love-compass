import { cookies } from 'next/headers';
import { generateRandomToken } from './crypto';

const CSRF_COOKIE_NAME = '__csrf';

export async function generateCSRFToken(): Promise<string> {
  return generateRandomToken(32);
}

export async function setCSRFTokenCookie(): Promise<string> {
  const token = await generateCSRFToken();
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // readable by JS for double-submit
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });

  return token;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Use constant-time approach: compare with padded strings
    const maxLen = Math.max(a.length, b.length);
    let result = a.length ^ b.length;
    for (let i = 0; i < maxLen; i++) {
      result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return result === 0;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  return timingSafeEqual(cookieToken, headerToken);
}
