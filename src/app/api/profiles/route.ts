import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, isZodError } from '@/lib/auth/guard';

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Fields safe to expose in public profiles
const profileSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  bio: true,
  interests: true,
  avatar: true,
  city: true,
  lookingFor: true,
  profileVisible: true,
  showOnlineStatus: true,
  language: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const pagination = paginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || 20,
    });

    const profiles = await db.user.findMany({
      where: {
        id: { not: user.id },
        profileVisible: true,
        NOT: {
          OR: [
            { blockedBy: { some: { blockerId: user.id } } },
            { blocked: { some: { blockedId: user.id } } },
          ],
        },
      },
      select: profileSelect,
      take: pagination.limit + 1,
      cursor: pagination.cursor ? { id: pagination.cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    let nextCursor: string | undefined = undefined;
    if (profiles.length > pagination.limit) {
      const nextItem = profiles.pop();
      nextCursor = nextItem?.id;
    }

    return NextResponse.json({
      data: profiles,
      nextCursor,
    });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}
