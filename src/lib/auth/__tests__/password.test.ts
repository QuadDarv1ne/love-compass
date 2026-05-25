import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '../password';

describe('validatePasswordStrength', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Short1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Минимум 8 символов');
  });

  it('rejects password without uppercase letter', () => {
    const result = validatePasswordStrength('lowercase1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Хотя бы одна заглавная буква');
  });

  it('rejects password without lowercase letter', () => {
    const result = validatePasswordStrength('UPPERCASE1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Хотя бы одна строчная буква');
  });

  it('rejects password without digit', () => {
    const result = validatePasswordStrength('NoDigitHere!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Хотя бы одна цифра');
  });

  it('rejects password without special character', () => {
    const result = validatePasswordStrength('NoSpecial1char');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Хотя бы один специальный символ');
  });

  it('accepts valid password with all requirements', () => {
    const result = validatePasswordStrength('ValidPass1!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('collects multiple errors for multiple violations', () => {
    const result = validatePasswordStrength('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });
});
