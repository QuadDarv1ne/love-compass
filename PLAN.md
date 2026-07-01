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

## 6. ~~Fix like/route.ts match animation race condition~~ ✅
P2002 handler now queries DB for actual match state and returns `{ isMutual }` flag so clients show the animation correctly.

## 7. ~~Fix settingSetter rollback desync~~ ✅
On save failure, refetches actual server state from GET /api/settings instead of rolling back to stale captured `prev`.

## 8. ~~Replace raw fetch with fetchWithTimeout~~ ✅
top-view and chat-view now use fetchWithTimeout to prevent indefinite loading on server stalls.

## 9. ~~Fix admin-view double-fetch on mount~~ ✅
Removed redundant useEffect — the second one already covers mount via its dependency array.

## 10. Fix browse-view super-like count drift
`src/components/views/browse-view.tsx:231` — empty dependency array means super-like count is never refreshed if initial fetch fails, allowing excess super likes.
