import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';
import { logger } from '@/lib/logger';
import { PAGINATION, ONLINE_PRESENCE, CSRF_TOKEN_TTL, FETCH_TIMEOUT_MS, DEFAULT_LOCALE } from '@/lib/constants';
import { detectBrowserLocale, SUPPORTED_LOCALES, createTranslatorForLanguage, type Locale } from '@/lib/i18n';
import { toast } from 'sonner';

let csrfToken: string | null = null;
let csrfTokenFetchedAt: number | null = null;
let csrfTokenPromise: Promise<string> | null = null;
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
  return match ? decodeURIComponent(match[1]!) : null;
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

  // Deduplicate concurrent fetches — join an in-flight request instead of racing
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async (): Promise<string> => {
    const res = await fetchWithTimeout('/api/auth/csrf-token');
    if (!res.ok) throw new Error('Failed to fetch CSRF token');
    const freshToken = getCSRFTokenFromCookie();
    if (!freshToken) throw new Error('CSRF token not set by server');
    csrfToken = freshToken;
    csrfTokenFetchedAt = Date.now();
    return csrfToken;
  })();

  try {
    return await csrfTokenPromise;
  } finally {
    csrfTokenPromise = null;
  }
}

/**
 * Execute a request function with automatic CSRF retry on 403.
 * If the first attempt returns 403, invalidates the cached token and retries once.
 */
async function withCSRFRetry(makeRequest: (token: string) => Promise<Response>): Promise<Response> {
  const token = await getCSRFToken();
  const res = await makeRequest(token);
  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    return makeRequest(freshToken);
  }
  return res;
}

/**
 * Perform a JSON mutation request with CSRF token included.
 */
async function requestWithCSRF(
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  body: unknown,
): Promise<Response> {
  return withCSRFRetry((token) =>
    fetchWithTimeout(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
      body: JSON.stringify(body),
    })
  );
}

/**
 * Perform a POST mutation request with CSRF token and FormData body.
 * Used for file uploads where JSON.stringify cannot be used.
 * FormData is cloned before each attempt since body can only be consumed once.
 */
export async function postWithCSRFFormData(url: string, formData: FormData): Promise<Response> {
  const entries = [...formData.entries()];
  const makeRequest = (token: string) => {
    const body = new FormData();
    for (const [key, value] of entries) body.append(key, value);
    return fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'x-csrf-token': token },
      body,
    });
  };
  return withCSRFRetry(makeRequest);
}

/**
 * Perform a DELETE request with CSRF token (no body).
 */
export async function deleteWithCSRFHeader(url: string): Promise<Response> {
  return withCSRFRetry((token) =>
    fetchWithTimeout(url, {
      method: 'DELETE',
      headers: { 'x-csrf-token': token },
    })
  );
}

export async function fetchWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('POST', url, body);
}

export async function putWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('PUT', url, body);
}

export async function deleteWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('DELETE', url, body);
}

export async function patchWithCSRF(url: string, body: unknown): Promise<Response> {
  return requestWithCSRF('PATCH', url, body);
}

function hydrateSection(
  name: string,
  url: string,
  generation: number,
  onOk: (data: unknown) => void,
  errors: string[],
) {
  return (async () => {
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const body = await res.json();
        if (hydrateGeneration === generation) onOk(body);
      } else {
        errors.push(name);
        logger.error('api.hydrate', `Failed to hydrate ${name}`, new Error(`HTTP ${res.status}`));
      }
    } catch (e) {
      errors.push(name);
      logger.error('api.hydrate', `Failed to hydrate ${name}`, e);
    }
  })();
}

