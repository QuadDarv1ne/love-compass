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
