import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { REPORT_LIMITS, VALIDATION } from '@/lib/constants';

const reportSchema = z.object({
  reportedId: z.string().min(1),
  reason: z.string().min(1).max(VALIDATION.REPORT_REASON_MAX_LENGTH),
  details: z.string().max(VALIDATION.REPORT_DETAILS_MAX_LENGTH).optional(),
});

const retractSchema = z.object({
  reportedId: z.string().min(1),
});

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const reports = await db.report.findMany({ reporterId: user.id });

    return NextResponse.json({ data: reports });
  } catch (error) {
    logger.error('/api/report', 'Failed to fetch reports', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

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
    const rateLimit = await checkRateLimit(`report:${reporterId}`, REPORT_LIMITS.MAX_PER_HOUR, REPORT_LIMITS.WINDOW_SECONDS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Please try again later' },
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

export async function DELETE(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { reportedId } = retractSchema.parse(body);

    await db.report.deleteMany({ reporterId: user.id, reportedId });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    logger.error('/api/report', 'Failed to retract report', error);
    return NextResponse.json({ error: 'Failed to retract report' }, { status: 500 });
  }
}
