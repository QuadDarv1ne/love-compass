# Love Compass — TODO

## Critical

- [ ] **Implement real authentication** — NextAuth.js is installed but unused. Replace demo login with proper email/password auth, sessions, and token validation
- [ ] **Реализовать настоящую аутентификацию** — NextAuth.js установлен, но не используется. Заменить демо-вход на полноценную авторизацию по email/паролю, сессии и валидацию токенов

- [ ] **Secure API routes** — All endpoints accept arbitrary `userId` without validation. Any user can act as any other. Add session-based auth checks to every route
- [ ] **Защитить API-маршруты** — Все эндпоинты принимают произвольный `userId` без проверки. Любой пользователь может действовать от имени другого. Добавить проверку сессии в каждый маршрут

- [ ] **Add input validation** — Use Zod (already installed) to validate all request bodies on API routes. Currently raw JSON is consumed with minimal checks
- [ ] **Добавить валидацию входных данных** — Использовать Zod (уже установлен) для валидации всех тел запросов на API-маршрутах. Сейчас сырой JSON принимается с минимальными проверками

- [ ] **Fix avatar images** — Avatars reference non-existent files (`/avatar-woman1.jpg` etc.). Either add actual images to `public/` or use placeholder services
- [ ] **Починить аватары** — Аватары ссылаются на несуществующие файлы (`/avatar-woman1.jpg` и т.д.). Либо добавить реальные изображения в `public/`, либо использовать placeholder-сервисы

- [ ] **Enable ESLint** — `eslint.config.mjs` disables every rule. Restore standard rules for code quality
- [ ] **Включить ESLint** — `eslint.config.mjs` отключает все правила. Восстановить стандартные правила для контроля качества кода

- [ ] **Remove build error suppression** — `next.config.ts` has `ignoreBuildErrors: true`. Fix underlying issues instead
- [ ] **Убрать подавление ошибок сборки** — `next.config.ts` имеет `ignoreBuildErrors: true`. Вместо этого исправить underlying проблемы

- [ ] **Fix `.env` path** — `DATABASE_URL` uses hardcoded Linux path (`/home/z/my-project/db/custom.db`). Won't work on Windows/macOS. Use relative path
- [ ] **Починить путь в `.env`** — `DATABASE_URL` использует захардкоженный Linux-путь (`/home/z/my-project/db/custom.db`). Не работает на Windows/macOS. Использовать относительный путь

## High Priority

- [ ] **Implement real-time chat** — Replace auto-reply simulation with WebSockets or Server-Sent Events for live messaging
- [ ] **Реализовать чат в реальном времени** — Заменить имитацию авто-ответов на WebSockets или Server-Sent Events для живых сообщений

- [ ] **Add image upload** — Create endpoint for profile photo uploads. Add gallery support (multiple photos per profile)
- [ ] **Добавить загрузку изображений** — Создать эндпоинт для загрузки фото профиля. Добавить поддержку галереи (несколько фото на профиль)

- [ ] **Build Moments/Top backend** — Moments and Leaderboard use entirely hardcoded client-side data. Create DB models (`Moment`, `Reaction`, `Comment`) and API routes
- [ ] **Сделать бэкенд для Moments/Top** — Моменты и Лидерборд используют полностью захардкоженные клиентские данные. Создать модели БД (`Moment`, `Reaction`, `Comment`) и API-маршруты

- [ ] **Persist achievements** — Achievements track Zustand state only (lost on refresh). Add DB model and sync with server
- [ ] **Сохранять достижения** — Достижения хранятся только в Zustand (теряются при перезагрузке). Добавить модель БД и синхронизацию с сервером

- [ ] **Hydrate client state from DB** — Page refresh loses all client state (likedUserIds, matches, etc.). Re-fetch from API on mount/login
- [ ] **Восстанавливать клиентское состояние из БД** — Перезагрузка страницы теряет всё клиентское состояние (лайкнутые ID, матчи и т.д.). Повторно загрузить из API при монтировании/входе

- [ ] **Connect i18n** — `next-intl` installed but app is hardcoded to Russian. Wire language selector to actual translation system
- [ ] **Подключить i18n** — `next-intl` установлен, но приложение захардкожено на русский. Привязать селектор языка к реальной системе переводов

