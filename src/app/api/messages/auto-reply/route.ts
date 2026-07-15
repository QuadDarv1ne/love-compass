import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuthWithCSRF, isZodError } from '@/lib/auth/guard';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { logger } from '@/lib/logger';
import { AUTO_REPLY } from '@/lib/constants';
import { messageBus } from '@/lib/sse';

const autoReplySchema = z.object({
  matchId: z.string().min(1),
});

const AUTO_REPLIES: Record<string, string[]> = {
  ru: [
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
  ],
  en: [
    'Hey! How are you? 😊',
    'Nice to meet you!',
    'Tell me more about yourself!',
    'What are your interests?',
    'Do you love traveling? ✈️',
    'How long have you been here?',
    'You have a beautiful photo! 💕',
    'What do you do in your free time?',
    'Let\'s meet up! ☕',
    'What\'s your favorite movie?',
    'I love music! What do you listen to?',
    'You seem like a very interesting person!',
    'Hey! Glad we matched!',
    'I dream of visiting Japan 🗼',
    'Cats or dogs? 🐱🐶',
    'I\'ve been looking for company like this!',
    'We have so much in common!',
    'What\'s your most vivid memory?',
    'I love your style! 🔥',
    'Where are you from?',
  ],
  zh: [
    '你好！最近怎么样？😊',
    '很高兴认识你！',
    '多介绍一下你自己吧！',
    '你有什么兴趣爱好？',
    '你喜欢旅行吗？✈️',
    '你注册很久了吗？',
    '你的照片很好看！💕',
    '你空闲时间做什么？',
    '一起出来见面吧！☕',
    '你最喜欢的电影是什么？',
    '我超喜欢音乐！你听什么？',
    '你看起来是个很有趣的人！',
    '你好！很高兴匹配成功！',
    '我梦想去日本 🗼',
    '你喜欢猫还是狗？🐱🐶',
    '我一直在找这样的伙伴！',
    '我们有好多共同点！',
    '你印象最深的回忆是什么？',
    '我很喜欢你的风格！🔥',
    '你是哪里人？',
  ],
  es: [
    '¡Hola! ¿Cómo estás? 😊',
    '¡Mucho gusto!',
    '¡Cuéntame más sobre ti!',
    '¿Cuáles son tus intereses?',
    '¿Te gusta viajar? ✈️',
    '¿Cuánto tiempo llevas aquí?',
    '¡Tienes una foto muy bonita! 💕',
    '¿A qué te dedicas en tu tiempo libre?',
    '¡Salamos! ☕',
    '¿Cuál es tu película favorita?',
    '¡Me encanta la música! ¿Qué escuchas?',
    '¡Pareces una persona muy interesante!',
    '¡Hola! ¡Me alegra que hayamos hecho match!',
    'Sueño con visitar Japón 🗼',
    '¿Gatos o perros? 🐱🐶',
    '¡Llevaba tiempo buscando compañía como esta!',
    '¡Tenemos mucho en común!',
    '¿Cuál es tu recuerdo más vívido?',
    '¡Me encanta tu estilo! 🔥',
    '¿De dónde eres?',
  ],
};

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
        { error: 'Too many requests, try again later' },
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

    // Check block status: don't auto-reply if either user blocked the other
    const [blockByUser, blockByPartner] = await Promise.all([
      db.block.findUnique({ blockerId: user.id, blockedId: partnerId }),
      db.block.findUnique({ blockerId: partnerId, blockedId: user.id }),
    ]);
    if (blockByUser || blockByPartner) {
      return NextResponse.json({ error: 'Unable to send message' }, { status: 403 });
    }

    // Fetch sender data first to get their language, then create message
    const sender = await db.user.findUnique({ id: partnerId });
    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    const locale = sender.language || 'ru';
    const replies = AUTO_REPLIES[locale] || AUTO_REPLIES.ru!;

    const createdMessage = await db.message.create({
      matchId,
      senderId: partnerId,
      content: replies[Math.floor(Math.random() * replies.length)],
    });

    const message = {
      ...createdMessage,
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar },
    };

    messageBus.publish(`message:${matchId}`, message);

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
