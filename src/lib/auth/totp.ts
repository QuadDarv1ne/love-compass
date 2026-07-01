import { TOTP } from 'otpauth';
import { hashPassword, verifyPassword } from './password';
import { TOTP as TOTP_CONST } from '@/lib/constants';

export function generateTOTPSecret(): string {
  // Each byte encodes to 8/5 = 1.6 base32 chars; to avoid waste,
  // we use rejection sampling on each 5-bit group.
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const needed = Math.ceil(TOTP_CONST.SECRET_BYTE_LENGTH * 8 / 5);
  const raw = new Uint8Array(needed);
  crypto.getRandomValues(raw);
  let result = '';
  for (let i = 0; i < needed; i++) {
    result += base32Chars[raw[i]! & 0x1f];
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
    digits: TOTP_CONST.TOKEN_LENGTH,
    period: TOTP_CONST.PERIOD,
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
    digits: TOTP_CONST.TOKEN_LENGTH,
    period: TOTP_CONST.PERIOD,
    secret,
  });
  // Allow 1 step tolerance (30-second window)
  const delta = totp.validate({ token, window: TOTP_CONST.VALIDATE_WINDOW });
  return delta !== null;
}

export function generateBackupCodes(count = TOTP_CONST.BACKUP_CODE_COUNT): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const maxValid = 256 - (256 % chars.length);
  for (let i = 0; i < count; i++) {
    let code = '';
    const bytes = new Uint8Array(16);
    let byteIndex = 0;
    while (code.length < 8) {
      if (byteIndex >= bytes.length) {
        crypto.getRandomValues(bytes);
        byteIndex = 0;
      }
      const b = bytes[byteIndex++]!;
      if (b < maxValid) {
        code += chars[b % chars.length];
      }
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
    if (await verifyPassword(upperInput, storedHashes[i]!)) {
      return { valid: true, index: i };
    }
  }
  return { valid: false, index: -1 };
}
