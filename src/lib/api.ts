import { useAppStore, type User, type MatchWithUsers, type Message } from '@/lib/store';

/**
 * Fetch all app data from API and populate the Zustand store.
 * Called once after successful login or registration.
 */
export async function hydrateAppData(currentUser: User) {
  const store = useAppStore.getState();
  store.setIsLoading(true);

  try {
    // Fetch all profiles (other users)
    const profilesRes = await fetch('/api/profiles?limit=100');
    if (!profilesRes.ok) throw new Error('Failed to fetch profiles');
    const profilesBody = await profilesRes.json();
    const allUsers: User[] = profilesBody.data ?? profilesBody;
    const otherProfiles = allUsers.filter((u) => u.id !== currentUser.id);
    store.setProfiles(otherProfiles);

    // Set online status (random ~40% for now)
    const otherIds = otherProfiles.map((p) => p.id);
    const shuffled = otherIds.sort(() => Math.random() - 0.5);
    const onlineIds = shuffled.slice(0, Math.ceil(shuffled.length * 0.4));
    store.setOnlineUserIds(onlineIds);

    // Fetch matches with messages
    const matchesRes = await fetch(`/api/matches?userId=${currentUser.id}`);
    if (matchesRes.ok) {
      const matches: MatchWithUsers[] = await matchesRes.json();
      store.setMatches(matches);
    }

    // Fetch received likes (who liked you)
    const likedYouRes = await fetch(`/api/likes/received?userId=${currentUser.id}`);
    if (likedYouRes.ok) {
      const likedYouUsers: User[] = await likedYouRes.json();
      store.setLikedYouProfiles(likedYouUsers);
    }

    // Build set of already-liked user IDs so swipe cards are filtered
    const likeSentRes = await fetch(`/api/likes/sent?userId=${currentUser.id}`);
    if (likeSentRes.ok) {
      const likes: { toUserId: string }[] = await likeSentRes.json();
      for (const like of likes) {
        store.addLikedUserId(like.toUserId);
      }
    }
  } catch (error) {
    console.error('Failed to hydrate app data:', error);
  } finally {
    store.setIsLoading(false);
  }
}
