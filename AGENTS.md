# Love Compass — AI Assistant Guide

## Project Overview
Love Compass is a full-stack dating app: Next.js 16, React 19, TypeScript 5 (strict), Tailwind v4, Zustand, Prisma (SQLite/PostgreSQL).

## Commands
- `npm run dev` — Start dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — ESLint (flat config, zero warnings policy)
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests
- `npm run seed` — Seed database with demo data

## Code Conventions
- **No comments** in production code unless absolutely necessary
- **i18n first** — All user-facing strings go through `useTranslation()` hook; add keys to `src/lib/i18n.ts` for ru/en/zh
- **Zustand atomic updates** — Use `setState(functionUpdater)` pattern to avoid stale closures
- **API routes** — Zod validation, `requireAuth` for reads, `requireAuthWithCSRF` for mutations
- **Components** — Named exports, `'use client'` directive, Framer Motion for animations
- **CSS** — Tailwind v4 (CSS-first config in `globals.css`), no separate config file

## Commit Style
- Use conventional commits: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:`
- Mix of English and Russian descriptions is acceptable

## Key Files
- `src/lib/store.ts` — Zustand app state
- `src/lib/i18n.ts` — Translations for ru/en/zh
- `src/lib/constants.ts` — All magic numbers
- `src/lib/auth/` — Auth logic (JWT, TOTP, CSRF, rate limiting)
- `prisma/schema.prisma` — Database schema
- `middleware.ts` — Edge middleware (rate limiting, auth check, CORS)
