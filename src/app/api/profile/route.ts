import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';
import { VALIDATION, UPLOAD } from '@/lib/constants';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(VALIDATION.NAME_MAX_LENGTH).optional(),
  bio: z.string().trim().max(VALIDATION.BIO_MAX_LENGTH).optional(),
  city: z.string().trim().max(VALIDATION.CITY_MAX_LENGTH).optional(),
  interests: z.string().trim().max(VALIDATION.INTERESTS_MAX_LENGTH).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
  photos: z.array(z.string()).max(UPLOAD.MAX_PHOTOS).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user: sessionUser } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // If no id provided, return own profile
    const targetId = id || sessionUser.id;
    const isOwnProfile = targetId === sessionUser.id;

    const user = await db.user.findUnique({ id: targetId });

    // Reject if profile is hidden and not own profile
    if (!isOwnProfile && user && !user.profileVisible) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    const updateData: Record<string, unknown> = { ...validated };

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
