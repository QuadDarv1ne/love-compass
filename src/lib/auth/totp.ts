import { TOTP } from 'otpauth';
import { hashPassword, verifyPassword } from './password';
import { TOTP as TOTP_CONST } from '@/lib/constants';

export function generateTOTPSecret(): string {
  const secret = new Uint8Array(TOTP_CONST.SECRET_BYTE_LENGTH);
  crypto.getRandomValues(secret);
  // Base32 encoding
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < secret.length; i++) {
    result += base32Chars[secret[i] & 0x1f];
  }
  return result;
}

export function generateTOTPURI(
  secret: string,
  email: string,
  issuer = 'Love Compass'
): string {
  const totp = new TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return totp.toString();
}

export function verifyTOTP(
  secret: string,
  token: string
): boolean {
  const totp = new TOTP({
    issuer: 'Love Compass',
    label: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  // Allow 1 step tolerance (30-second window)
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < count; i++) {
    let code = '';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length];
    }
    codes.push(code);
  }
  return codes;
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashed: string[] = [];
  for (const code of codes) {
    hashed.push(await hashPassword(code));
  }
  return hashed;
}

export async function verifyBackupCode(
  input: string,
  storedHashes: string[]
): Promise<{ valid: boolean; index: number }> {
  const upperInput = input.toUpperCase().trim();
  for (let i = 0; i < storedHashes.length; i++) {
    if (await verifyPassword(upperInput, storedHashes[i])) {
      return { valid: true, index: i };
    }
  }
  return { valid: false, index: -1 };
}
