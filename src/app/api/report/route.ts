import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';

const reportSchema = z.object({
  reportedId: z.string().min(1),
  reason: z.string().min(1),
  details: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { reportedId, reason, details } = reportSchema.parse(body);
    const reporterId = user.id;

    if (reporterId === reportedId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const report = await db.report.create({
      data: { reporterId, reportedId, reason, details },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to report user' }, { status: 500 });
  }
}
