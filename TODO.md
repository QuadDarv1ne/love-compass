# Love Compass — TODO

## Done

- [x] **Admin panel API routes** — `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/[userId]` with role-based access control
- [x] **API-маршруты админ-панели** — `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/[userId]` с ролевым доступом
- [x] **User role field** — Added `role` field to User model (`admin`/`user`, default `user`)
- [x] **Поле роли пользователя** — Добавлено поле `role` в модель User (`admin`/`user`, по умолчанию `user`)
- [x] **Admin seed user** — Added admin user (`admin@lovecompass.com`) to seed data
- [x] **Админ в seed данных** — Добавлен пользователь-админ (`admin@lovecompass.com`) в seed данные
- [x] **Auth guard update** — Updated auth guard to support role-based authorization checks
- [x] **Обновление auth guard** — Обновлён auth guard для поддержки проверки авторизации по ролям
- [x] **Type safety & error handling improvements** — Narrowed `role` type to `'admin' | 'user'`, reduced `as any` casts in mongo-adapter (28 occurrences fixed), added proper error logging in top-view and landing-view, deduplicated API calls in match-animation-overlay, tightened ESLint to disallow `console.log`
- [x] **Улучшение типизации и обработки ошибок** — Сужен тип `role` до `'admin' | 'user'`, сокращены `as any` в mongo-adapter (28 исправлений), добавлено логирование ошибок в top-view и landing-view, устранено дублирование API-вызовов в match-animation-overlay, ужесточён ESLint для запрета `console.log`

- [x] **Eliminate all ESLint warnings and fix type safety** — Reduced warnings from 81 to 0. Replaced `any` with `unknown` in `cleanWhere()`, added string type guards before `toObjectId()` (8 locations), replaced non-null assertions with proper null checks for orphaned sessions, excluded `scripts/` from no-console rule, replaced `console.log` with `console.warn` in email.ts
- [x] **Устранить все предупреждения ESLint и исправить типизацию** — Сокращены предупреждения с 81 до 0. Заменены `any` на `unknown` в `cleanWhere()`, добавлены строковые проверки типов перед `toObjectId()` (8 мест), заменены ненулевые утверждения на правильные проверки null для осиротевших сессий, исключён `scripts/` из правила no-console, заменён `console.log` на `console.warn` в email.ts

- [x] **Fix Zustand race conditions** — Replaced `getState()`+`setState()` with atomic `setState(functionUpdater)` in browse-view (rollback in handleLike/handleSuperLike, atomic handleUndo, onBlock), match-animation-overlay (refreshMatches), and landing-view (demo login). Eliminated stale state reads during concurrent operations.
- [x] **Починить race conditions в Zustand** — Заменены `getState()`+`setState()` на атомарные `setState(functionUpdater)` в browse-view (rollback в handleLike/handleSuperLike, атомарный handleUndo, onBlock), match-animation-overlay (refreshMatches) и landing-view (demo login). Устранено чтение устаревшего состояния при конкурентных операциях.

- [x] **Standardize error handling** — Extended `logger.ts` with client-side `appLogger` (error/warn/info levels). Replaced 17 scattered `console.error` calls across 8 view components with structured JSON logging (context, timestamp, error data). Enables future Sentry integration.
- [x] **Стандартизировать обработку ошибок** — Расширен `logger.ts` клиентским `appLogger` (уровни error/warn/info). Заменены 17 разрозненных `console.error` в 8 компонентах на структурированное JSON-логирование (контекст, timestamp, данные ошибки). Подготовлена интеграция с Sentry.

## Critical

- [x] **Implement real authentication** — Custom auth built with email/password, sessions (httpOnly cookies), CSRF, 2FA/TOTP, password reset, email verification, rate limiting
- [x] **Реализовать настоящую аутентификацию** — Построена кастомная аутентификация с email/паролем, сессиями (httpOnly cookies), CSRF, 2FA/TOTP, сбросом пароля, верификацией email, rate limiting

- [x] **Secure API routes** — All mutation routes use `requireAuthWithCSRF`, all read routes use `requireAuth`; 19 API routes protected
- [x] **Защитить API-маршруты** — Все mutation-маршруты используют `requireAuthWithCSRF`, read-маршруты используют `requireAuth`; защищено 19 API-маршрутов

