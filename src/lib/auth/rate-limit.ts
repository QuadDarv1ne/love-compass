import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Delete all expired rate limit entries.
 * Safe to call periodically; returns the number of deleted rows.
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  return db.rateLimit.deleteMany({ resetAt: { lt: new Date() } });
}

/**
 * Probabilistic cleanup: runs ~1% of the time when checkRateLimit is called.
 * Keeps the table lean without requiring a cron job.
 */
async function maybeCleanup() {
  if (Math.random() < 0.01) {
    try {
      await cleanupExpiredRateLimits();
    } catch (err) {
      logger.error('rate-limit.maybeCleanup', 'Expired rate limit cleanup failed', err);
    }
  }
}

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  await maybeCleanup();

  return db.transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ key });

    if (!existing) {
      await tx.rateLimit.create({ key, count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.resetAt < now) {
      // Delete expired entry before creating new one to prevent stale records
      await tx.rateLimit.deleteMany({ key });
      await tx.rateLimit.create({ key, count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    const updated = await tx.rateLimit.update({ key }, { count: existing.count + 1 });
    return { allowed: true, remaining: maxAttempts - updated.count };
  });
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ key });
}
