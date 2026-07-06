'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import {
  Heart, X, Star, MapPin, SlidersHorizontal, Undo2, BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWithCSRF, deleteWithCSRF, fetchWithTimeout } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAppStore, type User } from '@/lib/store';
import { SUPER_LIKE_DAILY_LIMIT, SWIPE, MATCH_ANIMATION_DELAY, FILTER, SPRING, SWIPE_EXT, BLOCK_REASON, REPORT_REASON, AVATAR_BASE_URL } from '@/lib/constants';
import { FilterPanel } from './shared';
import { ProfileDetailModal } from './profile-detail-modal';
import { useTranslation } from '@/hooks/useTranslation';

export function BrowseView() {
  const {
    profiles, currentUser, profilesCursor,
    removeProfile, addProfiles, setProfilesCursor,
    addLikedUserId, addDislikedUserId, addSuperLikedUserId,
    setShowMatchAnimation, setMatchAnimationPartner, showFilters, setShowFilters,
    filterGender, filterAgeMin, filterAgeMax, filterCity,
    searchQuery, sortBy, blockedUserIds, dislikedUserIds,
  } = useAppStore(
    useShallow((s) => ({
      profiles: s.profiles,
      currentUser: s.currentUser,
      profilesCursor: s.profilesCursor,
      removeProfile: s.removeProfile,
      addProfiles: s.addProfiles,
      setProfilesCursor: s.setProfilesCursor,
      addLikedUserId: s.addLikedUserId,
      addDislikedUserId: s.addDislikedUserId,
      addSuperLikedUserId: s.addSuperLikedUserId,
      setShowMatchAnimation: s.setShowMatchAnimation,
      setMatchAnimationPartner: s.setMatchAnimationPartner,
      showFilters: s.showFilters,
      setShowFilters: s.setShowFilters,
      filterGender: s.filterGender,
      filterAgeMin: s.filterAgeMin,
      filterAgeMax: s.filterAgeMax,
      filterCity: s.filterCity,
      searchQuery: s.searchQuery,
      sortBy: s.sortBy,
      blockedUserIds: s.blockedUserIds,
      dislikedUserIds: s.dislikedUserIds,
    }))
  );
  const { t } = useTranslation();
  const [loadingMore, setLoadingMore] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showX, setShowX] = useState(false);
  const [showSuperLike, setShowSuperLike] = useState(false);
  const [superLikeRemaining, setSuperLikeRemaining] = useState(SUPER_LIKE_DAILY_LIMIT);
  const [dragX, setDragX] = useState(0);
  const [detailProfile, setDetailProfile] = useState<User | null>(null);
  const [lastSwipedProfile, setLastSwipedProfile] = useState<User | null>(null);
  const [lastSwipeAction, setLastSwipeAction] = useState<'like' | 'dislike' | 'superLike' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timerIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up all pending timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of timerIdsRef.current) {
        clearTimeout(timer);
      }
      timerIdsRef.current = [];
    };
  }, []);

  // Load super like status
  useEffect(() => {
    const loadSuperLikeStatus = async () => {
      try {
        const res = await fetchWithTimeout('/api/superlike/status');
        if (res.ok) {
          const data = await res.json();
          setSuperLikeRemaining(data.remaining);
        }
      } catch (error) {
        logger.warn('browse-view.superlike-status', 'Failed to load super-like status', error);
        setSuperLikeRemaining(0);
      }
    };
    loadSuperLikeStatus();
  }, []);

  // Build a popularity map from likedYouProfiles
  const likedYouProfiles = useAppStore(useShallow((s) => s.likedYouProfiles));
  const popularityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of likedYouProfiles) {
      map[p.id] = (map[p.id] || 0) + 1;
    }
    return map;
  }, [likedYouProfiles]);

  const setProfiles = useAppStore((s) => s.setProfiles);

  // Refetch profiles when sort changes to 'recommended'
  useEffect(() => {
    if (sortBy !== 'recommended') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(`/api/profiles?sort=recommended&limit=100`);
        if (!res.ok) throw new Error('Failed to fetch recommended profiles');
        const body = await res.json();
        const recommended: User[] = Array.isArray(body.data) ? body.data : [];
        if (!cancelled) {
          setProfiles(recommended.filter((p) => p.id !== currentUser?.id));
          setProfilesCursor(body.nextCursor ?? null);
        }
      } catch (error) {
        logger.error('browse-view.recommended', 'Failed to fetch recommendations', error);
      }
    })();
    return () => { cancelled = true; };
  }, [sortBy, currentUser?.id, setProfiles, setProfilesCursor]);

  // Filter and sort profiles
  const filteredProfiles = useMemo(() => {
    const result = profiles.filter((p) => {
      if (blockedUserIds.includes(p.id)) return false;
      if (dislikedUserIds.includes(p.id)) return false;
      if (filterGender !== 'all' && p.gender !== filterGender) return false;
      if (p.age < filterAgeMin) return false;
      if (p.age > filterAgeMax) return false;
      if (filterCity && (!p.city || !p.city.toLowerCase().includes(filterCity.toLowerCase()))) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    if (sortBy === 'recommended') {
      return result;
    }
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (popularityMap[b.id] || 0) - (popularityMap[a.id] || 0));
    } else {
      result.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    return result;
  }, [profiles, filterGender, filterAgeMin, filterAgeMax, filterCity, searchQuery, sortBy, blockedUserIds, dislikedUserIds, popularityMap]);

  const loadMoreProfiles = useCallback(async () => {
    if (!profilesCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const sortParam = sortBy === 'recommended' ? 'sort=recommended&' : '';
      const res = await fetchWithTimeout(`/api/profiles?${sortParam}cursor=${encodeURIComponent(profilesCursor)}&limit=100`);
      if (!res.ok) throw new Error('Failed to load more profiles');
      const body = await res.json();
      const newProfiles: User[] = Array.isArray(body.data) ? body.data : [];
      if (newProfiles.length > 0) {
        const filtered = currentUser
          ? newProfiles.filter((p) => p.id !== currentUser.id && !dislikedUserIds.includes(p.id) && !blockedUserIds.includes(p.id))
          : newProfiles;
        addProfiles(filtered);
      }
      setProfilesCursor(body.nextCursor ?? null);
    } catch (error) {
      logger.error('browse-view.loadMore', 'Failed to load more profiles', error);
    } finally {
      setLoadingMore(false);
    }
  }, [profilesCursor, loadingMore, currentUser, dislikedUserIds, blockedUserIds, addProfiles, setProfilesCursor, sortBy]);

  // Auto-load more profiles when running low (less than 3 remaining)
  useEffect(() => {
    if (filteredProfiles.length < 3 && profilesCursor && !loadingMore) {
      loadMoreProfiles();
    }
  }, [filteredProfiles.length, profilesCursor, loadingMore, loadMoreProfiles]);

  const currentProfile = filteredProfiles.length > 0 ? filteredProfiles[0] : null;

  const activeFilterCount = (searchQuery ? 1 : 0) + (sortBy !== 'new' ? 1 : 0) + (filterGender !== 'all' ? 1 : 0) + (filterAgeMin > FILTER.AGE_DEFAULT_MIN ? 1 : 0) + (filterAgeMax < FILTER.AGE_DEFAULT_MAX ? 1 : 0) + (filterCity ? 1 : 0);

  const canUndo = (lastSwipedProfile !== null && lastSwipeAction !== null);

  const handleLike = useCallback(async (profile: User) => {
    if (!currentUser) return;
    setSwipeDir('right');
    setShowHeartBurst(true);
    addLikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('like');

    const t1 = setTimeout(() => { setSwipeDir(null); setShowHeartBurst(false); }, SWIPE.ANIMATION_DURATION);
    timerIdsRef.current.push(t1);

    try {
      const res = await fetchWithCSRF('/api/like', { toUserId: profile.id });
      if (!res.ok) throw new Error('Like failed');
      const data = await res.json();
      if (data.isMutual) {
        toast.success(t('matches.newWithName', { name: profile.name }), {
          description: t('browse.mutualLike'),
          className: 'toast-match',
        });
        setMatchAnimationPartner(profile);
        const t2 = setTimeout(() => { setShowMatchAnimation(true); }, MATCH_ANIMATION_DELAY);
        timerIdsRef.current.push(t2);
      }
      const t3 = setTimeout(() => removeProfile(profile.id), SWIPE.CARD_REMOVAL_DELAY);
      timerIdsRef.current.push(t3);
    } catch (error) {
      // Rollback optimistic update atomically to prevent stale state races
      useAppStore.setState((state) => ({
        likedUserIds: state.likedUserIds.filter((id) => id !== profile.id),
      }));
      setLastSwipedProfile(null);
      setLastSwipeAction(null);
      toast.error(t('browse.likeError'), { description: t('common.retry') });
      logger.error('browse-view.like', 'Like failed', error);
    }
  }, [currentUser, addLikedUserId, setMatchAnimationPartner, setShowMatchAnimation, removeProfile, t]);

  const handleDislike = useCallback(async (profile: User) => {
    if (!currentUser) return;
    setSwipeDir('left');
    setShowX(true);
    addDislikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('dislike');

    const t1 = setTimeout(() => { setSwipeDir(null); setShowX(false); }, SWIPE.ANIMATION_DURATION);
    timerIdsRef.current.push(t1);

    try {
      const res = await fetchWithCSRF('/api/dislike', { toUserId: profile.id });
      if (!res.ok) throw new Error('Dislike failed');
      const t2 = setTimeout(() => removeProfile(profile.id), SWIPE.CARD_REMOVAL_DELAY);
      timerIdsRef.current.push(t2);
    } catch (error) {
      useAppStore.setState((state) => ({
        dislikedUserIds: state.dislikedUserIds.filter((id) => id !== profile.id),
      }));
      setLastSwipedProfile(null);
      setLastSwipeAction(null);
      toast.error(t('browse.dislikeError'), { description: t('common.retry') });
      logger.error('browse-view.dislike', 'Dislike failed', error);
    }
  }, [currentUser, addDislikedUserId, removeProfile, t]);

  const handleSuperLike = useCallback(async (profile: User) => {
    if (!currentUser) return;
    setShowSuperLike(true);
    addSuperLikedUserId(profile.id);
    addLikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('superLike');
    const t1 = setTimeout(() => { setShowSuperLike(false); }, SWIPE.SUPER_LIKE_DURATION);
    timerIdsRef.current.push(t1);
    try {
      const res = await fetchWithCSRF('/api/like', { toUserId: profile.id, isSuperLike: true });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 429) {
          toast.error(t('browse.superLikeLimitReached'), {
            description: t('browse.superLikeRemaining', { remaining: errorData.remaining || 0, limit: errorData.limit || SUPER_LIKE_DAILY_LIMIT }),
          });
          setSuperLikeRemaining(errorData.remaining || 0);
        }
        throw new Error(errorData.error || 'Super Like failed');
      }
      setSuperLikeRemaining((prev) => Math.max(0, prev - 1));
      const data = await res.json();
      if (data.isMutual) {
        toast.success(t('matches.newWithName', { name: profile.name }), {
          description: t('browse.mutualLike'),
          className: 'toast-match',
        });
        setMatchAnimationPartner(profile);
        const t2 = setTimeout(() => { setShowMatchAnimation(true); }, MATCH_ANIMATION_DELAY);
        timerIdsRef.current.push(t2);
      }
      const t3 = setTimeout(() => removeProfile(profile.id), SWIPE.CARD_REMOVAL_DELAY);
      timerIdsRef.current.push(t3);
    } catch (error) {
      // Rollback optimistic updates atomically to prevent stale state races
      useAppStore.setState((state) => ({
        likedUserIds: state.likedUserIds.filter((id) => id !== profile.id),
        superLikedUserIds: state.superLikedUserIds.filter((id) => id !== profile.id),
      }));
      setLastSwipedProfile(null);
      setLastSwipeAction(null);
      toast.error(t('browse.superLikeError'), { description: t('common.retry') });
      logger.error('browse-view.superLike', 'Super Like failed', error);
    }
  }, [currentUser, addSuperLikedUserId, addLikedUserId, setMatchAnimationPartner, setShowMatchAnimation, removeProfile, t]);

  const handleUndo = useCallback(async () => {
    if (!lastSwipedProfile || !lastSwipeAction) return;

    // Cancel all pending removal timers first to prevent the profile
    // from being removed after we re-add it (race condition fix).
    for (const timer of timerIdsRef.current) {
      clearTimeout(timer);
    }
    timerIdsRef.current = [];

    // If it was a like or superLike, call API to delete it
    if (lastSwipeAction === 'like' || lastSwipeAction === 'superLike') {
      try {
        await deleteWithCSRF(`/api/like?toUserId=${lastSwipedProfile.id}`, {});
        // Restore superLikeRemaining only if API succeeds
        if (lastSwipeAction === 'superLike') {
          setSuperLikeRemaining((prev) => Math.min(SUPER_LIKE_DAILY_LIMIT, prev + 1));
        }
      } catch (error) {
        toast.error(t('browse.undoLikeError'), { description: t('common.retry') });
        logger.error('browse-view.undo', 'Undo like failed', error);
        // Don't re-add profile to list if API failed - keep it removed
        setLastSwipedProfile(null);
        setLastSwipeAction(null);
        return;
      }
    }

    // If it was a dislike, call API to remove the server-side record
    if (lastSwipeAction === 'dislike') {
      try {
        await deleteWithCSRF(`/api/dislike?toUserId=${lastSwipedProfile.id}`, {});
      } catch (error) {
        toast.error(t('browse.undoDislikeError'), { description: t('common.retry') });
        logger.error('browse-view.undo', 'Undo dislike failed', error);
        // Don't re-add profile to list if API failed - keep it removed
        setLastSwipedProfile(null);
        setLastSwipeAction(null);
        return;
      }
    }

    // Re-add the profile atomically to prevent stale state races
    useAppStore.setState((state) => {
      const alreadyPresent = state.profiles.some((p) => p.id === lastSwipedProfile.id);
      const updatedProfiles = alreadyPresent
        ? state.profiles
        : [lastSwipedProfile, ...state.profiles];

      if (lastSwipeAction === 'dislike') {
        return {
          profiles: updatedProfiles,
          dislikedUserIds: state.dislikedUserIds.filter((id) => id !== lastSwipedProfile.id),
        };
      }
      if (lastSwipeAction === 'like') {
        return {
          profiles: updatedProfiles,
          likedUserIds: state.likedUserIds.filter((id) => id !== lastSwipedProfile.id),
        };
      }
      if (lastSwipeAction === 'superLike') {
        return {
          profiles: updatedProfiles,
          likedUserIds: state.likedUserIds.filter((id) => id !== lastSwipedProfile.id),
          superLikedUserIds: state.superLikedUserIds.filter((id) => id !== lastSwipedProfile.id),
        };
      }
      return state;
    });
    setLastSwipedProfile(null);
    setLastSwipeAction(null);
  }, [lastSwipedProfile, lastSwipeAction, t]);

  // Drag handlers for touch swipe
  const handleDrag = (_: unknown, info: { offset: { x: number } }) => {
    setDragX(info.offset.x);
  };

  const handleSwipeKeyDown = (e: React.KeyboardEvent) => {
    if (!currentProfile) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleLike(currentProfile);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleDislike(currentProfile);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleSuperLike(currentProfile);
    }
  };

  const handleDragEnd = (profile: User, _e: unknown, info: { offset: { x: number } }) => {
    const dragDistance = Math.abs(info.offset.x);

    // If drag distance is very small, treat as tap → open detail modal
    if (dragDistance < SWIPE.TAP_DISTANCE) {
      setDragX(0);
      setDetailProfile(profile);
      return;
    }

    if (info.offset.x > SWIPE.THRESHOLD) {
      handleLike(profile);
    } else if (info.offset.x < -SWIPE.THRESHOLD) {
      handleDislike(profile);
    }
    setDragX(0);
  };

  if (!currentProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Heart className="w-20 h-20 text-rose-200 dark:text-rose-800 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-rose-400 mb-2">{t('browse.noMoreProfiles')}</h2>
          <p className="text-muted-foreground">{t('browse.checkBack')}</p>
          <div className="flex flex-col items-center gap-2 mt-4">
            {canUndo && (
              <Button
                onClick={handleUndo}
                className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800"
              >
                <Undo2 className="w-4 h-4 mr-2" />{t('browse.undoLast')}
              </Button>
            )}
            {profilesCursor && (
              <Button
                onClick={loadMoreProfiles}
                disabled={loadingMore}
                className="bg-rose-500 hover:bg-rose-600 text-white"
              >
                {loadingMore ? t('profile.saving') : t('browse.loadMore')}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-4 md:py-8 relative overflow-y-auto">
      {/* Filter toggle + title + Undo */}
      <div className="flex items-center justify-between w-full max-w-md mb-4">
        <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300">{t('nav.browse')}</h2>
        <div className="flex items-center gap-2">
          {canUndo && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                title={t('browse.undo')}
                aria-label={t('browse.undo')}
              >
                <Undo2 className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="relative text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30" aria-label={t('browse.filter')}>
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && <FilterPanel />}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        {/* Heart Burst */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: SWIPE_EXT.BURST_DURATION }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* X burst */}
        <AnimatePresence>
          {showX && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: SWIPE_EXT.BURST_DURATION }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <X className="w-24 h-24 text-gray-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Super Like burst */}
        <AnimatePresence>
          {showSuperLike && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: SWIPE_EXT.SUPER_LIKE_BURST_DURATION }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="bg-blue-500 rounded-full p-4">
                <Star className="w-16 h-16 text-white fill-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Stack: show next card behind current */}
        {filteredProfiles.length > 1 && (
          <div className="absolute w-full max-w-sm md:max-w-md pointer-events-none" style={{ zIndex: 0 }}>
            <div
              className="w-full rounded-3xl overflow-hidden opacity-40 scale-[0.95] translate-y-2"
            >
              <Card className="overflow-hidden border-0 bg-card">
                <div className="relative aspect-[3/4]">
                  <SafeImage
                    src={filteredProfiles[1]!.avatar || `${AVATAR_BASE_URL}?seed=Default`}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 450px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Card with drag */}
        <motion.div
          ref={cardRef}
          key={currentProfile.id}
          initial={{ opacity: 0, x: 100, rotate: 5, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: swipeDir ? 0.9 : dragX ? 1 - Math.abs(dragX) * 0.0005 : 1,
            x: swipeDir === 'right' ? SWIPE_EXT.EXIT_X : swipeDir === 'left' ? -SWIPE_EXT.EXIT_X : dragX,
            rotate: swipeDir === 'right' ? SWIPE_EXT.ROTATION_ANGLE : swipeDir === 'left' ? -SWIPE_EXT.ROTATION_ANGLE : dragX * SWIPE_EXT.DRAG_ROTATION_FACTOR,
          }}
          transition={{ type: 'spring', stiffness: SPRING.CARD_DRAG_STIFFNESS, damping: SPRING.CARD_DRAG_DAMPING }}
          drag={swipeDir === null ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDrag={handleDrag}
          onDragEnd={(_, info) => handleDragEnd(currentProfile, _, info)}
          whileDrag={{ cursor: 'grabbing', boxShadow: '0 30px 60px rgba(0,0,0,0.3)' }}
          className="w-full max-w-sm md:max-w-md relative touch-none z-10"
          tabIndex={0}
          role="region"
          aria-label={t('browse.profileCard', { name: currentProfile.name })}
          onKeyDown={handleSwipeKeyDown}
          style={{
            filter: dragX ? `brightness(${1 - Math.abs(dragX) * 0.0003})` : undefined,
            boxShadow: dragX
              ? `0 ${10 + Math.abs(dragX) * 0.1}px ${30 + Math.abs(dragX) * 0.2}px rgba(0,0,0,${0.15 + Math.abs(dragX) * 0.001})`
              : '0 20px 50px rgba(0,0,0,0.15)',
          }}
        >
          <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl bg-card">
            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
              <SafeImage src={currentProfile.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={currentProfile.name} fill sizes="(max-width: 768px) 100vw, 450px" className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Swipe labels during drag */}
              {dragX > SWIPE.LABEL_THRESHOLD && (
                <div className="absolute top-8 left-6 bg-green-500/90 text-white px-4 py-2 rounded-lg text-xl font-bold transform -rotate-12 border-[3px] border-green-400 shadow-lg pointer-events-none transition-opacity" style={{ opacity: Math.min((dragX - SWIPE.LABEL_THRESHOLD) / (SWIPE.THRESHOLD - SWIPE.LABEL_THRESHOLD), 1) }}>{t('browse.swipeLike')}</div>
              )}
              {dragX < -SWIPE.LABEL_THRESHOLD && (
                <div className="absolute top-8 right-6 bg-red-500/90 text-white px-4 py-2 rounded-lg text-xl font-bold transform rotate-12 border-[3px] border-red-400 shadow-lg pointer-events-none transition-opacity" style={{ opacity: Math.min((Math.abs(dragX) - SWIPE.LABEL_THRESHOLD) / (SWIPE.THRESHOLD - SWIPE.LABEL_THRESHOLD), 1) }}>{t('browse.swipeNope')}</div>
              )}
              {swipeDir === 'right' && (
                <div className="absolute top-8 left-6 bg-green-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform -rotate-12 border-[3px] border-green-400 shadow-lg pointer-events-none">{t('browse.swipeLike')}</div>
              )}
              {swipeDir === 'left' && (
                <div className="absolute top-8 right-6 bg-red-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform rotate-12 border-[3px] border-red-400 shadow-lg pointer-events-none">{t('browse.swipeNope')}</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                      {currentProfile.name}, {currentProfile.age}
                      {currentProfile.emailVerified && (
                        <BadgeCheck className="w-5 h-5 text-blue-400 drop-shadow" />
                      )}
                    </h2>
                    {currentProfile.city && (
                      <div className="flex items-center gap-1 mt-1 text-white/80">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{currentProfile.city}</span>
                      </div>
                    )}
                  </div>
                  {currentProfile.lookingFor && (
                    <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm flex-shrink-0 ml-2">
                      {currentProfile.lookingFor === 'all' ? t('browse.lookingForAll') : currentProfile.lookingFor === 'male' ? t('browse.lookingForMale') : t('browse.lookingForFemale')}
                    </Badge>
                  )}
                </div>
                {currentProfile.bio && <p className="text-white/90 text-sm mt-3 line-clamp-2">{currentProfile.bio}</p>}
                {currentProfile.interests && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {currentProfile.interests.split(',').map((interest) => (
                      <Badge key={interest.trim()} variant="secondary" className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">{interest.trim()}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center gap-5 mt-6 z-10">
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => handleDislike(currentProfile)} size="lg" aria-label={t('browse.dislike')} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border-2 border-gray-200 dark:border-rose-800 hover:border-red-300 hover:bg-red-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-red-500 shadow-lg transition-all">
              <X className="w-7 h-7 md:w-8 md:h-8" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => handleLike(currentProfile)} size="lg" aria-label={t('browse.like')} className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-xl shadow-rose-200 dark:shadow-rose-900/30 transition-all">
              <Heart className="w-8 h-8 md:w-10 md:h-10 fill-white" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={() => handleSuperLike(currentProfile)}
              size="lg"
              disabled={superLikeRemaining <= 0}
              aria-label={t('browse.superLike')}
              className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 hover:text-blue-600 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Star className="w-7 h-7 md:w-8 md:h-8" />
              {superLikeRemaining < SUPER_LIKE_DAILY_LIMIT && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {superLikeRemaining}
                </span>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {detailProfile && (
          <ProfileDetailModal
            t={t}
            profile={detailProfile}
            onClose={() => setDetailProfile(null)}
            onLike={() => handleLike(detailProfile)}
            onDislike={() => handleDislike(detailProfile)}
            onSuperLike={() => handleSuperLike(detailProfile)}
            onBlock={async () => {
              try {
                await fetchWithCSRF('/api/block', {
                  blockedId: detailProfile.id,
                  reason: BLOCK_REASON,
                });
                // Only update UI after API succeeds
                useAppStore.getState().blockUser(detailProfile.id);
                toast.success(t('browse.blockedUser', { name: detailProfile.name }), { description: t('browse.blockedDescription') });
              } catch (error) {
                logger.error('browse-view.block', 'Failed to block user via API', error);
                toast.error(t('browse.blockError'), { description: t('common.retry') });
              }
            }}
            onReport={async () => {
              try {
                await fetchWithCSRF('/api/report', {
                  reportedId: detailProfile.id,
                  reason: REPORT_REASON,
                });
                // Only show success after API succeeds
                toast.info(t('browse.reportSent', { name: detailProfile.name }), { description: t('browse.reportSentDesc') });
              } catch (error) {
                logger.error('browse-view.report', 'Failed to submit report via API', error);
                toast.error(t('browse.reportError'), { description: t('common.retry') });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