- [x] **Add input validation** — Zod validation used on all API routes with requireAuth guards
- [x] **Добавить валидацию входных данных** — Zod используется во всех API-маршрутах с requireAuth

- [x] **Fix avatar images** — Using DiceBear SVG API, all avatars load correctly
- [x] **Починить аватары** — Используются SVG с DiceBear API, все аватары загружаются корректно

- [x] **Enable ESLint** — ESLint extends next/core-web-vitals and typescript with sensible rules
- [x] **Включить ESLint** — ESLint расширяет next/core-web-vitals и typescript с разумными правилами

- [x] **Remove build error suppression** — `next.config.ts` does not have `ignoreBuildErrors`; build passes cleanly
- [x] **Убрать подавление ошибок сборки** — `next.config.ts` не имеет `ignoreBuildErrors`; сборка проходит без ошибок

- [x] **Fix `.env` path** — `DATABASE_URL` already uses relative path `file:./db/custom.db`
- [x] **Починить путь в `.env`** — `DATABASE_URL` уже использует относительный путь `file:./db/custom.db`

## High Priority

- [ ] **Implement real-time chat** — Replace auto-reply simulation with WebSockets or Server-Sent Events for live messaging
- [ ] **Реализовать чат в реальном времени** — Заменить имитацию авто-ответов на WebSockets или Server-Sent Events для живых сообщений

- [ ] **Add image upload** — Create endpoint for profile photo uploads. Add gallery support (multiple photos per profile)
- [ ] **Добавить загрузку изображений** — Создать эндпоинт для загрузки фото профиля. Добавить поддержку галереи (несколько фото на профиль)

- [x] **Build Moments/Top backend** — Moments have full CRUD API (`/api/moments` GET/POST/PATCH), Leaderboard API (`/api/leaderboard`) with real scores from likes/matches
- [x] **Сделать бэкенд для Moments/Top** — Moments имеют полный CRUD API (`/api/moments`), Leaderboard API (`/api/leaderboard`) с реальными scores

- [x] **Persist achievements** — Achievements synced to DB via `UserAchievement` model and `/api/achievements` endpoint
- [x] **Сохранять достижения** — Достижения синхронизируются с БД через модель `UserAchievement` и эндпоинт `/api/achievements`

- [x] **Hydrate client state from DB** — `hydrateAppData()` fetches profiles, matches, likes, blocked users, moments, achievements, and settings on login; all with 15s timeout
- [x] **Восстанавливать клиентское состояние из БД** — `hydrateAppData()` загружает анкеты, мэтчи, лайки, блокировки, моменты, достижения и настройки при входе

- [ ] **Connect i18n** — `next-intl` installed but app is hardcoded to Russian. Wire language selector to actual translation system
- [ ] **Подключить i18n** — `next-intl` установлен, но приложение захардкожено на русский. Привязать селектор языка к реальной системе переводов

- [x] **Fix onBlock nested setState anti-pattern** — `browse-view.tsx` `onBlock` handler called `state.blockUser()` inside `useAppStore.setState()`, causing a nested `setState` call since `blockUser` internally calls `set()`. Fixed by calling `useAppStore.getState().blockUser()` directly.
- [x] **Починить anti-pattern nested setState в onBlock** — Обработчик `onBlock` в `browse-view.tsx` вызывал `state.blockUser()` внутри `useAppStore.setState()`, что создавало вложенный `setState`, так как `blockUser` внутри вызывает `set()`. Исправлено прямым вызовом `useAppStore.getState().blockUser()`.

- [x] **Fix unused import** — Removed unused `ANIMATION` import from `browse-view.tsx` to eliminate ESLint warning
- [x] **Починить неиспользуемый импорт** — Удалён неиспользуемый импорт `ANIMATION` из `browse-view.tsx` для устранения предупреждения ESLint

- [x] **Fix memory leaks** — `setTimeout` calls in `browse-view.tsx` now tracked via ref and cleaned up on unmount
- [x] **Починить утечки памяти** — `setTimeout` в `browse-view.tsx` теперь отслеживаются через ref и очищаются при unmount

