import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF } from '@/lib/auth/guard';

const unlockSchema = z.object({
  achievementId: z.string(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const achievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      select: { achievementId: true, unlockedAt: true },
    });

    return NextResponse.json({
      unlocked: achievements.map((a) => a.achievementId),
      details: achievements,
    });
  } catch (error) {
    console.error('GET /api/achievements error:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { achievementId } = unlockSchema.parse(body);

    // Upsert: ignore if already exists
    const existing = await db.userAchievement.findUnique({
      where: { userId_achievementId: { userId: user.id, achievementId } },
    });

    if (existing) {
      return NextResponse.json({ data: existing, alreadyUnlocked: true });
    }

    const achievement = await db.userAchievement.create({
      data: {
        userId: user.id,
        achievementId,
      },
    });

    return NextResponse.json({ data: achievement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/achievements error:', error);
    return NextResponse.json({ error: 'Failed to unlock achievement' }, { status: 500 });
  }
}
