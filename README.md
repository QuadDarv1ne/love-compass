# Love Compass — Приложение для знакомств

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6.11-2d3748?logo=prisma)
![License](https://img.shields.io/badge/License-MIT-green)

**Автор:** Дуплей Максим Игоревич (Dupley Maxim Igorevich)

**Проект школы программирования:** Maestro7IT

---

## О проекте

`Love Compass` — это веб-приложение для знакомств, позволяющее пользователям находить пары, обмениваться симпатиями и общаться в реальном времени. Проект разработан как полноценный продукт с современным стеком технологий, включающий систему профилей, алгоритм подбора пар, механизм лайков, систему совпадений (мэтчей) и встроенный чат.

Приложение предоставляет интуитивный интерфейс с карточками профилей, анимацией совпадений, системой достижений и разделами «Моменты», «Топ» и «Настройки». Все данные хранятся в базе данных через `Prisma ORM`

---

## Возможности

### Основные разделы

| Раздел | Описание |
|--------|----------|
| **Обзор профилей** | Просмотр карточек пользователей с возможностью лайка/дизлайка |
| **Совпадения** | Список совпавших пар с возможностью начала диалога |
| **Чат** | Обмен сообщениями с совпавшими пользователями |
| **Мои лайки** | Просмотр пользователей, которым вы понравились |
| **Моменты** | Публикация и просмотр моментов (фото/контент) |
| **Топ** | Рейтинг популярных профилей |
| **Достижения** | Система геймификации с разблокируемыми достижениями |
| **Профиль** | Редактирование личной информации и настроек |

### API-маршруты

- **`/api/profile`** — управление профилем пользователя
- **`/api/profiles`** — получение списка профилей для просмотра
- **`/api/like`** — отправка лайков
- **`/api/likes/received`** — получение входящих лайков
- **`/api/matches`** — управление совпадениями
- **`/api/messages`** — отправка и получение сообщений

---

## Технологический стек

- **Backend:** Next.js 16, React 19, TypeScript
- **Стилизация:** Tailwind CSS 4, shadcn/ui
- **Анимации:** Framer Motion
- **База данных:** Multi-DB Adapter (SQLite, PostgreSQL, MongoDB)
- **Аутентификация:** Custom JWT/session-based auth с 2FA (TOTP)
- **Управление состоянием:** Zustand
- **Формы:** React Hook Form + Zod
- **Иконки:** Lucide React
- **Сборщик:** Bun
- **Интерфейс:** Radix UI (50+ компонентов)

---

## Поддержка баз данных

Приложение поддерживает **3 базы данных** с автоматическим определением типа по `DATABASE_URL`:

| База данных | Формат DATABASE_URL | DB_PROVIDER | Где работает |
|-------------|---------------------|-------------|--------------|
| **SQLite** | `file:./db/custom.db` | `sqlite` | Локальная разработка, VPS, Docker |
| **PostgreSQL** | `postgresql://user:pass@host/db` | `postgresql` | Vercel, Railway, Neon, Supabase |
| **MongoDB** | `mongodb://host/db` или `mongodb+srv://...` | _(авто)_ | Vercel, MongoDB Atlas, любой cloud |

### Автоопределение

Файл `src/lib/db.ts` автоматически определяет тип базы данных по формату URL:
- `file:` или `sqlite:` → SQLite (через Prisma)
- `postgresql://` или `postgres://` → PostgreSQL (через Prisma)
- `mongodb://` или `mongodb+srv://` → MongoDB (через нативный драйвер)

### Настройка для деплоя

**Vercel / Cloud платформы (рекомендуется PostgreSQL):**
```env
DATABASE_URL=postgresql://user:password@db.neon.tech/love_compass
DB_PROVIDER=postgresql
```

**MongoDB Atlas:**
```env
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/love_compass
```

**Локальная разработка (SQLite):**
```env
DATABASE_URL=file:./db/custom.db
DB_PROVIDER=sqlite
```

---

## Структура проекта

```
love-compass/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Корневой layout приложения
│   │   ├── page.tsx                # Главная страница
│   │   ├── globals.css             # Глобальные стили
│   │   └── api/
│   │       ├── profile/route.ts    # API профиля
│   │       ├── profiles/route.ts   # API списка профилей
│   │       ├── like/route.ts       # API лайков
│   │       ├── likes/received/     # Входящие лайки
│   │       ├── matches/route.ts    # API совпадений
│   │       └── messages/route.ts   # API сообщений
│   ├── components/
│   │   ├── views/
│   │   │   ├── browse-view.tsx         # Просмотр профилей
│   │   │   ├── matches-view.tsx        # Совпадения
│   │   │   ├── chat-view.tsx           # Чат
│   │   │   ├── liked-you-view.tsx      # Лайки
│   │   │   ├── moments-view.tsx        # Моменты
│   │   │   ├── top-view.tsx            # Топ
│   │   │   ├── achievements-view.tsx   # Достижения
│   │   │   ├── profile-view.tsx        # Профиль
│   │   │   ├── settings-view.tsx       # Настройки
│   │   │   ├── landing-view.tsx        # Лендинг
│   │   │   ├── match-animation-overlay.tsx # Анимация мэтча
│   │   │   └── shared.tsx              # Общие компоненты
│   │   └── ui/                     # Библиотека shadcn/ui компонентов
│   ├── lib/
│   │   ├── db.ts                   # Prisma клиент
│   │   ├── store.ts                # Zustand store
│   │   └── utils.ts                # Утилиты
│   └── hooks/
│       ├── use-mobile.ts           # Хук определения мобильного устройства
│       └── use-toast.ts            # Хук уведомлений
├── prisma/
│   └── schema.prisma               # Схема базы данных
├── public/
│   ├── logo.png                    # Логотип
│   ├── logo.svg                    # Логотип (SVG)
│   └── robots.txt
├── LICENSE                         # Лицензия
├── README.md                       # Документация проекта
├── seed.ts                         # Начальные данные
├── Caddyfile                       # Конфигурация Caddy
├── package.json                    # Зависимости и скрипты
├── tsconfig.json                   # Конфигурация TypeScript
├── next.config.ts                  # Конфигурация Next.js
├── tailwind.config.ts              # Конфигурация Tailwind CSS
└── eslint.config.mjs               # Конфигурация ESLint
```

---

## Установка и запуск

### Требования

- **Node.js** 18.17 или выше
- **Bun** 1.0 или выше (рекомендуется)
- **База данных:** SQLite (локально), PostgreSQL или MongoDB (для деплоя)

### Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd love-compass

# Установка зависимостей
bun install

# Генерация Prisma клиента (для SQLite/PostgreSQL)
bun run db:generate

# Применение схемы базы данных
bun run db:push

# Заполнение начальными данными (опционально)
bun run seed
```

### Деплой на Vercel

1. Создайте базу данных PostgreSQL (Neon, Supabase, Railway)
2. В настройках Vercel добавьте переменные окружения:
   - `DATABASE_URL` — строка подключения PostgreSQL
   - `DB_PROVIDER=postgresql`
   - `JWT_SECRET` — случайная строка (генерация: `openssl rand -base64 32`)
   - `RESEND_API_KEY` — ключ от Resend для email
   - `NEXT_PUBLIC_APP_URL` — URL вашего приложения
3. Подключите репозиторий к Vercel и деплой запустится автоматически

### Деплой на VPS (Docker)

```bash
# В .env файле настройте SQLite или PostgreSQL
DATABASE_URL=file:./db/custom.db
DB_PROVIDER=sqlite

# Сборка и запуск
docker build -t love-compass -f deploy/Dockerfile .
docker run -p 3000:3000 --env-file .env love-compass
```

### Запуск в режиме разработки

```bash
bun run dev
```

Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)

### Сборка для продакшена

```bash
bun run build
bun run start
```

---

## Использование

1. Откройте приложение в браузере
2. Создайте или войдите в свой профиль
3. Просматривайте карточки пользователей в разделе **Обзор**
4. Ставьте лайки понравившимся профилям
5. При совпадении лайков открывается возможность начать **чат**
6. Просматривайте входящие лайки в разделе **Лайки**
7. Публикуйте и просматривайте **моменты**
8. Отслеживайте **достижения** и настраивайте профиль

---

## Лицензия

Проект распространяется под лицензией `MIT` с сохранением интеллектуальной собственности.

- **Владелец:** Дуплей Максим Игоревич (Dupley Maxim Igorevich)
- См. файл [LICENSE](./LICENSE) для подробностей.

---

## Контакт

**Дуплей Максим Игоревич**
Школа программирования: Maestro7IT
