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

`Love Compass` — полнофункциональное веб-приложение для знакомств с современным стеком технологий. Реализованы система профилей, алгоритм рекомендаций на основе интересов, лайки/дизлайки/суперлайки, система мэтчей, real-time чат (SSE), моменты, достижения, рейтинг, админ-панель, двухфакторная аутентификация, интернационализация (4 языка) и защита от атак.

---

## Возможности

### Основные разделы

| Раздел | Описание |
|--------|----------|
| **Обзор профилей** | Карточки с drag-to-swipe, лайк/дизлайк/суперлайк, undo, детальный просмотр, блокировка/жалоба |
| **Совпадения (Matches)** | Список мэтчей с последним сообщением, статус онлайн, индикатор новых сообщений |
| **Чат (Real-time)** | SSE-based обмен сообщениями, индикатор печатания, эмодзи-пикер, поиск по истории |
| **Кто лайкнул** | Просмотр входящих лайков с возможностью ответить взаимностью |
| **Моменты** | Публикация текстовых моментов, лайки, комментарии, реакции (эмодзи) |
| **Топ** | Три вкладки: популярные (по лайкам), активные (по мэтчам), новые пользователи |
| **Достижения** | 10 достижений в 4 категориях с прогрессом и анимацией |
| **Профиль** | Редактирование данных, аватар, загрузка фото, верификация |
| **Настройки** | 4 темы, уведомления, приватность, 2FA, смена пароля, удаление аккаунта, 4 языка |
| **Админ-панель** | Список пользователей с поиском/фильтром, статистика платформы, управление ролями |

### Безопасность

| Механизм | Описание |
|----------|----------|
| **Сессии** | httpOnly cookies + sliding expiration |
| **CSRF** | Double-submit cookie pattern (__csrf cookie + x-csrf-token header) |
| **2FA/TOTP** | Google Authenticator, резервные коды, защита от replay |
| **Rate Limiting** | In-memory (middleware) + DB-backed для каждого эндпоинта |
| **Блокировка аккаунта** | После N неудачных попыток входа |
| **Валидация** | Zod на каждом API-маршруте |
| **CORS** | Проверка Origin в production |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| **Пароли** | bcryptjs (12 раундов), проверка сложности |

---

## Технологический стек

- **Frontend:** Next.js 16, React 19, TypeScript 5 (strict)
- **Стилизация:** Tailwind CSS 4, shadcn/ui, Framer Motion
- **Состояние:** Zustand 5 (атомарные обновления, без race conditions)
- **База данных:** Multi-DB Adapter — SQLite / PostgreSQL / MongoDB
- **ORM:** Prisma 6.11 + нативный MongoDB драйвер
- **Аутентификация:** Session-based + JWT (temp tokens для 2FA), bcryptjs
- **Real-time:** Server-Sent Events (EventSource) с auto-reconnect
- **i18n:** Собственная лёгкая система (ru, en, zh, es) — ~320 ключей
- **Формы:** React Hook Form + Zod 4
- **Тесты:** Vitest (unit) + Playwright (E2E)
- **Инфраструктура:** Docker, Docker Swarm, Kubernetes, Caddy, GitHub Actions

---

## Архитектура

```
                    ┌──────────────────────────┐
                    │     Next.js 16 App        │
                    │  (Edge + Node Runtime)     │
                    └──────────┬───────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
  ┌───────▼───────┐   ┌───────▼───────┐    ┌───────▼───────┐
  │ Middleware     │   │ API Routes    │    │ Client Pages  │
  │ Rate Limiting │   │ 38 endpoints  │    │ 12 views      │
  │ Auth Check    │   │ JWT/Sessions  │    │ Lazy loaded   │
  │ CORS/Security │   │ Zod validation│    │ Zustand store │
  └───────┬───────┘   └───────┬───────┘    └───────┬───────┘
          │                    │                    │
          │         ┌──────────▼──────────┐         │
          │         │  Message Bus (SSE)   │         │
          │         │  (src/lib/sse.ts)    │         │
          │         └──────────┬──────────┘         │
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Database Adapter   │
                    │  (Prisma / MongoDB) │
                    └─────────────────────┘
```

### Ключевые модули

| Модуль | Назначение |
|--------|------------|
| `src/lib/sse.ts` | In-memory pub/sub для real-time событий (чат, печатание) |
| `src/lib/scoring.ts` | Алгоритм рекомендаций — Jaccard similarity по интересам + совместимость по возрасту |
| `src/lib/store.ts` | Zustand store с атомарными обновлениями и factory-сеттерами |
| `src/lib/auth/` | Guard, CSRF, JWT, TOTP, rate-limit, session management |
| `src/lib/db/` | Multi-adapter: PrismaAdapter (SQLite/PG), MongoDBAdapter |
| `src/lib/i18n.ts` | 4 языка, auto-detect браузера, fallback на русский |
| `middleware.ts` | Edge middleware: rate limiting, auth, CORS, request logging |

