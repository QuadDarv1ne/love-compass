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
    // Atomic upsert: create if not exists, update count if exists and not expired
    // This eliminates the TOCTOU race between findUnique and create/update
    const existing = await tx.rateLimit.findUnique({ key });

    if (!existing) {
      try {
        await tx.rateLimit.create({ key, count: 1, resetAt });
      } catch (e) {
        // Unique constraint violation — concurrent create, re-read and update
        const retry = await tx.rateLimit.findUnique({ key });
        if (!retry) throw e;
        if (retry.resetAt <= now) {
          await tx.rateLimit.update({ key }, { count: 1, resetAt });
        } else if (retry.count < maxAttempts) {
          await tx.rateLimit.update({ key }, { count: retry.count + 1 });
        } else {
          return { allowed: false, remaining: 0 };
        }
        return { allowed: true, remaining: maxAttempts - (retry.count + 1) };
      }
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.resetAt <= now) {
      await tx.rateLimit.update({ key }, { count: 1, resetAt });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    const updated = await tx.rateLimit.update(
      { key },
      { count: existing.count + 1 }
    );
    return { allowed: true, remaining: maxAttempts - updated.count };
  });
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ key });
}
