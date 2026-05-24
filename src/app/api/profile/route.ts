import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  interests: z.string().max(500).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
  photos: z.array(z.string()).max(6).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user: sessionUser } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // If no id provided, return own profile
    const targetId = id || sessionUser.id;
    const isOwnProfile = targetId === sessionUser.id;

    const where: Record<string, unknown> = { id: targetId };
    // Only visible profiles can be viewed (users can always see their own)
    if (!isOwnProfile) {
      where.profileVisible = true;
    }

    const user = await db.user.findUnique(where);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(sanitizeUser(user));
  } catch (error) {
    logger.error('/api/profile', 'Failed to fetch profile', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    const updateData: Record<string, any> = { ...validated };
    if (validated.photos) {
      updateData.photos = JSON.stringify(validated.photos);
    }

    const updatedUser = await db.user.update(
      { id: user.id },
      updateData
    );

    return NextResponse.json(sanitizeUser(updatedUser));
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
