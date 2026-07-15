import { cookies } from 'next/headers';
import { generateRandomToken } from './crypto';
import { timingSafeEqual } from 'crypto';

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
    sameSite: 'strict',
    path: '/',
    maxAge: 300, // 5 minutes — matches client-side CSRF_TOKEN_TTL refresh window
  });

  return token;
}

export async function validateCSRFToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('x-csrf-token');

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  return timingSafeEqual(a, b);
}
