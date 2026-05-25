import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    const skip = pagination.cursor ? 1 : 0;
    const profiles = await db.user.findMany(
      {
        profileVisible: true,
      },
      {
        take: pagination.limit + 1,
        skip,
        orderBy: { createdAt: 'desc' },
      }
    );

    // Filter out current user and blocked users in memory
    const blocked = await db.block.findMany({ blockerId: user.id });
    const blockedBy = await db.block.findMany({ blockedId: user.id });
    const blockedIds = new Set([
      ...blocked.map(b => b.blockedId),
      ...blockedBy.map(b => b.blockerId),
      user.id,
    ]);

    const filteredProfiles = profiles.filter(p => !blockedIds.has(p.id));

    let nextCursor: string | undefined = undefined;
    if (filteredProfiles.length > pagination.limit) {
      const nextItem = filteredProfiles.pop();
      nextCursor = nextItem?.id;
    }

    return NextResponse.json({
      data: filteredProfiles.map(sanitizeUser),
      nextCursor,
    });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
