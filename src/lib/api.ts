import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';
import { appLogger } from '@/lib/logger';
import { PAGINATION, ONLINE_PRESENCE } from '@/lib/constants';
import { detectBrowserLocale, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

let csrfToken: string | null = null;
let csrfTokenFetchedAt: number | null = null;
const CSRF_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds
let hydrateGeneration = 0;

/**
 * Fetch with an abort timeout to prevent hanging requests.
 */
export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Read the CSRF token from the cookie directly.
 * The __csrf cookie is set with httpOnly: false so it's readable by JavaScript.
 * This follows the double-submit CSRF pattern: the token must match between
 * the cookie and the x-csrf-token header on mutation requests.
 */
function getCSRFTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)__csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch a fresh CSRF token from the server if needed.
 * The token is cached for 5 minutes, then refreshed.
 */
export async function getCSRFToken(): Promise<string> {
  const now = Date.now();

  // Try to read from existing cookie first
  const cookieToken = getCSRFTokenFromCookie();
  if (cookieToken && csrfTokenFetchedAt && now - csrfTokenFetchedAt < CSRF_TOKEN_TTL) {
    csrfToken = cookieToken;
    return csrfToken;
  }

  // Fetch a fresh token
  const res = await fetchWithTimeout('/api/auth/csrf-token');
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  // Token is now set in the cookie by the server; read it from there
  const freshToken = getCSRFTokenFromCookie();
  if (!freshToken) throw new Error('CSRF token not set by server');
  csrfToken = freshToken;
  csrfTokenFetchedAt = now;
  return csrfToken;
}

/**
 * Perform a mutation request with CSRF token included, for any HTTP method.
 * Automatically fetches the token if not already cached.
 * If the server returns 403, the token is invalidated and retried once.
 */
async function requestWithCSRF(
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  body: unknown,
): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetchWithTimeout(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });

  // If token is stale (403), invalidate cache and retry once
  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetchWithTimeout(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': freshToken,
      },
      body: JSON.stringify(body),
    });
  }

  return res;
}

/**
 * Perform a POST mutation request with CSRF token included.
 */
export async function fetchWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('POST', url, body);
}

/**
 * Perform a POST mutation request with CSRF token and FormData body.
 * Used for file uploads where JSON.stringify cannot be used.
 */
export async function postWithCSRFFormData(url: string, formData: FormData): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'x-csrf-token': token },
    body: formData,
  });

  // If token is stale (403), invalidate cache and retry once
  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'x-csrf-token': freshToken },
      body: formData,
    });
  }

  return res;
}

/**
 * Perform a DELETE request with CSRF token included.
 * No body needed for DELETE, just the token header.
 */
export async function deleteWithCSRFHeader(url: string): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: { 'x-csrf-token': token },
  });

  // If token is stale (403), invalidate cache and retry once
  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: { 'x-csrf-token': freshToken },
    });
  }

  return res;
}

/**
 * Perform a PUT mutation request with CSRF token included.
 */
export async function putWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('PUT', url, body);
}

/**
 * Perform a DELETE mutation request with CSRF token included.
 */
export async function deleteWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('DELETE', url, body);
}

/**
 * Perform a PATCH mutation request with CSRF token included.
 */
export async function patchWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('PATCH', url, body);
}

/**
 * Fetch all app data from API and populate the Zustand store.
 * Called once after successful login or registration.
 * Session cookie is sent automatically by the browser.
 * @param user - Optional user object to use instead of store.currentUser (avoids race condition)
 */
