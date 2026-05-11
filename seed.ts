import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.user.deleteMany();

  const users = [
    // ─── Русские ────────────────────────────────────────────
    {
      email: "anna@example.com",
      name: "Анна",
      age: 24,
      gender: "female",
      bio: "Люблю путешествия и фотографию. Ищу интересного собеседника для начала.",
      interests: "путешествия, фотография, йога",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Anastasia",
      city: "Москва",
      lookingFor: "all",
    },
    {
      email: "dmitry@example.com",
      name: "Дмитрий",
      age: 27,
      gender: "male",
      bio: "Программист днём, гитарист вечером. Люблю активный отдых.",
      interests: "музыка, программирование, спорт",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Dmitry",
      city: "Санкт-Петербург",
      lookingFor: "all",
    },
    {
      email: "ekaterina@example.com",
      name: "Екатерина",
      age: 22,
      gender: "female",
      bio: "Студентка медицинского. Верю в любовь с первого взгляда!",
      interests: "медицина, танцы, кулинария",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Ekaterina",
      city: "Москва",
      lookingFor: "all",
    },
    {
      email: "maxim@example.com",
      name: "Максим",
      age: 29,
      gender: "male",
      bio: "Предприниматель, обожаю новые знакомства и приключения.",
      interests: "бизнес, путешествия, автоспорт",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Maxim",
      city: "Казань",
      lookingFor: "all",
    },
    {
      email: "olga@example.com",
      name: "Ольга",
      age: 26,
      gender: "female",
      bio: "Дизайнер интерьеров. Создаю красоту вокруг себя!",
      interests: "дизайн, искусство, вино",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Olga",
      city: "Санкт-Петербург",
      lookingFor: "all",
    },
    {
      email: "artem@example.com",
      name: "Артём",
      age: 25,
      gender: "male",
      bio: "Фитнес-тренер. Помогу тебе стать лучшей версией себя!",
      interests: "фитнес, нутрициология, кино",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Artem",
      city: "Новосибирск",
      lookingFor: "all",
    },
    {
      email: "maria@example.com",
      name: "Мария",
      age: 23,
      gender: "female",
      bio: "Журналист. Люблю истории, которые вдохновляют.",
      interests: "журналистика, книги, кофе",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Maria",
      city: "Екатеринбург",
      lookingFor: "all",
    },
    {
      email: "nikita@example.com",
      name: "Никита",
      age: 28,
      gender: "male",
      bio: "Инженер и музыкант. Жизнь — это музыка!",
      interests: "музыка, инженерия, настольные игры",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Nikita",
      city: "Москва",
      lookingFor: "all",
    },

    // ─── Новые: разные национальности ────────────────────────

    // Славянка (блондинка)
    {
      email: "natasha@example.com",
      name: "Наташа",
      age: 25,
      gender: "female",
      bio: "Флорист из Петербурга. Верю, что цветы говорят сильнее слов.",
      interests: "флористика, живопись, лошади",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Natalia",
      city: "Санкт-Петербург",
      lookingFor: "all",
    },
    // Кореец
    {
      email: "minjun@example.com",
      name: "Минджун",
      age: 26,
      gender: "male",
      bio: "Архитектор из Сеула. Влюблён в Петербург и российскую культуру.",
      interests: "архитектура, K-pop, кулинария",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Minjun",
      city: "Сеул",
      lookingFor: "all",
    },
    // Латиноамериканка
    {
      email: "sofia@example.com",
      name: "София",
      age: 24,
      gender: "female",
      bio: "Танцовщица сальсы из Боготы. Ритм — это мой язык!",
      interests: "сальса, танцы, испанский язык",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Sofia",
      city: "Богота",
      lookingFor: "all",
    },
    // Индиец
    {
      email: "raj@example.com",
      name: "Радж",
      age: 28,
      gender: "male",
      bio: "Разработчик из Мумбаи. Обожаю болливуд и острую еду!",
      interests: "IT, крикет, путешествия",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Raj",
      city: "Мумбаи",
      lookingFor: "all",
    },
    // Метиска
    {
      email: "amara@example.com",
      name: "Амара",
      age: 23,
      gender: "female",
      bio: "Модель и художница. Люблю создавать искусство и знакомиться с новыми людьми.",
      interests: "живопись, мода, йога",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Amara",
      city: "Лондон",
      lookingFor: "all",
    },
    // Шотландец (рыжий)
    {
      email: "aidan@example.com",
      name: "Эйдан",
      age: 27,
      gender: "male",
      bio: "Бариста из Эдинбурга. Сделаю лучший капучино в твоей жизни!",
      interests: "кофе, музыка, хайкинг",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Aidan",
      city: "Эдинбург",
      lookingFor: "all",
    },
    // Японка
    {
      email: "sakura@example.com",
      name: "Сакура",
      age: 22,
      gender: "female",
      bio: "Аниматор из Токио. Рисую мангу и мечтаю увидеть северное сияние.",
      interests: "аниме, манга, японская кухня",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Sakura",
      city: "Токио",
      lookingFor: "all",
    },
    // Африканец
    {
      email: "kwame@example.com",
      name: "Кваме",
      age: 26,
      gender: "male",
      bio: "Спортивный врач из Аккры. Спорт, здоровье и позитив — мой образ жизни!",
      interests: "медицина, футбол, регги",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Kwame",
      city: "Аккра",
      lookingFor: "all",
    },
    // Француженка
    {
      email: "camille@example.com",
      name: "Камилла",
      age: 25,
      gender: "female",
      bio: "Повар-кондитер из Лиона. Приготовлю круассаны на завтрак!",
      interests: "кулинария, вино, мода",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Camille",
      city: "Лион",
      lookingFor: "all",
    },
    // Скандинав (светлый)
    {
      email: "erik@example.com",
      name: "Эрик",
      age: 24,
      gender: "male",
      bio: "Лыжный инструктор из Осло. Приглашу на горы — будет незабываемо!",
      interests: "лыжи, сёрфинг, природа",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Erik",
      city: "Осло",
      lookingFor: "all",
    },
    // Арабка
    {
      email: "layla@example.com",
      name: "Лейла",
      age: 27,
      gender: "female",
      bio: "Архитектор из Дубая. Строю будущее и ищу надёжного партнёра.",
      interests: "архитектура, литература, путешествия",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Layla",
      city: "Дубай",
      lookingFor: "all",
    },
    // Бразилец
    {
      email: "lucas@example.com",
      name: "Лукас",
      age: 26,
      gender: "male",
      bio: "Фитнес-тренер из Рио. Жизнь — это карнавал, давай танцевать!",
      interests: "фитнес, капоэйра, серфинг",
      avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=Lucas",
      city: "Рио-де-Жанейро",
      lookingFor: "all",
    },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.warn(`✅ Создано ${users.length} пользователей`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
