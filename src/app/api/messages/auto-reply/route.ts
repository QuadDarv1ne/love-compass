import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { AUTO_REPLY } from '@/lib/constants';

const autoReplySchema = z.object({
  matchId: z.string().min(1),
});

const AUTO_REPLIES = [
  'Привет! Как дела? 😊',
  'Очень приятно познакомиться!',
  'Расскажи о себе больше!',
  'Ты тоже из России? Класс!',
  'Какие у тебя интересы?',
  'Любишь путешествовать? ✈️',
  'Давно здесь зарегистрирован(а)?',
  'У тебя очень красивое фото! 💕',
  'Чем занимаешься в свободное время?',
  'Давай встретимся! ☕',
  'Какой твой любимый фильм?',
  'Обожаю музыку! Что слушаешь?',
  'Ты кажешься очень интересным человеком!',
  'Привет! Рад(а) нашему мэтчу!',
  'Мечтаю посетить Японию 🗼',
  'Кошки или собаки? 🐱🐶',
  'Давно искал(а) такую компанию!',
  'У нас так много общего!',
  'Какое у тебя самое яркое воспоминание?',
  'Мне нравится твой стиль! 🔥',
];

export async function POST(request: Request) {
  if (process.env.DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Auto-reply is only available in demo mode' },
      { status: 403 }
    );
  }

  try {
    const auth = await requireAuthWithCSRF(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Rate limit: max 5 auto-replies per minute per user
    const rateLimit = await checkRateLimit(
      `auto-reply:${user.id}`,
      AUTO_REPLY.RATE_LIMIT_MAX,
      AUTO_REPLY.RATE_LIMIT_WINDOW,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов, попробуйте позже' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { matchId } = autoReplySchema.parse(body);

    const match = await db.match.findUnique({ id: matchId });

    if (!match || (match.user1Id !== user.id && match.user2Id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine the partner (the other participant)
    const partnerId = match.user1Id === user.id ? match.user2Id : match.user1Id;

    // Fetch sender data and create message
    const [sender, createdMessage] = await Promise.all([
      db.user.findUnique({ id: partnerId }),
      db.message.create({
        matchId,
        senderId: partnerId,
        content: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
      }),
    ]);

    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    const message = {
      ...createdMessage,
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    };

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    logger.error('/api/messages/auto-reply', 'Auto-reply error', error);
    return NextResponse.json(
      { error: 'Failed to send auto-reply' },
      { status: 500 }
    );
  }
}
