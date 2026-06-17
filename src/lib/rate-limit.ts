/**
 * In-memory sliding-window rate limiter.
 *
 * Designed for single-process deployments (VPS, Docker).
 * For multi-process (serverless, multi-replica) — swap in Redis or
 * use the middleware with an external store.
 *
 * Edge-runtime safe — no setInterval, lazy pruning on each check().
 *
 * Usage:
 *   const limiter = createRateLimiter({ max: 10, windowMs: 60_000 });
 *   const result = limiter.check('user:123');
 *   if (!result.allowed) return Response.json({ error: 'Too many' }, { status: 429 });
 */

interface RateLimitConfig {
  max: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

const stores = new Map<string, Map<string, number[]>>();

function pruneEntry(id: string, cutoff: number, store: Map<string, number[]>): number[] {
  const timestamps = store.get(id);
  if (!timestamps) return [];
  const recent = timestamps.filter((t) => t > cutoff);
  if (recent.length === 0) {
    store.delete(id);
  } else if (recent.length !== timestamps.length) {
    store.set(id, recent);
  }
  return recent;
}

export function createRateLimiter(config: RateLimitConfig) {
  const { max, windowMs } = config;

  if (!stores.has(config.windowMs.toString())) {
    stores.set(config.windowMs.toString(), new Map());
  }

  const store = stores.get(config.windowMs.toString());
  if (!store) throw new Error('Rate limit store not found');

  return {
    check(id: string, timestamp: number = Date.now()): RateLimitResult {
      const cutoff = timestamp - windowMs;
      const recent = pruneEntry(id, cutoff, store);
      const allowed = recent.length < max;

      if (allowed) {
        recent.push(timestamp);
        store.set(id, recent);
      }

      return {
        allowed,
        remaining: Math.max(0, max - recent.length),
        reset: Math.ceil((cutoff + windowMs) / 1000),
      };
    },

    reset(id: string): void {
      store.delete(id);
    },

    getRemaining(id: string, timestamp: number = Date.now()): number {
      const cutoff = timestamp - windowMs;
      const recent = pruneEntry(id, cutoff, store);
      return Math.max(0, max - recent.length);
    },
  };
}

/**
 * Returns a RateLimitResult when the limit is exceeded, otherwise null.
 * Convenience for use in API route handlers.
 */
export function checkRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  id: string,
): RateLimitResult | null {
  const result = limiter.check(id);
  if (!result.allowed) return result;
  return null;
}
