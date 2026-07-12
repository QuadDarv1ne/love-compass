import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/guard';
import { messageBus } from '@/lib/sse';
import { logger } from '@/lib/logger';

const HEARTBEAT_INTERVAL_MS = 30_000;
const CLIENT_TIMEOUT_MS = 120_000;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const user = auth.user;

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:heartbeat\n\n`));
        } catch (err) {
          logger.warn('sse.stream', 'Heartbeat enqueue failed', err);
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL_MS);

      const timeoutTimer = setTimeout(() => {
        controller.enqueue(encoder.encode(`event: close\ndata: timeout\n\n`));
        controller.close();
        clearInterval(heartbeatTimer);
      }, CLIENT_TIMEOUT_MS);

      const eventId = `${matchId}`;

      const unsubscribeMessage = messageBus.subscribe(`message:${eventId}`, (data) => {
        try {
          const msg = data as Record<string, unknown>;
          if (msg && msg.senderId !== user.id) {
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          logger.warn('sse.stream', 'Message enqueue failed — client may have disconnected');
        }
      });

      const unsubscribeTyping = messageBus.subscribe(`typing:${eventId}`, (data) => {
        try {
          const evt = data as Record<string, unknown>;
          if (evt && evt.userId === partnerId) {
            controller.enqueue(encoder.encode(`event: typing\ndata: ${JSON.stringify(data)}\n\n`));
          }
        } catch {
          logger.warn('sse.stream', 'Typing enqueue failed — client may have disconnected');
        }
      });

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        clearTimeout(timeoutTimer);
        unsubscribeMessage();
        unsubscribeTyping();
      });
    },
  });

  logger.info('sse.stream', `SSE connected for match ${matchId}`, { userId: user.id });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
