# Love Compass — Roadmap (10 items)

## 1. ~~Global error boundary~~ ✅
ErrorBoundary already exists in `layout.tsx` wrapping all children.

## 2. Loading states for all pages
Add `loading.tsx` to each route group (`/login`, `/register`, `/feed`, `/chat`, `/moments`, `/profile`). Gives users instant visual feedback during slow navigations.

## 3. ~~Sanitize likes/received endpoint~~ ✅
Uses whitelist approach (explicit field selection) which is actually safer than blacklist `sanitizeUser()`.

## 4. ~~Add missing Dislike index~~ ✅
Dislike model already has `@@index([fromUserId])` and `@@index([toUserId])`. No time-range queries exist on this model.

## 5. Fix P2002 race condition in moments PATCH ✅
`src/app/api/moments/route.ts` — P2002 catch block now re-queries actual DB state instead of always returning `{ liked: true }`.

## 6. Fix like/route.ts match animation race condition
When two users simultaneously like each other, one user silently misses the match animation. The P2002 handler returns HTTP 200 with no `isMutual` field.

## 7. Fix settingSetter rollback desync
`src/lib/store.ts` — rapid toggles cause client/server divergence when the last save fails, because rollback uses captured `prev` instead of server truth.

## 8. Replace raw fetch with fetchWithTimeout
`src/components/views/top-view.tsx:263` and `src/components/views/chat-view.tsx:131` use raw `fetch` without timeout, causing indefinite loading spinners on server stalls.

## 9. Fix admin-view double-fetch on mount
`src/components/views/admin-view.tsx` — two useEffects both call `fetchAdminData()` on mount, creating redundant API calls and potential stale-data race.

## 10. Fix browse-view super-like count drift
`src/components/views/browse-view.tsx:231` — empty dependency array means super-like count is never refreshed if initial fetch fails, allowing excess super likes.