- [x] **Implement notifications** — Settings toggles (`soundEnabled`, `matchNotifications`, `likeNotifications`, `showDistance`) now persisted to DB via Zustand store with rollback on failure
- [x] **Реализовать уведомления** — Переключатели в настройках теперь сохраняются в БД через Zustand store с откатом при ошибке

- [x] **Add pagination** — `/api/profiles` already has cursor-based pagination with `cursor` and `limit` params
- [x] **Добавить пагинацию** — `/api/profiles` уже имеет курсорную пагинацию с параметрами `cursor` и `limit`

- [x] **Enable TypeScript strictness** — `noImplicitAny: true` and `noUncheckedIndexedAccess: true` in tsconfig, all types fixed, zero lint errors
- [x] **Включить строгий TypeScript** — `noImplicitAny: true` и `noUncheckedIndexedAccess: true` в tsconfig, все типы исправлены, 0 ошибок линта

- [x] **Implement account deletion** — `DELETE /api/account` with full cascade delete; settings-view calls it with confirmation dialog
- [x] **Реализовать удаление аккаунта** — `DELETE /api/account` с полным каскадным удалением; settings-view вызывает с диалогом подтверждения

- [x] **Implement cache clearing** — Settings button clears Zustand store state and resets app to fresh login state
- [x] **Реализовать очистку кеша** — Кнопка в настройках очищает Zustand store и сбрасывает приложение к состоянию входа

- [x] **Fix app naming** — Already consistent "Love Compass" everywhere. No typo found.
- [x] **Починить имя приложения** — Уже везде "Love Compass". Опечатка не обнаружена.

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

- [x] **Fix `Message.read` mismatch** — Already exists in Prisma schema as `read Boolean @default(false)`
- [x] **Починить несоответствие `Message.read`** — Уже существует в схеме Prisma как `read Boolean @default(false)`

- [x] **Remove unused dependencies** — All unused deps already removed from package.json
- [x] **Удалить неиспользуемые зависимости** — Все неиспользуемые зависимости уже удалены из package.json

- [x] **Delete dead code** — `use-toast.ts` already removed; sonner used everywhere
- [x] **Удалить мёртвый код** — `use-toast.ts` уже удалён; sonner используется везде

- [x] **Fix race conditions** — Multiple `useEffect` hooks called `useAppStore.getState()` leading to stale state. Refactored to atomic `setState(functionUpdater)` pattern. All `getState()`+`setState()` pairs replaced with atomic updates in browse-view, match-animation-overlay, and landing-view.
- [x] **Починить race conditions** — Несколько `useEffect` хуков вызывали `useAppStore.getState()`, что приводило к устаревшему состоянию. Рефакторинг на атомарный паттерн `setState(functionUpdater)`. Все пары `getState()`+`setState()` заменены на атомарные обновления в browse-view, match-animation-overlay и landing-view.

- [x] **Fix duplicate API calls** — `LikedYouView`, `MatchesView`, and `ChatListView` now read from Zustand store (hydrated once via `hydrateAppData()`). No duplicate fetches.
- [x] **Починить дублирующиеся API-вызовы** — `LikedYouView`, `MatchesView` и `ChatListView` теперь читают из стора Zustand (единоразовая загрузка через `hydrateAppData()`). Дублирование устранено.

- [x] **Fix memory leaks** — `setTimeout` in browse-view tracked via ref and cleaned up on unmount; chat-view and moments-view intervals already had proper cleanup
- [x] **Починить утечки памяти** — `setTimeout` в browse-view отслеживаются через ref и очищаются при unmount; intervals в chat-view и moments-view уже имели очистку

- [x] **Add idempotency to seed** — `seed.ts` uses `upsert` by email, won't destroy existing data
- [x] **Добавить идемпотентность в seed** — `seed.ts` использует `upsert` по email, не уничтожает существующие данные

- [x] **Standardize error handling** — Extended `logger.ts` with client-side `appLogger` (error/warn/info levels). Replaced 17 scattered `console.error` calls across 8 view components with structured JSON logging (context, timestamp, error data). Replaced remaining 19 `console.error` calls in `api.ts`, `store.ts`, and `error-boundary.tsx` with structured `appLogger.error`.
- [x] **Стандартизировать обработку ошибок** — Расширен `logger.ts` клиентским `appLogger` (уровни error/warn/info). Заменены 17 разрозненных `console.error` в 8 компонентах на структурированное JSON-логирование. Заменены оставшиеся 19 `console.error` в `api.ts`, `store.ts` и `error-boundary.tsx` на структурированный `appLogger.error`.

