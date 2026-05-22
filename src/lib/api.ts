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

  try {
    // Fetch all profiles (other users)
    const profilesRes = await fetchWithTimeout('/api/profiles?limit=100');
    if (!profilesRes.ok) throw new Error('Failed to fetch profiles');
    const profilesBody = await profilesRes.json();
    const allUsers: User[] = profilesBody.data ?? profilesBody;
    const currentUser = user ?? store.currentUser;
    const otherProfiles = currentUser ? allUsers.filter((u) => u.id !== currentUser.id) : allUsers;
    store.setProfiles(otherProfiles);

    // Set online status based on each user's showOnlineStatus preference
    const onlineIds = otherProfiles
      .filter((p) => p.showOnlineStatus)
      .map((p) => p.id);
    store.setOnlineUserIds(onlineIds);

    // Fetch matches with messages
    const matchesRes = await fetchWithTimeout('/api/matches');
    if (matchesRes.ok) {
      const matches: MatchWithUsers[] = await matchesRes.json();
      store.setMatches(matches);
    }

    // Fetch received likes (who liked you)
    const likedYouRes = await fetchWithTimeout('/api/likes/received');
    if (likedYouRes.ok) {
      const likedYouUsers: User[] = await likedYouRes.json();
      store.setLikedYouProfiles(likedYouUsers);
    }

    // Build set of already-liked user IDs
    const likeSentRes = await fetchWithTimeout('/api/likes/sent');
    if (likeSentRes.ok) {
      const likes: { toUserId: string }[] = await likeSentRes.json();
      for (const like of likes) {
        store.addLikedUserId(like.toUserId);
      }
    }

    // Fetch blocked users
    const blockedRes = await fetchWithTimeout('/api/block');
    if (blockedRes.ok) {
      const { blocks } = await blockedRes.json();
      const blockedIds: string[] = blocks.map((b: { blockedId: string }) => b.blockedId);
      useAppStore.setState({ blockedUserIds: blockedIds });
    }

    // Fetch moments
    const momentsRes = await fetchWithTimeout('/api/moments');
    if (momentsRes.ok) {
      const { data: momentsData } = await momentsRes.json();
      useAppStore.setState({ moments: momentsData ?? [] });
    }

    // Fetch achievements
    const achievementsRes = await fetchWithTimeout('/api/achievements');
    if (achievementsRes.ok) {
      const { unlocked } = await achievementsRes.json();
      useAppStore.setState({ unlockedAchievements: unlocked ?? [] });
    }

    // Load user settings
    const settingsRes = await fetchWithTimeout('/api/settings');
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
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
  } catch (error) {
    console.error('Failed to hydrate app data:', error);
  } finally {
    store.setIsLoading(false);
  }
}
