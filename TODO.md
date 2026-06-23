# Love Compass — TODO

## ✅ Done
- **Admin panel API** — `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/[userId]` with role-based access control
- **User role field** — `role` field on User model (`admin`/`user`, default `user`)
- **Admin seed user** — Admin user (`admin@lovecompass.com`) in seed data
- **Auth guard update** — Auth guard supports role-based authorization checks
- **Type safety & error handling** — Narrowed `role` to `'admin' | 'user'`, reduced `as any` casts in mongo-adapter (28→0), new error logging, deduplicated API calls, ESLint tightened
- **Eliminate ESLint warnings** — From 81 warnings to 0. Replaced `any` with `unknown`, added type guards, null checks
- **Zustand race conditions** — Replaced `getState()+setState()` with atomic `setState(functionUpdater)` across all views
- **Standardized error handling** — Extended `logger.ts` with client `appLogger`. Replaced 36+ `console.error` calls with structured JSON logging
- **Real authentication** — Custom auth: email/password, sessions (httpOnly cookies), CSRF, 2FA/TOTP, password reset, email verification, rate limiting
- **Secure API routes** — All mutation routes use `requireAuthWithCSRF`, all read routes use `requireAuth`; 19 API routes protected
- **Input validation** — Zod validation on all API routes with requireAuth
- **Avatar images** — DiceBear SVG API (notionists style), all avatars load correctly
- **ESLint enabled** — Extends next/core-web-vitals + typescript with sensible rules
- **Build passes cleanly** — No `ignoreBuildErrors` in next.config.ts
- **Moments/Top backend** — Moments full CRUD API, Leaderboard API with real scores
- **Persist achievements** — Synced to DB via `UserAchievement` model
- **Hydrate client state from DB** — `hydrateAppData()` fetches all data on login
- **i18n wired** — Auth pages fully translated, views use `useTranslation` hook
- **onBlock nested setState** — Fixed anti-pattern
- **Memory leaks** — `setTimeout` tracked via refs, cleaned up on unmount
- **Notifications** — Settings toggles persisted to DB with rollback
- **Pagination** — Cursor-based pagination on `/api/profiles`
- **TypeScript strictness** — `noImplicitAny`, `noUncheckedIndexedAccess` enabled
- **Account deletion** — `DELETE /api/account` with cascade delete
- **Cache clearing** — Settings button clears Zustand store
- **Block/Report** — Block and report from profile detail; DB models + API routes
- **Search by name** — Real-time search in filter panel
- **Sorting** — Sort by new, name, popularity
- **Seed idempotency** — Uses `upsert`, won't destroy existing data
- **Magic numbers extracted** — All constants to `constants.ts`
- **Tailwind v4** — CSS-first configuration via `@import "tailwindcss"` in globals.css
- **Unit tests** — Test utilities, hooks, complex components
- **CI/CD** — GitHub Actions for lint, test, build
- **Unified avatar style** — `notionists` everywhere
- **PWA** — manifest.json added
- **SEO** — Meta tags, Open Graph, structured data, sitemap.xml, robots.txt
- **Rate limiting** — API endpoint rate limiting (spam, message flooding)
- **CORS** — Origin validation in middleware for production
- **Request logging** — Structured logging in middleware
- **2FA (TOTP)** — Google Authenticator integration
- **lastSeenAt throttle** — Updates at most once per 5 minutes instead of every API call

## 🔥 Critical
- [ ] **Real-time chat** — Replace polling with WebSockets or SSE for live messaging
- [ ] **Image upload** — Endpoint for profile photos + gallery support (multiple photos)
- [x] **Profile verification** — Verification badge (email verified indicator in profile & browse cards)
- [ ] **Connect more i18n languages** — Add English, Spanish, Chinese and other languages fully

## 💡 UX
- [x] **Skeleton loaders** — Loading placeholders for profiles, matches, messages
- [x] **Empty states** — Improved illustrations and CTAs for matches, likes, messages
- [ ] **"Typing..." indicator** — Show when the other person is typing (TypingIndicator component exists but not wired)
- [x] **Search in messages** — Search message history by keywords

## 📊 Analytics & Monitoring
- [ ] **Analytics** — Page views, swipe rates, match rates, retention
- [ ] **Admin dashboard** — Activity graphs, new registrations, reports, blocks
- [ ] **Sentry integration** — Error tracking for production

## 🚀 New Features
- [ ] **Recommendation algorithm** — Smart matching by interests, location, activity
- [ ] **Profile Boost** — Temporary visibility increase (paid or achievement)
- [ ] **Stories** — Short photo/video stories that disappear after 24h
- [ ] **Video calls** — WebRTC video chat between matches
- [ ] **Super-like API (separate)** — Dedicated endpoint with daily limit tracking
- [ ] **Geolocation** — lat/lng on User model, distance calculation, sort by proximity
- [ ] **Subscription system** — Premium features: unlimited likes, see who liked you, Boost, incognito
- [ ] **Social login** — Google, Apple, VK. Import photos from Instagram
- [ ] **Anti-ghosting** — Reminders for unread messages, auto-hide inactive matches
- [ ] **Icebreakers** — Auto-suggestions for first messages (shared interests)
- [ ] **Incognito mode** — Browse profiles without showing visits
- [ ] **Rewind** — Go back to previous profile (currently only undo for last one)
- [ ] **Gifts** — Virtual gifts between users (paid currency or achievements)
- [ ] **A/B testing** — Framework for testing different recommendation algorithms and UI variants

## 🛠 Technical
- [ ] **API versioning** — `/api/v1/` prefix for future breaking changes
- [x] **Bundle optimization** — Code splitting via dynamic imports for all view components
- [ ] **Image optimization** — Cache DiceBear SVGs, preload critical images
- [ ] **Migrate to PostgreSQL for production** — SQLite not suitable for multi-user
- [ ] **Redis for caching** — Cache sessions, online statuses, counters
- [ ] **Database backups** — Automatic SQLite/PostgreSQL backup to S3
- [x] **E2E tests** — Playwright setup with basic auth and security test specs
- [ ] **Improve README** — Architecture diagram, setup instructions, contributing guide