export async function hydrateAppData(user?: User) {
  const generation = ++hydrateGeneration;
  const store = useAppStore.getState();
  if (hydrateGeneration !== generation) return;
  store.setIsLoading(true);

  const currentUser = user ?? store.currentUser;
  if (!currentUser) {
    logger.error('api.hydrate', 'hydrateAppData called without user context');
    if (hydrateGeneration === generation) store.setIsLoading(false);
    return;
  }
  const errors: string[] = [];

  try {
    const profilesPromise = (async () => {
      try {
        const res = await fetchWithTimeout(`/api/profiles?limit=${PAGINATION.DEMO_FETCH_LIMIT}`);
        if (!res.ok) throw new Error('Failed to fetch profiles');
        const body = await res.json();
        const allUsers: User[] = Array.isArray(body.data) ? body.data : [];
        const otherProfiles = currentUser ? allUsers.filter((u) => u.id !== currentUser.id) : allUsers;
        if (hydrateGeneration === generation) {
          store.setProfiles(otherProfiles);
          store.setProfilesCursor(body.nextCursor ?? null);
          const now = Date.now();
          const onlineIds = otherProfiles
            .filter((p) => {
              if (!p.lastSeenAt) return false;
              return (now - new Date(p.lastSeenAt).getTime()) <= ONLINE_PRESENCE.ACTIVE_THRESHOLD_MS;
            })
            .map((p) => p.id);
          store.setOnlineUserIds(onlineIds);
        }
      } catch (e) {
        errors.push('profiles');
        logger.error('api.hydrate', 'Failed to hydrate profiles', e);
      }
    })();

    const matchesPromise = hydrateSection('matches', '/api/matches', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      store.setMatches(Array.isArray(data) ? data as MatchWithUsers[] : []);
    }, errors);

    const likedYouPromise = hydrateSection('likedYou', '/api/likes/received', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      store.setLikedYouProfiles(Array.isArray(data) ? data as User[] : []);
    }, errors);

    const likeSentPromise = hydrateSection('likeSent', '/api/likes/sent', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      const likes: { toUserId: string }[] = Array.isArray(data) ? data : [];
      for (const like of likes) {
        if (hydrateGeneration === generation && like.toUserId) store.addLikedUserId(like.toUserId);
      }
    }, errors);

    const blockedPromise = hydrateSection('blocked', '/api/block', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      const blocks: { blockedId: string }[] = Array.isArray(data) ? data : [];
      store.setBlockedUserIds(blocks.map((b) => b.blockedId).filter(Boolean));
    }, errors);

    const dislikedPromise = hydrateSection('disliked', '/api/dislike', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      useAppStore.setState({ dislikedUserIds: Array.isArray(data) ? data as string[] : [] });
    }, errors);

    const momentsPromise = hydrateSection('moments', '/api/moments', generation, (body) => {
      const data = (body as { data?: unknown })?.data;
      store.setMoments(Array.isArray(data) ? data : []);
    }, errors);

    const achievementsPromise = hydrateSection('achievements', '/api/achievements', generation, (body) => {
      const unlocked = (body as { unlocked?: unknown })?.unlocked;
      useAppStore.setState({ unlockedAchievements: Array.isArray(unlocked) ? unlocked as string[] : [] });
    }, errors);

    const settingsPromise = hydrateSection('settings', '/api/settings', generation, (body) => {
      if (body && typeof body === 'object') {
        const s = body as Record<string, boolean | string | undefined>;
        useAppStore.setState({
          notificationsEnabled: (s.notificationsEnabled as boolean) ?? true,
          profileVisible: (s.profileVisible as boolean) ?? true,
          showOnlineStatus: (s.showOnlineStatus as boolean) ?? true,
          language: (s.language as string) ?? (SUPPORTED_LOCALES.includes(detectBrowserLocale() as Locale) ? detectBrowserLocale() : DEFAULT_LOCALE),
          showDistance: (s.showDistance as boolean) ?? false,
          soundEnabled: (s.soundEnabled as boolean) ?? true,
          matchNotifications: (s.matchNotifications as boolean) ?? true,
          likeNotifications: (s.likeNotifications as boolean) ?? true,
          emailNotifications: (s.emailNotifications as boolean) ?? true,
        });
      }
    }, errors);

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
    const lang = useAppStore.getState().language || DEFAULT_LOCALE;
    const t = createTranslatorForLanguage(lang);
    toast.warning(t('common.someDataNotLoaded'), {
      description: t('common.failedToLoadWithRetry', { errors: errors.join(', ') }),
    });
  }
}
