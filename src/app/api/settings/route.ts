import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { sanitizeUser } from '@/lib/auth/projections';
import { logger } from '@/lib/logger';

const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  language: z.enum(['ru', 'en', 'zh', 'es'] as const).optional(),
  showDistance: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  matchNotifications: z.boolean().optional(),
  likeNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const dbUser = await db.user.findUnique({ id: user.id });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      notificationsEnabled: dbUser.notificationsEnabled,
      profileVisible: dbUser.profileVisible,
      showOnlineStatus: dbUser.showOnlineStatus,
      language: dbUser.language,
      showDistance: dbUser.showDistance,
      soundEnabled: dbUser.soundEnabled,
      matchNotifications: dbUser.matchNotifications,
      likeNotifications: dbUser.likeNotifications,
      emailNotifications: dbUser.emailNotifications,
    }, { headers: { 'Cache-Control': 'private, no-cache, no-store, max-age=0' } });
  } catch (error) {
    logger.error('/api/settings', 'Failed to fetch settings', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    const updatedUser = await db.user.update(
      { id: user.id },
      validated
    );

    return NextResponse.json(sanitizeUser(updatedUser));
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    logger.error('/api/settings', 'Failed to update settings', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
