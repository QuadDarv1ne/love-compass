import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';

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
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Auto-reply is only available in demo mode' },
      { status: 403 }
    );
  }

  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { user } = auth;

    // Rate limit: max 5 auto-replies per minute per user
    const rateLimit = await checkRateLimit(
      `auto-reply:${user.id}`,
      5,
      60,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов, попробуйте позже' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { matchId } = autoReplySchema.parse(body);

    const match = await db.match.findUnique({
      where: { id: matchId },
      include: {
        user1: { select: { id: true, name: true, avatar: true } },
        user2: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!match || (match.user1Id !== user.id && match.user2Id !== user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine the partner (the other participant)
    const partner = match.user1Id === user.id ? match.user2 : match.user1;

    const replyText = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];

    const message = await db.message.create({
      data: {
        matchId,
        senderId: partner.id,
        content: replyText,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Auto-reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send auto-reply' },
      { status: 500 }
    );
  }
}
