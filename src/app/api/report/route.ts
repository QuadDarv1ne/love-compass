import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';

const reportSchema = z.object({
  reportedId: z.string().min(1),
  reason: z.string().min(1).max(500),
  details: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { reportedId, reason, details } = reportSchema.parse(body);
    const reporterId = user.id;

    if (reporterId === reportedId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Rate limit: 10 reports per hour per user
    const rateLimit = await checkRateLimit(`report:${reporterId}`, 10, 3600);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много жалоб. Попробуйте позже' },
        { status: 429 }
      );
    }

    const report = await db.report.create({ reporterId, reportedId, reason, details });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    logger.error('/api/report', 'Failed to report user', error);
    return NextResponse.json({ error: 'Failed to report user' }, { status: 500 });
  }
}
