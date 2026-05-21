import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';

let csrfToken: string | null = null;
let csrfTokenFetchedAt: number | null = null;
const CSRF_TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch a fresh CSRF token from the server.
 * The token is cached for 5 minutes, then refreshed.
 */
export async function getCSRFToken(): Promise<string> {
  const now = Date.now();
  if (csrfToken && csrfTokenFetchedAt && now - csrfTokenFetchedAt < CSRF_TOKEN_TTL) {
    return csrfToken;
  }

  const res = await fetch('/api/auth/csrf-token');
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.csrfToken as string;
  csrfTokenFetchedAt = now;
  return csrfToken;
}

/**
 * Perform a mutation request with CSRF token included.
 * Automatically fetches the token if not already cached.
 * If the server returns 403, the token is invalidated and retried once.
 */
export async function fetchWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetch(url, {
    method: 'POST',
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
    res = await fetch(url, {
      method: 'POST',
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
 * Perform a PUT mutation request with CSRF token included.
 */
export async function putWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetch(url, {
      method: 'PUT',
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
 * Perform a DELETE mutation request with CSRF token included.
 */
export async function deleteWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetch(url, {
      method: 'DELETE',
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
 * Perform a PATCH mutation request with CSRF token included.
 */
export async function patchWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  let res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 403) {
    csrfToken = null;
    csrfTokenFetchedAt = null;
    const freshToken = await getCSRFToken();
    res = await fetch(url, {
      method: 'PATCH',
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
    const profilesRes = await fetch('/api/profiles?limit=100');
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
    const matchesRes = await fetch('/api/matches');
    if (matchesRes.ok) {
      const matches: MatchWithUsers[] = await matchesRes.json();
      store.setMatches(matches);
    }

    // Fetch received likes (who liked you)
    const likedYouRes = await fetch('/api/likes/received');
    if (likedYouRes.ok) {
      const likedYouUsers: User[] = await likedYouRes.json();
      store.setLikedYouProfiles(likedYouUsers);
    }

    // Build set of already-liked user IDs
    const likeSentRes = await fetch('/api/likes/sent');
    if (likeSentRes.ok) {
      const likes: { toUserId: string }[] = await likeSentRes.json();
      for (const like of likes) {
        store.addLikedUserId(like.toUserId);
      }
    }

    // Fetch blocked users
    const blockedRes = await fetch('/api/block');
    if (blockedRes.ok) {
      const { blocks } = await blockedRes.json();
      const blockedIds: string[] = blocks.map((b: { blockedId: string }) => b.blockedId);
      useAppStore.setState({ blockedUserIds: blockedIds });
    }

    // Fetch moments
    const momentsRes = await fetch('/api/moments');
    if (momentsRes.ok) {
      const { data: momentsData } = await momentsRes.json();
      useAppStore.setState({ moments: momentsData ?? [] });
    }

    // Fetch achievements
    const achievementsRes = await fetch('/api/achievements');
    if (achievementsRes.ok) {
      const { unlocked } = await achievementsRes.json();
      useAppStore.setState({ unlockedAchievements: unlocked ?? [] });
    }

    // Load user settings
    const settingsRes = await fetch('/api/settings');
    if (settingsRes.ok) {
      const settings = await settingsRes.json();
      useAppStore.setState({
        notificationsEnabled: settings.notificationsEnabled ?? true,
        profileVisible: settings.profileVisible ?? true,
        showOnlineStatus: settings.showOnlineStatus ?? true,
        language: settings.language ?? 'ru',
      });
    }
  } catch (error) {
    console.error('Failed to hydrate app data:', error);
  } finally {
    store.setIsLoading(false);
  }
}