- [x] **Extract magic numbers** — Swipe thresholds, reply delays, animation durations, upload limits, grid configs, time constants, and spring physics all extracted to `constants.ts` as named `as const` objects
- [x] **Вынести магические числа** — Пороги свайпа, задержки ответов, длительности анимаций, лимиты загрузки, конфигурация сетки, временные константы и spring-физика вынесены в `constants.ts` как именованные `as const` объекты

- [ ] **Add API versioning** — Routes at `/api/*` with no version. Add `/api/v1/` prefix
- [ ] **Добавить версионирование API** — Маршруты на `/api/*` без версии. Добавить префикс `/api/v1/`

- [ ] **Fix Tailwind v4 config** — Using `tailwind.config.ts` but v4 prefers CSS-first configuration

- [x] **Add unit tests** — Test utilities, hooks, and complex components
- [x] **Добавить юнит-тесты** — Тестирование утилит, хуков и сложных компонентов

- [x] **Add CI/CD** — GitHub Actions for lint, test, build on push/PR
- [x] **Добавить CI/CD** — GitHub Actions для lint, test, build при push/PR

- [x] **Unify avatar style** — Registration page used `adventurer` DiceBear style while app used `notionists`. Fixed to use `notionists` everywhere for consistency

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

- [x] **Add rate limiting** — Prevent abuse on API endpoints (spam, message flooding)
- [x] **Добавить rate limiting** — Предотвратить злоупотребления на API-эндпоинтах (спам, флуд сообщениями)

- [ ] **Configure CORS** — Restrict allowed origins for production
- [ ] **Настроить CORS** — Ограничить разрешённые origin для продакшена

- [ ] **Add request logging** — Structured logging for API requests and errors
- [x] **Добавить логирование запросов** — Структурированное логирование API-запросов в middleware ✅

## Рекомендации по дальнейшему развитию

### 🔥 Критичный функционал

- [ ] **Реализовать чат в реальном времени (WebSockets/SSE)** — Сейчас чат работает через polling. Перейти на Socket.io или Server-Sent Events для мгновенной доставки сообщений
- [ ] **Реализовать загрузку фото** — Загрузка реальных фото пользователей в профиль (multer + S3/локальное хранилище). Галерея из нескольких фото
- [ ] **Добавить верификацию профилей** — Бейдж верификации после подтверждения email или модерации фото. Повышает доверие
- [ ] **Подключить i18n (мультиязычность)** — `next-intl` уже установлен. Добавить английский, испанский, китайский и др. языки

### 💡 Улучшение UX

- [ ] **Добавить skeleton-загрузчики** — Плейсхолдеры при загрузке анкет, мэтчей, сообщений вместо пустого экрана
- [ ] **Добавить PWA (Progressive Web App)** — Service worker, manifest, push-уведомления, установка на телефон как нативное приложение
- [ ] **Добавить пустые состояния (empty states)** — Красивые иллюстрации и подсказки когда нет мэтчей, сообщений, лайков
- [ ] **Добавить жесты для чата** — Свайп для удаления сообщения, долгое нажатие для реакций (эмодзи-ответы)
- [ ] **Добавить индикатор "печатает..."** — В чате показывать когда собеседник набирает сообщение (уже есть компонент TypingIndicator, но не подключён к реальным данным)
- [ ] **Добавить поиск по сообщениям** — Поиск в истории переписки по ключевым словам
- [ ] **Добавить тёмную тему для чата** — Отдельная настройка темы чата, независимая от общей темы

### 📊 Аналитика и мониторинг

- [ ] **Добавить аналитику** — Счётчики: просмотры профилей, CTR лайков, конверсия в мэтчи, время в приложении, retention
- [ ] **Добавить A/B тестирование** — Фреймворк для тестирования разных алгоритмов рекомендаций, UI-вариантов
- [ ] **Добавить дашборд администратора** — Графики активности пользователей, новые регистрации, жалобы, блокировки
- [ ] **Интегрировать Sentry** — Sentry или аналог для отслеживания ошибок в продакшене

### 🔒 Безопасность и надёжность

