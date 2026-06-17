import { describe, it, expect, beforeEach } from 'vitest';
import { createRateLimiter, isRateLimited, resetAllStores } from '@/lib/rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    resetAllStores();
  });

  it('allows requests within limit', () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('user:1', 1000 + i);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it('blocks requests exceeding limit', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    for (let i = 0; i < 3; i++) {
      expect(limiter.check('user:1', 1000 + i).allowed).toBe(true);
    }
    const blocked = limiter.check('user:1', 4000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(limiter.check('user:1', 0).allowed).toBe(true);
    expect(limiter.check('user:1', 500).allowed).toBe(true);
    expect(limiter.check('user:1', 900).allowed).toBe(false);

    // After window passes, should allow again
    expect(limiter.check('user:1', 1100).allowed).toBe(true);
  });

  it('tracks different keys independently', () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    expect(limiter.check('alice', 1000).allowed).toBe(true);
    expect(limiter.check('alice', 1001).allowed).toBe(true);
    expect(limiter.check('alice', 1002).allowed).toBe(false);

    // Bob should still have all slots
    expect(limiter.check('bob', 1000).allowed).toBe(true);
    expect(limiter.check('bob', 1001).allowed).toBe(true);
    expect(limiter.check('bob', 1002).allowed).toBe(false);
  });

  it('uses different stores for different max values with same window', () => {
    const limiterA = createRateLimiter({ max: 1, windowMs: 60_000 });
    const limiterB = createRateLimiter({ max: 5, windowMs: 60_000 });

    // First request to limiterA should work
    expect(limiterA.check('user:1', 1000).allowed).toBe(true);
    expect(limiterA.check('user:1', 1001).allowed).toBe(false);

    // limiterB should have independent count
    expect(limiterB.check('user:1', 1001).allowed).toBe(true);
  });

  it('reset clears state for a key', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check('user:1', 1000).allowed).toBe(true);
    expect(limiter.check('user:1', 1001).allowed).toBe(false);

    limiter.reset('user:1');
    expect(limiter.check('user:1', 1002).allowed).toBe(true);
  });

  it('getRemaining returns correct count', () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
    expect(limiter.getRemaining('user:1', 1000)).toBe(5);

    limiter.check('user:1', 1000);
    expect(limiter.getRemaining('user:1', 1001)).toBe(4);

    limiter.check('user:1', 1001);
    expect(limiter.getRemaining('user:1', 1002)).toBe(3);
  });

  it('prunes expired entries via lazy cleanup', () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 1000 });

    // Fill the window
    limiter.check('user:1', 0);
    limiter.check('user:1', 100);
    limiter.check('user:1', 200);
    expect(limiter.check('user:1', 300).allowed).toBe(false);

    // After window, first entry should be pruned
    expect(limiter.check('user:1', 1100).allowed).toBe(true);
  });
});

describe('isRateLimited', () => {
  it('returns null when under limit', () => {
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000 });
    expect(isRateLimited(limiter, 'user:1')).toBeNull();
  });

  it('returns result when over limit', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check('user:1');
    const result = isRateLimited(limiter, 'user:1');
    expect(result).not.toBeNull();
    expect(result?.allowed).toBe(false);
  });
});
