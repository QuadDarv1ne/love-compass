import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const createProfileSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.coerce.number().min(18).max(120),
  gender: z.enum(['male', 'female', 'other']),
  bio: z.string().max(500).optional(),
  interests: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  city: z.string().max(100).optional(),
  lookingFor: z.enum(['all', 'male', 'female']).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = paginationSchema.parse({
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || 20,
    });

    const profiles = await db.user.findMany({
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createProfileSchema.parse(body);

    const user = await db.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        age: validated.age,
        gender: validated.gender,
        bio: validated.bio || '',
        interests: validated.interests || '',
        avatar: validated.avatar || '',
        city: validated.city || '',
        lookingFor: validated.lookingFor || 'all',
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
