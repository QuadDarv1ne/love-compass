import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';

const unlockSchema = z.object({
  achievementId: z.string(),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const achievements = await db.userAchievement.findMany(
      { userId: user.id }
    );

    return NextResponse.json({
      unlocked: achievements.map((a) => a.achievementId),
      details: achievements,
    });
  } catch (error) {
    logger.error('/api/achievements', 'GET error', error);
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

    try {
      const achievement = await db.userAchievement.create({
        userId: user.id,
        achievementId,
      });

      return NextResponse.json({ data: achievement }, { status: 201 });
    } catch (dbError) {
      // Handle unique constraint violation from concurrent requests
      if (
        dbError instanceof Error &&
        (dbError.message.includes('Unique constraint') || dbError.message.includes('P2002'))
      ) {
        const existing = await db.userAchievement.findUnique(
          { userId: user.id, achievementId }
        );
        return NextResponse.json({ data: existing, alreadyUnlocked: true });
      }
      throw dbError;
    }
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    logger.error('/api/achievements', 'POST error', error);
    return NextResponse.json({ error: 'Failed to unlock achievement' }, { status: 500 });
  }
}