export async function hydrateAppData(user?: User) {
  const generation = ++hydrateGeneration;
  const store = useAppStore.getState();
  if (hydrateGeneration !== generation) return;
  store.setIsLoading(true);

  const currentUser = user ?? store.currentUser;
  if (!currentUser) {
    appLogger.error('api.hydrate', 'hydrateAppData called without user context');
    if (hydrateGeneration === generation) store.setIsLoading(false);
    return;
  }
  const errors: string[] = [];

  try {
    // Fetch all profiles (other users)
    const profilesPromise = (async () => {
      try {
        const profilesRes = await fetchWithTimeout(`/api/profiles?limit=${PAGINATION.DEMO_FETCH_LIMIT}`);
        if (!profilesRes.ok) throw new Error('Failed to fetch profiles');
        const profilesBody = await profilesRes.json();
        const allUsers: User[] = Array.isArray(profilesBody.data) ? profilesBody.data : [];
        const otherProfiles = currentUser ? allUsers.filter((u) => u.id !== currentUser.id) : allUsers;
        if (hydrateGeneration === generation) store.setProfiles(otherProfiles);

        // Set online status based on actual activity (lastSeenAt within threshold)
        if (hydrateGeneration === generation) {
          const now = Date.now();
          const onlineIds = otherProfiles
            .filter((p) => {
              if (!p.lastSeenAt) return false;
              const lastSeen = new Date(p.lastSeenAt).getTime();
              return (now - lastSeen) <= ONLINE_PRESENCE.ACTIVE_THRESHOLD_MS;
            })
            .map((p) => p.id);
          store.setOnlineUserIds(onlineIds);
        }
      } catch (e) {
        errors.push('profiles');
        appLogger.error('api.hydrate', 'Failed to hydrate profiles', e);
      }
    })();

    // Fetch matches with messages
    const matchesPromise = (async () => {
      try {
        const matchesRes = await fetchWithTimeout('/api/matches');
        if (matchesRes.ok) {
          const matchesBody = await matchesRes.json();
          const matches: MatchWithUsers[] = Array.isArray(matchesBody?.data) ? matchesBody.data : [];
          if (hydrateGeneration === generation) store.setMatches(matches);
        } else {
          errors.push('matches');
          appLogger.error('api.hydrate', 'Failed to hydrate matches', new Error(`HTTP ${matchesRes.status}`));
        }
      } catch (e) {
        errors.push('matches');
        appLogger.error('api.hydrate', 'Failed to hydrate matches', e);
      }
    })();

    // Fetch received likes (who liked you)
    const likedYouPromise = (async () => {
      try {
        const likedYouRes = await fetchWithTimeout('/api/likes/received');
        if (likedYouRes.ok) {
          const likedYouBody = await likedYouRes.json();
          const likedYouUsers: User[] = Array.isArray(likedYouBody?.data) ? likedYouBody.data : [];
          if (hydrateGeneration === generation) store.setLikedYouProfiles(likedYouUsers);
        } else {
          errors.push('likedYou');
          appLogger.error('api.hydrate', 'Failed to hydrate likedYou', new Error(`HTTP ${likedYouRes.status}`));
        }
      } catch (e) {
        errors.push('likedYou');
        appLogger.error('api.hydrate', 'Failed to hydrate likedYou', e);
      }
    })();

    // Build set of already-liked user IDs
    const likeSentPromise = (async () => {
      try {
        const likeSentRes = await fetchWithTimeout('/api/likes/sent');
        if (likeSentRes.ok) {
          const likeSentBody = await likeSentRes.json();
          const likes: { toUserId: string }[] = Array.isArray(likeSentBody?.data) ? likeSentBody.data : [];
          for (const like of likes) {
            if (hydrateGeneration === generation && like.toUserId) store.addLikedUserId(like.toUserId);
          }
        } else {
          errors.push('likeSent');
          appLogger.error('api.hydrate', 'Failed to hydrate likeSent', new Error(`HTTP ${likeSentRes.status}`));
        }
      } catch (e) {
        errors.push('likeSent');
        appLogger.error('api.hydrate', 'Failed to hydrate likeSent', e);
      }
    })();

    // Fetch blocked users
    const blockedPromise = (async () => {
      try {
        const blockedRes = await fetchWithTimeout('/api/block');
        if (blockedRes.ok) {
          const blockedBody = await blockedRes.json();
          const blocks: { blockedId: string }[] = Array.isArray(blockedBody?.data) ? blockedBody.data : [];
          const blockedIds: string[] = blocks.map((b) => b.blockedId).filter(Boolean);
          if (hydrateGeneration === generation) useAppStore.setState({ blockedUserIds: blockedIds });
        } else {
          errors.push('blocked');
          appLogger.error('api.hydrate', 'Failed to hydrate blocked', new Error(`HTTP ${blockedRes.status}`));
        }
      } catch (e) {
        errors.push('blocked');
        appLogger.error('api.hydrate', 'Failed to hydrate blocked', e);
      }
    })();

    // Fetch disliked user IDs
    const dislikedPromise = (async () => {
      try {
        const dislikedRes = await fetchWithTimeout('/api/dislike');
        if (dislikedRes.ok) {
          const dislikedBody = await dislikedRes.json();
          const dislikedIds: string[] = Array.isArray(dislikedBody?.data) ? dislikedBody.data : [];
          if (hydrateGeneration === generation) useAppStore.setState({ dislikedUserIds: dislikedIds });
        } else {
          errors.push('disliked');
          appLogger.error('api.hydrate', 'Failed to hydrate dislikes', new Error(`HTTP ${dislikedRes.status}`));
        }
      } catch (e) {
        errors.push('disliked');
        appLogger.error('api.hydrate', 'Failed to hydrate dislikes', e);
      }
    })();

    // Fetch moments
    const momentsPromise = (async () => {
      try {
        const momentsRes = await fetchWithTimeout('/api/moments');
        if (momentsRes.ok) {
          const momentsBody = await momentsRes.json();
          const momentsData = Array.isArray(momentsBody?.data) ? momentsBody.data : [];
          if (hydrateGeneration === generation) useAppStore.setState({ moments: momentsData });
        } else {
          errors.push('moments');
          appLogger.error('api.hydrate', 'Failed to hydrate moments', new Error(`HTTP ${momentsRes.status}`));
        }
      } catch (e) {
        errors.push('moments');
        appLogger.error('api.hydrate', 'Failed to hydrate moments', e);
      }
    })();

    // Fetch achievements
    const achievementsPromise = (async () => {
      try {
        const achievementsRes = await fetchWithTimeout('/api/achievements');
        if (achievementsRes.ok) {
          const achievementsBody = await achievementsRes.json();
          const unlocked = Array.isArray(achievementsBody?.unlocked) ? achievementsBody.unlocked : [];
          if (hydrateGeneration === generation) useAppStore.setState({ unlockedAchievements: unlocked });
        } else {
          errors.push('achievements');
          appLogger.error('api.hydrate', 'Failed to hydrate achievements', new Error(`HTTP ${achievementsRes.status}`));
        }
      } catch (e) {
        errors.push('achievements');
        appLogger.error('api.hydrate', 'Failed to hydrate achievements', e);
      }
    })();

    // Load user settings
    const settingsPromise = (async () => {
      try {
        const settingsRes = await fetchWithTimeout('/api/settings');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings && typeof settings === 'object') {
            if (hydrateGeneration === generation) {
              useAppStore.setState({
                notificationsEnabled: settings.notificationsEnabled ?? true,
                profileVisible: settings.profileVisible ?? true,
                showOnlineStatus: settings.showOnlineStatus ?? true,
                language: settings.language ?? (SUPPORTED_LOCALES.includes(detectBrowserLocale() as Locale) ? detectBrowserLocale() : 'ru'),
                showDistance: settings.showDistance ?? false,
                soundEnabled: settings.soundEnabled ?? true,
                matchNotifications: settings.matchNotifications ?? true,
                likeNotifications: settings.likeNotifications ?? true,
              });
            }
          }
        } else {
          errors.push('settings');
          appLogger.error('api.hydrate', 'Failed to hydrate settings', new Error(`HTTP ${settingsRes.status}`));
        }
      } catch (e) {
        errors.push('settings');
        appLogger.error('api.hydrate', 'Failed to hydrate settings', e);
      }
    })();

    await Promise.allSettled([
      profilesPromise,
      matchesPromise,
      likedYouPromise,
      likeSentPromise,
      blockedPromise,
      dislikedPromise,
      momentsPromise,
      achievementsPromise,
      settingsPromise,
    ]);
  } finally {
    if (hydrateGeneration === generation) store.setIsLoading(false);
  }

  if (hydrateGeneration !== generation) return;
  if (errors.length > 0) {
    const { toast } = await import('sonner');
    toast.warning('Некоторые данные не загрузились', {
      description: `Не удалось загрузить: ${errors.join(', ')}. Попробуйте обновить страницу.`,
    });
  }
}
