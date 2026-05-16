import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';

let csrfToken: string | null = null;

/**
 * Fetch a fresh CSRF token from the server.
 * The token is cached for subsequent requests.
 */
export async function getCSRFToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const res = await fetch('/api/auth/csrf-token');
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  csrfToken = data.csrfToken as string;
  return csrfToken;
}

/**
 * Perform a mutation request with CSRF token included.
 * Automatically fetches the token if not already cached.
 */
export async function fetchWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Perform a PUT mutation request with CSRF token included.
 */
export async function putWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Perform a DELETE mutation request with CSRF token included.
 */
export async function deleteWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  return fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Perform a PATCH mutation request with CSRF token included.
 */
export async function patchWithCSRF(url: string, body: unknown): Promise<Response> {
  const token = await getCSRFToken();
  return fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Fetch all app data from API and populate the Zustand store.
 * Called once after successful login or registration.
 * Session cookie is sent automatically by the browser.
 */
export async function hydrateAppData() {
  const store = useAppStore.getState();
  store.setIsLoading(true);

  try {
    // Fetch all profiles (other users)
    const profilesRes = await fetch('/api/profiles?limit=100');
    if (!profilesRes.ok) throw new Error('Failed to fetch profiles');
    const profilesBody = await profilesRes.json();
    const allUsers: User[] = profilesBody.data ?? profilesBody;
    const currentUser = store.currentUser;
    const otherProfiles = currentUser ? allUsers.filter((u) => u.id !== currentUser.id) : allUsers;
    store.setProfiles(otherProfiles);

    // Set online status (random ~40% for now)
    const otherIds = otherProfiles.map((p) => p.id);
    const shuffled = otherIds.sort(() => Math.random() - 0.5);
    const onlineIds = shuffled.slice(0, Math.ceil(shuffled.length * 0.4));
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
  } catch (error) {
    console.error('Failed to hydrate app data:', error);
  } finally {
    store.setIsLoading(false);
  }
}
