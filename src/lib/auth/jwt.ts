import { SignJWT, jwtVerify } from 'jose';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    // Generate random secret at runtime for development
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return randomBytes;
  }
  return new TextEncoder().encode(secret);
};

export async function signTempToken(
  payload: Record<string, string>,
  expiryMinutes = 5
): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${expiryMinutes}m`)
    .sign(secret);
}

export async function verifyTempToken(
  token: string
): Promise<Record<string, string> | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as Record<string, string>;
  } catch {
    return null;
  }
}
