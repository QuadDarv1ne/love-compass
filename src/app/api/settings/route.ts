import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/guard';

const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  profileVisible: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  language: z.string().max(10).optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        notificationsEnabled: true,
        profileVisible: true,
        showOnlineStatus: true,
        language: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    const body = await request.json();
    const validated = updateSettingsSchema.parse(body);

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: validated,
      select: {
        notificationsEnabled: true,
        profileVisible: true,
        showOnlineStatus: true,
        language: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
