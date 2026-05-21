import { db } from '@/lib/db';

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  // Use transaction for atomic read-check-increment
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });

    if (!existing || existing.resetAt < now) {
      // New window or expired: create fresh entry with count=1
      await tx.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    // Atomically increment
    const updated = await tx.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });

    return { allowed: true, remaining: maxAttempts - updated.count };
  });

  return result;
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.rateLimit.deleteMany({ where: { key } });
}
