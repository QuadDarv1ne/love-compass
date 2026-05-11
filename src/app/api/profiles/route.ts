import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const profiles = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(profiles);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, age, gender, bio, interests, avatar, city, lookingFor } = body;

    if (!email || !name || !age || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        age: parseInt(age),
        gender,
        bio: bio || '',
        interests: interests || '',
        avatar: avatar || '',
        city: city || '',
        lookingFor: lookingFor || 'all',
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
