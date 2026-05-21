import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  interests: z.string().max(500).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
});

// Fields safe to expose in profiles
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

    const { user: sessionUser } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // If no id provided, return own profile
    const targetId = id || sessionUser.id;

    const user = await db.user.findUnique({
      where: { id: targetId },
      select: profileSelect,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
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

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: validated,
    });

    const { passwordHash: _passwordHash, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
