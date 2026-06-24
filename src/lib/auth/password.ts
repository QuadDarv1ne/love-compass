import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('password.minLength');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('password.oneUppercase');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('password.oneLowercase');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('password.oneDigit');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('password.oneSpecial');
  }

  return { valid: errors.length === 0, errors };
}
