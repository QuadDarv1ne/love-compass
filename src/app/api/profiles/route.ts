import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DbUser } from '@/lib/db/types';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import { sanitizeUser } from '@/lib/auth/projections';
import { computeCompatibilityScore } from '@/lib/scoring';
import { PAGINATION, RATE_LIMITS } from '@/lib/constants';
import { checkRateLimit } from '@/lib/auth/rate-limit';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Rate limit profile browsing to prevent data scraping
    const rateLimit = await checkRateLimit(`profiles:${user.id}`, RATE_LIMITS.PROFILES.MAX, RATE_LIMITS.PROFILES.WINDOW);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before browsing more profiles.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pagination = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(PAGINATION.PROFILES_MAX_LIMIT).default(PAGINATION.PROFILES_DEFAULT_LIMIT),
      sort: z.enum(['new', 'recommended']).default('new'),
    }).parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: parseInt(searchParams.get('limit') || String(PAGINATION.PROFILES_DEFAULT_LIMIT)),
      sort: searchParams.get('sort') || 'new',
    });

    // Fetch blocked and disliked IDs so we can exclude them
    const [blocked, blockedBy, disliked] = await Promise.all([
      db.block.findMany({ blockerId: user.id }),
      db.block.findMany({ blockedId: user.id }),
      db.dislike.findMany({ fromUserId: user.id }),
    ]);
    const blockedIds = new Set([
      ...blocked.map(b => b.blockedId),
      ...blockedBy.map(b => b.blockerId),
      user.id,
      ...disliked.map(d => d.toUserId),
    ]);

    if (pagination.sort === 'recommended') {
      const fetchLimit = Math.min(pagination.limit * 3, PAGINATION.PROFILES_MAX_LIMIT);
      const allProfiles: DbUser[] = [];
      let recCursor = pagination.cursor;
      while (allProfiles.length < fetchLimit) {
        const skip = recCursor ? 1 : 0;
        const needed = fetchLimit - allProfiles.length + (recCursor ? 1 : 0);
        const profiles = await db.user.findMany(
          { profileVisible: true },
          { take: Math.min(needed, 100), skip, orderBy: { createdAt: 'desc' }, cursor: recCursor ? { id: recCursor } : undefined }
        );
        if (profiles.length === 0) break;
        for (const p of profiles) {
          if (!blockedIds.has(p.id)) allProfiles.push(p);
        }
        recCursor = profiles[profiles.length - 1]!.id;
      }

      const scored = allProfiles
        .map((p) => ({ profile: p, score: computeCompatibilityScore(user, p) }))
        .sort((a, b) => b.score - a.score);

      const results = scored.slice(0, pagination.limit);
      const nextCursor = results.length < pagination.limit ? null : (results[results.length - 1]!.profile.id);

      return NextResponse.json({
        data: results.map((r) => sanitizeUser(r.profile)),
        nextCursor,
      });
    }

    const results: DbUser[] = [];
    let cursor = pagination.cursor;
    while (results.length < pagination.limit) {
      const skip = cursor ? 1 : 0;
      const remaining = pagination.limit - results.length + (cursor ? 1 : 0);
      const profiles = await db.user.findMany(
        { profileVisible: true },
        { take: Math.min(remaining, 100), skip, orderBy: { createdAt: 'desc' }, cursor: cursor ? { id: cursor } : undefined }
      );

      if (profiles.length === 0) break;

      for (const p of profiles) {
        if (!blockedIds.has(p.id)) results.push(p);
      }

      const lastProfile = profiles[profiles.length - 1]!;
      cursor = lastProfile.id;
    }

    let nextCursor: string | undefined = undefined;
    if (results.length >= pagination.limit && cursor) {
      const [extra] = await db.user.findMany(
        { profileVisible: true },
        { take: 1, skip: 1, orderBy: { createdAt: 'desc' }, cursor: { id: cursor } }
      );
      if (extra && !blockedIds.has(extra.id)) {
        nextCursor = extra.id;
      }
    }

    return NextResponse.json({
      data: results.map(sanitizeUser),
      nextCursor,
    });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    logger.error('/api/profiles', 'GET error', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