- [x] **Добавить rate limiting** — Ограничение запросов на API: лайки, сообщения, регистрации (защита от ботов и спама) ✅
- [x] **Настроить CORS для продакшена** — Ограничить разрешённые origins конкретным доменом ✅
- [x] **Добавить 2FA (двухфакторную аутентификацию)** — TOTP через Google Authenticator ✅
- [x] **Стандартизировать обработку ошибок** — Единый формат ошибок, централизованный error handler ✅
- [ ] **Добавить резервное копирование БД** — Автоматический backup SQLite/PostgreSQL на S3 или другой storage
- [ ] **Добавить логирование запросов** — Структурированное логирование API-запросов в middleware ✅

### 🧪 Тестирование

- [ ] **Добавить e2e-тесты (Playwright)** — Критические сценарии: регистрация → свайп → мэтч → отправка сообщения
- [ ] **Добавить тесты на безопасность** — CSRF, XSS, SQL-инъекции, аутентификация
- [x] **Добавить CI/CD (GitHub Actions)** — Автоматический lint + test + build при каждом push/PR ✅
- [x] **Добавить юнит-тесты** — Тестирование утилит, хуков и сложных компонентов ✅

### 🚀 Новые фичи

- [ ] **Добавить алгоритм рекомендаций** — Умный подбор анкет по совместимости: интересы, геолокация, активность, предпочтения
- [ ] **Добавить "Boost профиля"** — Временное повышение видимости профиля (платная функция или за достижения)
- [ ] **Добавить Stories/Истории** — Короткие фото/видео в профиле, которые исчезают через 24ч (уже есть Moments, но можно развить)
- [ ] **Добавить видеозвонки** — WebRTC для видеочата между мэтчами
- [ ] **Добавить "супер-лайк" с лимитом** — Отдельный эндпоинт с отслеживанием дневного лимита (сейчас используется обычный `/api/like`)
- [ ] **Добавить геолокацию** — Поля lat/lng в User model, расчёт расстояния, сортировка по близости
- [ ] **Добавить систему подписок** — Premium-функции: безлимитные лайки, просмотр кто лайкнул, Boost, невидимый режим
- [ ] **Добавить интеграцию с соцсетями** — Вход через Google, Apple, VK. Импорт фото из Instagram
- [ ] **Добавить "анти-ghosting"** — Напоминания о непрочитанных сообщениях, авто-скрытие неактивных мэтчей
- [ ] **Добавить icebreakers** — Автоматические подсказки для первого сообщения в чате (общие интересы, вопросы)
- [ ] **Добавить режим "Инкогнито"** — Просмотр анкет без отметки о посещении
- [ ] **Добавить "Rewind"** — Возможность вернуть предыдущую анкету (уже есть Undo, но только для последней)
- [ ] **Добавить подарки** — Виртуальные подарки между пользователями (платная валюта или за достижения)

### 🛠 Техническое качество

- [x] **Устранить дублирующиеся API-вызовы** — `LikedYouView` вызывает `/api/likes/received` дважды, `MatchesView` и `ChatListView` независимо загружают матчи
- [x] **Починить race conditions в Zustand** — Несколько `useEffect` вызывают `useAppStore.getState()`, что даёт устаревшее состояние
- [ ] **Добавить версионирование API (`/api/v1/`)** — Подготовка к breaking changes в будущем
- [ ] **Мигрировать на Tailwind v4 CSS-first config** — `tailwind.config.ts` устарел для v4
- [x] **Починить имя приложения** — В UI "Love Compas" (без 's'), в README — "Love Compass"
- [x] **Вынести магические числа в константы** — Пороги свайпа, задержки ответов, длительности анимаций
- [x] **Добавить TypeScript strict mode** — `strictNullChecks`, `noUncheckedIndexedAccess`
- [ ] **Оптимизировать бандл** — Code splitting, lazy loading тяжёлых компонентов (framer-motion, lucide icons)
- [ ] **Добавить image optimization** — Кэширование DiceBear SVG, preload критичных изображений
- [ ] **Перейти на PostgreSQL для продакшена** — SQLite не подходит для многопользовательской среды
- [ ] **Добавить Redis для кэширования** — Кэш сессий, онлайн-статусов, счётчиков