- [ ] **Implement notifications** — Settings has toggles but no actual notification service. Add web push, email, or in-app notification system
- [ ] **Реализовать уведомления** — В настройках есть переключатели, но нет настоящего сервиса уведомлений. Добавить web push, email или встроенную систему уведомлений

- [ ] **Add pagination** — `/api/profiles` returns ALL users at once. Implement cursor-based or offset pagination
- [ ] **Добавить пагинацию** — `/api/profiles` возвращает ВСЕХ пользователей сразу. Реализовать курсорную или offset-пагинацию

- [ ] **Enable TypeScript strictness** — `noImplicitAny: false` in tsconfig. Fix types and enable strict mode
- [ ] **Включить строгий TypeScript** — `noImplicitAny: false` в tsconfig. Исправить типы и включить строгий режим

- [ ] **Implement account deletion** — Button shows toast but does nothing. Add actual delete endpoint with cascade
- [ ] **Реализовать удаление аккаунта** — Кнопка показывает toast, но ничего не делает. Добавить настоящий эндпоинт удаления с каскадом

- [ ] **Implement cache clearing** — Button shows toast but does nothing. Add actual cache clearing logic
- [ ] **Реализовать очистку кеша** — Кнопка показывает toast, но ничего не делает. Добавить реальную логику очистки

- [ ] **Fix app naming** — UI says "Love Compas" (missing 's'), README says "Love Compass". Standardize
- [ ] **Починить имя приложения** — В UI написано "Love Compas" (без 's'), в README — "Love Compass". Привести к единому виду

## Medium Priority

- [ ] **Add geolocation** — Settings has "show distance" toggle but User model has no coordinates. Add lat/lng fields and distance calculation
- [ ] **Добавить геолокацию** — В настройках есть переключатель "показать расстояние", но у User нет координат. Добавить поля lat/lng и расчёт расстояния

- [x] **Add block/report** — Block and report users from profile detail modal; `Block` and `Report` DB models with API routes; blocked users filtered from browse
- [x] **Добавить блокировку/жалобы** — Блокировка и жалобы из модального окна профиля; модели БД `Block` и `Report` с API-маршрутами; заблокированные фильтруются

- [ ] **Add profile verification** — No verification badge or process. Add email/photo verification flow
- [ ] **Добавить верификацию профиля** — Нет бейджа верификации или процесса. Добавить верификацию по email/фото

- [x] **Add search by name** — Search input in filter panel filters profiles by name in real-time
- [x] **Добавить поиск по имени** — Поле поиска в панели фильтров фильтрует анкеты по имени в реальном времени

- [x] **Add sorting** — Sort profiles by new, name, or popularity in browse view
- [x] **Добавить сортировку** — Сортировка анкет по новизне, имени или популярности

- [x] **Hydrate client state from DB** — `hydrateAppData()` fetches profiles, matches, likes, and blocked users on login; blocked users are filtered from browse results
- [x] **Восстанавливать клиентское состояние из БД** — `hydrateAppData()` загружает анкеты, мэтчи, лайки и заблокированных пользователей при входе

- [ ] **Add super-like API** — Super likes use same `/api/like` endpoint. Add separate endpoint with daily limit tracking
- [ ] **Добавить API для супер-лайков** — Супер-лайки используют тот же эндпоинт `/api/like`. Добавить отдельный эндпоинт с дневным лимитом

- [ ] **Fix `Message.read` mismatch** — TypeScript interface has `read` field but Prisma schema doesn't. Add to schema or remove from types
- [ ] **Починить несоответствие `Message.read`** — Интерфейс TypeScript имеет поле `read`, но схема Prisma — нет. Добавить в схему или убрать из типов

- [ ] **Remove unused dependencies** — Clean up: `@dnd-kit/*`, `@mdxeditor/editor`, `recharts`, `react-syntax-highlighter`, `react-resizable-panels`, `z-ai-web-dev-sdk`, `input-otp`, `react-day-picker`, `cmdk`
- [ ] **Удалить неиспользуемые зависимости** — Очистить: `@dnd-kit/*`, `@mdxeditor/editor`, `recharts`, `react-syntax-highlighter`, `react-resizable-panels`, `z-ai-web-dev-sdk`, `input-otp`, `react-day-picker`, `cmdk`

- [ ] **Delete dead code** — `use-toast.ts` is unused (sonner is used instead). Remove or replace
- [ ] **Удалить мёртвый код** — `use-toast.ts` не используется (везде используется sonner). Удалить или заменить

