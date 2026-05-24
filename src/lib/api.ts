import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';

let csrfToken: string | null = null;
let csrfTokenFetchedAt: number | null = null;
const CSRF_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds

/**
 * Fetch with an abort timeout to prevent hanging requests.
 */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch a fresh CSRF token from the server.
 * The token is cached for 5 minutes, then refreshed.
 */
export async function getCSRFToken(): Promise<string> {
  const now = Date.now();
  if (csrfToken && csrfTokenFetchedAt && now - csrfTokenFetchedAt < CSRF_TOKEN_TTL) {
    return csrfToken;
  }

  const res = await fetchWithTimeout('/api/auth/csrf-token');
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.csrfToken as string;
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
  const store = useAppStore.getState();
  store.setIsLoading(true);

  const currentUser = user ?? store.currentUser;
  const errors: string[] = [];

  try {
    // Fetch all profiles (other users)
    const profilesPromise = (async () => {
      try {
        const profilesRes = await fetchWithTimeout('/api/profiles?limit=100');
        if (!profilesRes.ok) throw new Error('Failed to fetch profiles');
        const profilesBody = await profilesRes.json();
        const allUsers: User[] = Array.isArray(profilesBody.data) ? profilesBody.data : [];
        const otherProfiles = currentUser ? allUsers.filter((u) => u.id !== currentUser.id) : allUsers;
        store.setProfiles(otherProfiles);

        // Set online status based on each user's showOnlineStatus preference
        const onlineIds = otherProfiles
          .filter((p) => p.showOnlineStatus)
          .map((p) => p.id);
        store.setOnlineUserIds(onlineIds);
      } catch (e) {
        errors.push('profiles');
        console.error('Failed to hydrate profiles:', e);
      }
    })();

    // Fetch matches with messages
    const matchesPromise = (async () => {
      try {
        const matchesRes = await fetchWithTimeout('/api/matches');
        if (matchesRes.ok) {
          const matchesBody = await matchesRes.json();
          const matches: MatchWithUsers[] = Array.isArray(matchesBody?.data) ? matchesBody.data : [];
          store.setMatches(matches);
        }
      } catch (e) {
        errors.push('matches');
        console.error('Failed to hydrate matches:', e);
      }
    })();

    // Fetch received likes (who liked you)
    const likedYouPromise = (async () => {
      try {
        const likedYouRes = await fetchWithTimeout('/api/likes/received');
        if (likedYouRes.ok) {
          const likedYouBody = await likedYouRes.json();
          const likedYouUsers: User[] = Array.isArray(likedYouBody) ? likedYouBody : [];
          store.setLikedYouProfiles(likedYouUsers);
        }
      } catch (e) {
        errors.push('likedYou');
        console.error('Failed to hydrate likedYou:', e);
      }
    })();

    // Build set of already-liked user IDs
    const likeSentPromise = (async () => {
      try {
        const likeSentRes = await fetchWithTimeout('/api/likes/sent');
        if (likeSentRes.ok) {
          const likeSentBody = await likeSentRes.json();
          const likes: { toUserId: string }[] = Array.isArray(likeSentBody) ? likeSentBody : [];
          for (const like of likes) {
            if (like.toUserId) store.addLikedUserId(like.toUserId);
          }
        }
      } catch (e) {
        errors.push('likeSent');
        console.error('Failed to hydrate likeSent:', e);
      }
    })();

    // Fetch blocked users
    const blockedPromise = (async () => {
      try {
        const blockedRes = await fetchWithTimeout('/api/block');
        if (blockedRes.ok) {
          const blockedBody = await blockedRes.json();
          const blocks: { blockedId: string }[] = Array.isArray(blockedBody?.blocks) ? blockedBody.blocks : [];
          const blockedIds: string[] = blocks.map((b) => b.blockedId).filter(Boolean);
          useAppStore.setState({ blockedUserIds: blockedIds });
        }
      } catch (e) {
        errors.push('blocked');
        console.error('Failed to hydrate blocked:', e);
      }
    })();

    // Fetch moments
    const momentsPromise = (async () => {
      try {
        const momentsRes = await fetchWithTimeout('/api/moments');
        if (momentsRes.ok) {
          const momentsBody = await momentsRes.json();
          const momentsData = Array.isArray(momentsBody?.data) ? momentsBody.data : [];
          useAppStore.setState({ moments: momentsData });
        }
      } catch (e) {
        errors.push('moments');
        console.error('Failed to hydrate moments:', e);
      }
    })();

    // Fetch achievements
    const achievementsPromise = (async () => {
      try {
        const achievementsRes = await fetchWithTimeout('/api/achievements');
        if (achievementsRes.ok) {
          const achievementsBody = await achievementsRes.json();
          const unlocked = Array.isArray(achievementsBody?.unlocked) ? achievementsBody.unlocked : [];
          useAppStore.setState({ unlockedAchievements: unlocked });
        }
      } catch (e) {
        errors.push('achievements');
        console.error('Failed to hydrate achievements:', e);
      }
    })();

    // Load user settings
    const settingsPromise = (async () => {
      try {
        const settingsRes = await fetchWithTimeout('/api/settings');
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings && typeof settings === 'object') {
            useAppStore.setState({
              notificationsEnabled: settings.notificationsEnabled ?? true,
              profileVisible: settings.profileVisible ?? true,
              showOnlineStatus: settings.showOnlineStatus ?? true,
              language: settings.language ?? 'ru',
              showDistance: settings.showDistance ?? false,
              soundEnabled: settings.soundEnabled ?? true,
              matchNotifications: settings.matchNotifications ?? true,
              likeNotifications: settings.likeNotifications ?? true,
            });
          }
        }
      } catch (e) {
        errors.push('settings');
        console.error('Failed to hydrate settings:', e);
      }
    })();

    await Promise.allSettled([
      profilesPromise,
      matchesPromise,
      likedYouPromise,
      likeSentPromise,
      blockedPromise,
      momentsPromise,
      achievementsPromise,
      settingsPromise,
    ]);
  } finally {
    store.setIsLoading(false);
  }

  if (errors.length > 0) {
    const { toast } = await import('sonner');
    toast.warning('Некоторые данные не загрузились', {
      description: `Не удалось загрузить: ${errors.join(', ')}. Попробуйте обновить страницу.`,
    });
  }
}