---

## API Эндпоинты

### Auth (14 эндпоинтов)
`/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/session`,
`/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-email`,
`/api/auth/change-password`, `/api/auth/csrf-token`, `/api/auth/demo-login`,
`/api/auth/2fa/setup`, `/api/auth/2fa/enable`, `/api/auth/2fa/disable`, `/api/auth/2fa/verify`

### Core (18 эндпоинтов)
`/api/profiles`, `/api/profile`, `/api/profile/avatar`, `/api/profile/photos`,
`/api/like`, `/api/dislike`, `/api/likes/received`, `/api/likes/sent`,
`/api/matches`, `/api/messages`, `/api/messages/stream` (SSE), `/api/messages/typing`,
`/api/messages/mark-read`, `/api/messages/auto-reply`, `/api/superlike/status`,
`/api/moments`, `/api/block`, `/api/report`

### Platform (6 эндпоинтов)
`/api/account`, `/api/settings`, `/api/achievements`, `/api/leaderboard`,
`/api/admin/stats`, `/api/admin/users/[userId]`, `/api/health`

---

## Переменные окружения

```env
# Обязательные
DATABASE_URL=file:./db/custom.db       # SQLite / PostgreSQL / MongoDB
JWT_SECRET=<случайная строка 32+ символов>

# Опциональные
RESEND_API_KEY=                        # Для отправки email (регистрация, сброс пароля)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true             # Включает авто-ответы в чате
ALLOWED_ORIGINS=http://localhost:3000  # CORS в production
```

---

## Структура проекта

```
love-compass/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Корневой layout (ThemeProvider, ErrorBoundary, Toaster)
│   │   ├── page.tsx                # SPA shell: ленивые view, навигация, хоткеи
│   │   ├── globals.css             # Tailwind v4 + кастомные анимации
│   │   ├── login/register/...      # Страницы авторизации (6 страниц)
│   │   └── api/                    # 40 route files (auth, core, admin)
│   ├── components/
│   │   ├── views/                  # 12 view компонентов (browse, chat, moments, ...)
│   │   ├── ui/                     # shadcn/ui (button, card, input, dialog, ...)
│   │   ├── auth/                   # auth-layout.tsx
│   │   └── error-boundary.tsx
│   ├── lib/
│   │   ├── auth/                   # guard, csrf, jwt, totp, session, rate-limit, password, crypto
│   │   ├── db/                     # prisma-adapter, mongo-adapter, types, detect
│   │   ├── store.ts                # Zustand (все состояние приложения)
│   │   ├── api.ts                  # fetch helpers (CSRF, timeout, hydrate)
│   │   ├── sse.ts                  # Event pub/sub
│   │   ├── scoring.ts              # Рекомендательный алгоритм
│   │   ├── i18n.ts                 # Переводы ru/en/zh/es
│   │   ├── constants.ts            # Все magic numbers
│   │   ├── db.ts                   # Адаптер БД (авто-определение)
│   │   ├── logger.ts               # Структурированное логирование
│   │   └── utils.ts                # Вспомогательные функции
│   └── hooks/
│       ├── useTranslation.ts       # React-хук для i18n
│       ├── useDebounce.ts          # Дебаунс значений и функций
│       └── use-mobile.ts           # Определение мобильного устройства
├── prisma/
│   └── schema.prisma               # 18 моделей (User, Session, Match, Message, ...)
├── deploy/                         # Docker, Kubernetes, Railway, Render
├── e2e/                            # Playwright E2E тесты
├── seed.ts                         # Начальные данные (20 профилей + админ)
├── middleware.ts                   # Edge middleware
└── TODO.md                         # Статус разработки
```

---

## Быстрый старт

```bash
git clone <repo-url>
cd love-compass
bun install
bun run db:generate
bun run db:push
bun run seed      # заполнить демо-данными
bun run dev       # http://localhost:3000
```

### Демо-доступ

После `bun run seed`:
- **Email:** `admin@lovecompass.com` (роль admin)
- **Пароль:** выводится в консоль при сидировании
- На лендинге доступен вход через 20 демо-профилей

---

## Скрипты

| Команда | Описание |
|---------|----------|
| `bun run dev` | Dev-сервер (порт 3000) |
| `bun run build` | Production сборка |
| `bun run lint` | ESLint (zero warnings policy) |
| `bun test` | Vitest unit-тесты |
| `bun run test:e2e` | Playwright E2E |
| `bun run seed` | Заполнение БД демо-данными |
| `bun run db:studio` | Prisma Studio |

---

## Лицензия

Проект распространяется под лицензией `MIT` с сохранением интеллектуальной собственности.

**Владелец:** Дуплей Максим Игоревич (Dupley Maxim Igorevich)

---

## Контакт

**Дуплей Максим Игоревич**
Школа программирования: Maestro7IT
