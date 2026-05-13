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
    errors.push('Минимум 8 символов');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Хотя бы одна заглавная буква');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Хотя бы одна строчная буква');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Хотя бы одна цифра');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Хотя бы один специальный символ');
  }

  return { valid: errors.length === 0, errors };
}
