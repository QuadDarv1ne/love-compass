import { db } from './src/lib/db';
import { hashPassword } from './src/lib/auth/password';
import { AVATAR_BASE_URL } from './src/lib/constants';

const DEFAULT_PASSWORD = crypto.randomUUID().slice(0, 12) + '!A1';

async function main() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const users = [
    // ─── Admin ───────────────────────────────────────────────
    {
      email: "admin@lovecompass.com",
      passwordHash,
      name: "Админ",
      age: 30,
      gender: "other",
      bio: "Администратор платформы Love Compass",
      interests: "администрирование, безопасность",
      avatar: `${AVATAR_BASE_URL}?seed=Admin`,
      city: "Москва",
      lookingFor: "all",
      emailVerified: true,
      role: "admin",
    },
    // ─── Русские ────────────────────────────────────────────
    {
      email: "anna@example.com",
      passwordHash,
      name: "Анна",
      age: 24,
      gender: "female",
      bio: "Люблю путешествия и фотографию. Ищу интересного собеседника для начала.",
      interests: "путешествия, фотография, йога",
      avatar: `${AVATAR_BASE_URL}?seed=Anastasia`,
      city: "Москва",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "dmitry@example.com",
      passwordHash,
      name: "Дмитрий",
      age: 27,
      gender: "male",
      bio: "Программист днём, гитарист вечером. Люблю активный отдых.",
      interests: "музыка, программирование, спорт",
      avatar: `${AVATAR_BASE_URL}?seed=Dmitry`,
      city: "Санкт-Петербург",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "ekaterina@example.com",
      passwordHash,
      name: "Екатерина",
      age: 22,
      gender: "female",
      bio: "Студентка медицинского. Верю в любовь с первого взгляда!",
      interests: "медицина, танцы, кулинария",
      avatar: `${AVATAR_BASE_URL}?seed=Ekaterina`,
      city: "Москва",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "maxim@example.com",
      passwordHash,
      name: "Максим",
      age: 29,
      gender: "male",
      bio: "Предприниматель, обожаю новые знакомства и приключения.",
      interests: "бизнес, путешествия, автоспорт",
      avatar: `${AVATAR_BASE_URL}?seed=Maxim`,
      city: "Казань",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "olga@example.com",
      passwordHash,
      name: "Ольга",
      age: 26,
      gender: "female",
      bio: "Дизайнер интерьеров. Создаю красоту вокруг себя!",
      interests: "дизайн, искусство, вино",
      avatar: `${AVATAR_BASE_URL}?seed=Olga`,
      city: "Санкт-Петербург",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "artem@example.com",
      passwordHash,
      name: "Артём",
      age: 25,
      gender: "male",
      bio: "Фитнес-тренер. Помогу тебе стать лучшей версией себя!",
      interests: "фитнес, нутрициология, кино",
      avatar: `${AVATAR_BASE_URL}?seed=Artem`,
      city: "Новосибирск",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "maria@example.com",
      passwordHash,
      name: "Мария",
      age: 23,
      gender: "female",
      bio: "Журналист. Люблю истории, которые вдохновляют.",
      interests: "журналистика, книги, кофе",
      avatar: `${AVATAR_BASE_URL}?seed=Maria`,
      city: "Екатеринбург",
      lookingFor: "all",
      emailVerified: true,
    },
    {
      email: "nikita@example.com",
      passwordHash,
      name: "Никита",
      age: 28,
      gender: "male",
      bio: "Инженер и музыкант. Жизнь — это музыка!",
      interests: "музыка, инженерия, настольные игры",
      avatar: `${AVATAR_BASE_URL}?seed=Nikita`,
      city: "Москва",
      lookingFor: "all",
      emailVerified: true,
    },

    // ─── Новые: разные национальности ────────────────────────

    // Славянка (блондинка)
    {
      email: "natasha@example.com",
      passwordHash,
      name: "Наташа",
      age: 25,
      gender: "female",
      bio: "Флорист из Петербурга. Верю, что цветы говорят сильнее слов.",
      interests: "флористика, живопись, лошади",
      avatar: `${AVATAR_BASE_URL}?seed=Natalia`,
      city: "Санкт-Петербург",
      lookingFor: "all",
      emailVerified: true,
    },
    // Кореец
    {
      email: "minjun@example.com",
      passwordHash,
      name: "Минджун",
      age: 26,
      gender: "male",
      bio: "Архитектор из Сеула. Влюблён в Петербург и российскую культуру.",
      interests: "архитектура, K-pop, кулинария",
      avatar: `${AVATAR_BASE_URL}?seed=Minjun`,
      city: "Сеул",
      lookingFor: "all",
      emailVerified: true,
    },
    // Латиноамериканка
    {
      email: "sofia@example.com",
      passwordHash,
      name: "София",
      age: 24,
      gender: "female",
      bio: "Танцовщица сальсы из Боготы. Ритм — это мой язык!",
      interests: "сальса, танцы, испанский язык",
      avatar: `${AVATAR_BASE_URL}?seed=Sofia`,
      city: "Богота",
      lookingFor: "all",
      emailVerified: true,
    },
    // Индиец
    {
      email: "raj@example.com",
      passwordHash,
      name: "Радж",
      age: 28,
      gender: "male",
      bio: "Разработчик из Мумбаи. Обожаю болливуд и острую еду!",
      interests: "IT, крикет, путешествия",
      avatar: `${AVATAR_BASE_URL}?seed=Raj`,
      city: "Мумбаи",
      lookingFor: "all",
      emailVerified: true,
    },
    // Метиска
    {
      email: "amara@example.com",
      passwordHash,
      name: "Амара",
      age: 23,
      gender: "female",
      bio: "Модель и художница. Люблю создавать искусство и знакомиться с новыми людьми.",
      interests: "живопись, мода, йога",
      avatar: `${AVATAR_BASE_URL}?seed=Amara`,
      city: "Лондон",
      lookingFor: "all",
      emailVerified: true,
    },
    // Шотландец (рыжий)
    {
      email: "aidan@example.com",
      passwordHash,
      name: "Эйдан",
      age: 27,
      gender: "male",
      bio: "Бариста из Эдинбурга. Сделаю лучший капучино в твоей жизни!",
      interests: "кофе, музыка, хайкинг",
      avatar: `${AVATAR_BASE_URL}?seed=Aidan`,
      city: "Эдинбург",
      lookingFor: "all",
      emailVerified: true,
    },
    // Японка
    {
      email: "sakura@example.com",
      passwordHash,
      name: "Сакура",
      age: 22,
      gender: "female",
      bio: "Аниматор из Токио. Рисую мангу и мечтаю увидеть северное сияние.",
      interests: "аниме, манга, японская кухня",
      avatar: `${AVATAR_BASE_URL}?seed=Sakura`,
      city: "Токио",
      lookingFor: "all",
      emailVerified: true,
    },
    // Африканец
    {
      email: "kwame@example.com",
      passwordHash,
      name: "Кваме",
      age: 26,
      gender: "male",
      bio: "Спортивный врач из Аккры. Спорт, здоровье и позитив — мой образ жизни!",
      interests: "медицина, футбол, регги",
      avatar: `${AVATAR_BASE_URL}?seed=Kwame`,
      city: "Аккра",
      lookingFor: "all",
      emailVerified: true,
    },
    // Француженка
    {
      email: "camille@example.com",
      passwordHash,
      name: "Камилла",
      age: 25,
      gender: "female",
      bio: "Повар-кондитер из Лиона. Приготовлю круассаны на завтрак!",
      interests: "кулинария, вино, мода",
      avatar: `${AVATAR_BASE_URL}?seed=Camille`,
      city: "Лион",
      lookingFor: "all",
      emailVerified: true,
    },
    // Скандинав (светлый)
    {
      email: "erik@example.com",
      passwordHash,
      name: "Эрик",
      age: 24,
      gender: "male",
      bio: "Лыжный инструктор из Осло. Приглашу на горы — будет незабываемо!",
      interests: "лыжи, сёрфинг, природа",
      avatar: `${AVATAR_BASE_URL}?seed=Erik`,
      city: "Осло",
      lookingFor: "all",
      emailVerified: true,
    },
    // Арабка
    {
      email: "layla@example.com",
      passwordHash,
      name: "Лейла",
      age: 27,
      gender: "female",
      bio: "Архитектор из Дубая. Строю будущее и ищу надёжного партнёра.",
      interests: "архитектура, литература, путешествия",
      avatar: `${AVATAR_BASE_URL}?seed=Layla`,
      city: "Дубай",
      lookingFor: "all",
      emailVerified: true,
    },
    // Бразилец
    {
      email: "lucas@example.com",
      passwordHash,
      name: "Лукас",
      age: 26,
      gender: "male",
      bio: "Фитнес-тренер из Рио. Жизнь — это карнавал, давай танцевать!",
      interests: "фитнес, капоэйра, серфинг",
      avatar: `${AVATAR_BASE_URL}?seed=Lucas`,
      city: "Рио-де-Жанейро",
      lookingFor: "all",
      emailVerified: true,
    },
  ];

  for (const user of users) {
    await db.user.upsert({ email: user.email }, user, {});
  }

  const totalUsers = await db.user.count();
  console.warn(`✅ ${totalUsers} пользователей в базе`);
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`🔑 Пароль для входа: ${DEFAULT_PASSWORD}`);
  }

  // Ensure at least one admin exists
  const adminCount = await db.user.count({ role: 'admin' });
  if (adminCount === 0) {
    const firstUsers = await db.user.findMany({}, { take: 1 });
    const firstUser = firstUsers[0];
    if (firstUser) {
      await db.user.update({ id: firstUser.id }, { role: 'admin' });
      console.warn(`👑 User "${firstUser.name}" promoted to admin`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.disconnect();
  });