- [ ] **Fix race conditions** — Multiple `useEffect` hooks call `useAppStore.getState()` leading to stale state. Refactor to proper Zustand patterns
- [ ] **Починить race conditions** — Несколько `useEffect` хуков вызывают `useAppStore.getState()`, что приводит к устаревшему состоянию. Рефакторинг на правильные паттерны Zustand

- [ ] **Fix duplicate API calls** — `LikedYouView` calls `/api/likes/received` twice. `MatchesView` and `ChatListView` both fetch matches independently. Deduplicate
- [ ] **Починить дублирующиеся API-вызовы** — `LikedYouView` вызывает `/api/likes/received` дважды. `MatchesView` и `ChatListView` оба независимо загружают матчи. Устранить дублирование

- [ ] **Fix memory leaks** — `setTimeout`/`setInterval` in overlays and views may not be cleaned up properly
- [ ] **Починить утечки памяти** — `setTimeout`/`setInterval` в оверлеях и представлениях могут не очищаться корректно

- [ ] **Add idempotency to seed** — `seed.ts` deletes all data before re-seeding, destroying real data. Add check or flag
- [ ] **Добавить идемпотентность в seed** — `seed.ts` удаляет все данные перед повторным заполнением, уничтожая реальные данные. Добавить проверку или флаг

- [ ] **Standardize error handling** — Mix of `console.error`, silent failures, and no catch. Use consistent error reporting
- [ ] **Стандартизировать обработку ошибок** — Смесь `console.error`, тихих падений и отсутствия catch. Использовать единый стиль обработки ошибок

- [ ] **Extract magic numbers** — Swipe thresholds, reply delays, animation durations hardcoded. Use named constants
- [ ] **Вынести магические числа** — Пороги свайпа, задержки ответов, длительности анимаций захардкожены. Использовать именованные константы

- [ ] **Add API versioning** — Routes at `/api/*` with no version. Add `/api/v1/` prefix
- [ ] **Добавить версионирование API** — Маршруты на `/api/*` без версии. Добавить префикс `/api/v1/`

- [ ] **Fix Tailwind v4 config** — Using `tailwind.config.ts` but v4 prefers CSS-first configuration
- [ ] **Починить конфиг Tailwind v4** — Используется `tailwind.config.ts`, но v4 предпочитает CSS-first конфигурацию

## Low Priority

- [ ] **Add loading states** — Some views lack skeleton loaders during data fetch
- [ ] **Добавить состояния загрузки** — Некоторым представлениям не хватает skeleton-загрузчиков при загрузке данных

- [ ] **Add offline support** — Service worker or PWA setup for basic offline functionality
- [ ] **Добавить оффлайн-поддержку** — Service worker или PWA для базовой оффлайн-функциональности

- [ ] **Add analytics** — Track page views, swipe rates, match rates
- [ ] **Добавить аналитику** — Отслеживать просмотры страниц, частоту свайпов, частоту матчей

- [ ] **Improve SEO** — Add proper meta tags, Open Graph, structured data
- [ ] **Улучшить SEO** — Добавить правильные meta-теги, Open Graph, структурированные данные

- [ ] **Add e2e tests** — Playwright or Cypress for critical user flows
- [ ] **Добавить e2e-тесты** — Playwright или Cypress для критических пользовательских сценариев

- [ ] **Add unit tests** — Test utilities, hooks, and complex components
- [ ] **Добавить юнит-тесты** — Тестирование утилит, хуков и сложных компонентов

- [ ] **Add CI/CD** — GitHub Actions for lint, test, build on push/PR
- [ ] **Добавить CI/CD** — GitHub Actions для lint, test, build при push/PR

- [ ] **Improve README** — Add architecture diagram, setup instructions, contributing guide
- [ ] **Улучшить README** — Добавить диаграмму архитектуры, инструкции по настройке, руководство по контрибуции

- [ ] **Add rate limiting** — Prevent abuse on API endpoints (spam, message flooding)
- [ ] **Добавить rate limiting** — Предотвратить злоупотребления на API-эндпоинтах (спам, флуд сообщениями)

- [ ] **Configure CORS** — Restrict allowed origins for production
- [ ] **Настроить CORS** — Ограничить разрешённые origin для продакшена

- [ ] **Add request logging** — Structured logging for API requests and errors
- [ ] **Добавить логирование запросов** — Структурированное логирование API-запросов и ошибок
