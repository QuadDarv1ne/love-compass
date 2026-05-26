import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DbUser } from '@/lib/db/types';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { PAGINATION } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const pagination = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().min(1).max(PAGINATION.PROFILES_MAX_LIMIT).default(PAGINATION.PROFILES_DEFAULT_LIMIT),
    }).parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: parseInt(searchParams.get('limit') || String(PAGINATION.PROFILES_DEFAULT_LIMIT)),
    });

    // Fetch blocked IDs first so we can exclude them at the DB level
    const [blocked, blockedBy] = await Promise.all([
      db.block.findMany({ blockerId: user.id }),
      db.block.findMany({ blockedId: user.id }),
    ]);
    const blockedIds = new Set([
      ...blocked.map(b => b.blockedId),
      ...blockedBy.map(b => b.blockerId),
      user.id,
    ]);

    // Collect exactly `limit` unblocked profiles by looping DB fetches
    // Safety cap of 5 iterations prevents infinite loops on edge cases
    const results: DbUser[] = [];
    let cursor = pagination.cursor;
    for (let iteration = 0; iteration < 5 && results.length < pagination.limit; iteration++) {
      const skip = cursor ? 1 : 0;
      const remaining = pagination.limit - results.length + (cursor ? 1 : 0);
      const profiles = await db.user.findMany(
        {
          profileVisible: true,
        },
        {
          take: remaining,
          skip,
          orderBy: { createdAt: 'desc' },
          cursor: cursor ? { id: cursor } : undefined,
        }
      );

      if (profiles.length === 0) break;

      for (const p of profiles) {
        if (!blockedIds.has(p.id)) {
          results.push(p);
        }
      }

      const lastProfile = profiles[profiles.length - 1];
      cursor = lastProfile.id;
    }

    // Determine next cursor by fetching one extra profile
    let nextCursor: string | undefined = undefined;
    if (results.length >= pagination.limit && cursor) {
      const [extra] = await db.user.findMany(
        {
          profileVisible: true,
        },
        {
          take: 1,
          skip: 1,
          orderBy: { createdAt: 'desc' },
          cursor: { id: cursor },
        }
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
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
