/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { signTempToken, verifyTempToken } from '../jwt';

describe('JWT temp tokens', () => {
  it('signs and verifies a token', async () => {
    const payload = { userId: 'test-123', action: 'verify-email' };
    const token = await signTempToken(payload, 5);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const verified = await verifyTempToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('test-123');
    expect(verified?.action).toBe('verify-email');
  });

  it('returns null for invalid token', async () => {
    const result = await verifyTempToken('invalid.token.here');
    expect(result).toBeNull();
  });

  it('includes all payload fields', async () => {
    const payload = { foo: 'bar', baz: 'qux' };
    const token = await signTempToken(payload, 5);
    const verified = await verifyTempToken(token);
    expect(verified?.foo).toBe('bar');
    expect(verified?.baz).toBe('qux');
  });
});
