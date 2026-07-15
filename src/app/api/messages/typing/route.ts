import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { logger } from '@/lib/logger';
import { messageBus } from '@/lib/sse';

// In-memory typing store: "matchId:userId" -> { userId, matchId, timestamp }
const typingStore = new Map<string, { userId: string; matchId: string; timestamp: number }>();
const TYPING_EXPIRY_MS = 5_000;
const CLEANUP_INTERVAL_MS = 15_000;
const TYPING_MAX_ENTRIES = 10_000;

// Periodic cleanup of stale typing entries
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, { userId, matchId, timestamp }] of typingStore) {
      if (now - timestamp > TYPING_EXPIRY_MS) {
        typingStore.delete(key);
        messageBus.publish(`typing:${matchId}`, { userId, matchId, typing: false });
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

function enforceTypingStoreLimit() {
  if (typingStore.size >= TYPING_MAX_ENTRIES) {
    const oldest = [...typingStore.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) typingStore.delete(oldest[0]);
  }
}

const typingSchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const body = await request.json();
    const { matchId } = typingSchema.parse(body);

    const match = await db.match.findUnique({ id: matchId });
    if (!match || (match.user1Id !== user.id && match.user2Id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    enforceTypingStoreLimit();
    const storeKey = `${matchId}:${user.id}`;
    typingStore.set(storeKey, { userId: user.id, matchId, timestamp: Date.now() });
    ensureCleanup();

    messageBus.publish(`typing:${matchId}`, { userId: user.id, matchId, typing: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('/api/messages/typing', 'Typing signal error', error);
    return NextResponse.json({ error: 'Failed to send typing signal' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId parameter' }, { status: 400 });
    }

    const match = await db.match.findUnique({ id: matchId });
    if (!match || (match.user1Id !== user.id && match.user2Id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const partnerId = match.user1Id === user.id ? match.user2Id : match.user1Id;
    const partnerKey = `${matchId}:${partnerId}`;
    const typingEntry = typingStore.get(partnerKey);

    if (typingEntry && typingEntry.userId === partnerId && Date.now() - typingEntry.timestamp < TYPING_EXPIRY_MS) {
      return NextResponse.json({ typing: true });
    }

    return NextResponse.json({ typing: false });
  } catch (error) {
    logger.error('/api/messages/typing', 'Typing check error', error);
    return NextResponse.json({ typing: false });
  }
}
