'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, X, Star, MapPin, SlidersHorizontal, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore, type User } from '@/lib/store';
import { FilterPanel } from './shared';

// ─── Profile Detail Modal ────────────────────────────────────────────────────
function ProfileDetailModal({
  profile,
  onClose,
  onLike,
  onDislike,
  onSuperLike,
}: {
  profile: User;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop" />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg mx-auto bg-card rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Photo */}
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-3xl md:rounded-t-3xl">
          <Image src={profile.avatar || '/avatar-woman1.jpg'} alt={profile.name} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{profile.name}, {profile.age}</h2>
            {profile.city && (
              <div className="flex items-center gap-1 text-white/80 mt-1">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{profile.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Looking for */}
          {profile.lookingFor && (
            <Badge variant="secondary" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
              Ищу: {profile.lookingFor === 'all' ? 'Всех' : profile.lookingFor === 'male' ? 'Мужчин' : 'Женщин'}
            </Badge>
          )}

          {/* Bio */}
          {profile.bio && (
            <div>
              <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">О себе</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {profile.interests && (
            <div>
              <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">Интересы</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.split(',').map((interest) => (
                  <Badge key={interest.trim()} variant="secondary" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                    {interest.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-rose-100 dark:border-rose-900/50 flex items-center justify-center gap-5">
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => { onDislike(); onClose(); }} size="lg" className="w-14 h-14 rounded-full bg-card border-2 border-gray-200 dark:border-rose-800 hover:border-red-300 hover:bg-red-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-red-500 shadow-lg transition-all">
              <X className="w-7 h-7" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => { onSuperLike(); onClose(); }} size="lg" className="w-14 h-14 rounded-full bg-card border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 hover:text-blue-600 shadow-lg transition-all">
              <Star className="w-7 h-7" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => { onLike(); onClose(); }} size="lg" className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-xl shadow-rose-200 dark:shadow-rose-900/30 transition-all">
              <Heart className="w-8 h-8 fill-white" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Browse View ────────────────────────────────────────────────────────────
export function BrowseView() {
  const {
    profiles, currentUser, likedUserIds, dislikedUserIds, superLikedUserIds,
    removeProfile, addLikedUserId, addDislikedUserId, addSuperLikedUserId,
    setShowMatchAnimation, setMatchAnimationPartner, showFilters, setShowFilters,
    filterGender, filterAgeMin, filterAgeMax, filterCity, setProfiles,
  } = useAppStore();
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showX, setShowX] = useState(false);
  const [showSuperLike, setShowSuperLike] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [detailProfile, setDetailProfile] = useState<User | null>(null);
  const [lastSwipedProfile, setLastSwipedProfile] = useState<User | null>(null);
  const [lastSwipeAction, setLastSwipeAction] = useState<'like' | 'dislike' | 'superLike' | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (filterGender !== 'all' && p.gender !== filterGender) return false;
      if (filterAgeMin > 0 && p.age < filterAgeMin) return false;
      if (filterAgeMax < 99 && p.age > filterAgeMax) return false;
      if (filterCity && !p.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
      return true;
    });
  }, [profiles, filterGender, filterAgeMin, filterAgeMax, filterCity]);

  const currentProfile = filteredProfiles.length > 0 ? filteredProfiles[0] : null;

  const activeFilterCount = (filterGender !== 'all' ? 1 : 0) + (filterAgeMin > 0 ? 1 : 0) + (filterAgeMax < 99 ? 1 : 0) + (filterCity ? 1 : 0);

  const canUndo = (lastSwipedProfile !== null && lastSwipeAction !== null);

  const handleLike = useCallback(async (profile: User) => {
    if (!currentUser) return;
    setSwipeDir('right');
    setShowHeartBurst(true);
    addLikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('like');

    setTimeout(() => { setSwipeDir(null); setShowHeartBurst(false); }, 500);

    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUser.id, toUserId: profile.id }),
      });
      const data = await res.json();
      if (data.isMutual) {
        toast.success(`Новый мэтч с ${profile.name}!`, {
          description: 'Вы понравились друг другу',
          className: 'toast-match',
        });
        setMatchAnimationPartner(profile);
        setTimeout(() => { setShowMatchAnimation(true); }, 600);
      }
    } catch { console.error('Like failed'); }
    setTimeout(() => removeProfile(profile.id), 400);
  }, [currentUser, addLikedUserId, setMatchAnimationPartner, setShowMatchAnimation, removeProfile]);

  const handleDislike = useCallback((profile: User) => {
    setSwipeDir('left');
    setShowX(true);
    addDislikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('dislike');
    setTimeout(() => { setSwipeDir(null); setShowX(false); }, 500);
    setTimeout(() => removeProfile(profile.id), 400);
  }, [addDislikedUserId, removeProfile]);

  const handleSuperLike = useCallback(async (profile: User) => {
    if (!currentUser) return;
    setShowSuperLike(true);
    addSuperLikedUserId(profile.id);
    addLikedUserId(profile.id);
    setLastSwipedProfile(profile);
    setLastSwipeAction('superLike');
    setTimeout(() => { setShowSuperLike(false); }, 800);
    try {
      const res = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: currentUser.id, toUserId: profile.id }),
      });
      const data = await res.json();
      if (data.isMutual) {
        toast.success(`Новый мэтч с ${profile.name}!`, {
          description: 'Вы понравились друг другу',
          className: 'toast-match',
        });
        setMatchAnimationPartner(profile);
        setTimeout(() => { setShowMatchAnimation(true); }, 600);
      }
    } catch { console.error('Super Like failed'); }
    setTimeout(() => removeProfile(profile.id), 400);
  }, [currentUser, addSuperLikedUserId, addLikedUserId, setMatchAnimationPartner, setShowMatchAnimation, removeProfile]);

  const handleUndo = useCallback(() => {
    if (!lastSwipedProfile || !lastSwipeAction) return;
    // Add profile back to front of profiles array
    setProfiles([lastSwipedProfile, ...profiles]);
    // Remove from the appropriate list
    if (lastSwipeAction === 'dislike') {
      const newIds = dislikedUserIds.filter(id => id !== lastSwipedProfile.id);
      useAppStore.setState({ dislikedUserIds: newIds });
    } else if (lastSwipeAction === 'like') {
      const newIds = likedUserIds.filter(id => id !== lastSwipedProfile.id);
      useAppStore.setState({ likedUserIds: newIds });
    } else if (lastSwipeAction === 'superLike') {
      const newLikeIds = likedUserIds.filter(id => id !== lastSwipedProfile.id);
      const newSuperIds = superLikedUserIds.filter(id => id !== lastSwipedProfile.id);
      useAppStore.setState({ likedUserIds: newLikeIds, superLikedUserIds: newSuperIds });
    }
    setLastSwipedProfile(null);
    setLastSwipeAction(null);
  }, [lastSwipedProfile, lastSwipeAction, profiles, setProfiles, dislikedUserIds, likedUserIds, superLikedUserIds]);

  // Drag handlers for touch swipe
  const handleDragStart = () => {
    dragStartPos.current = { x: 0, y: 0 };
  };

  const handleDrag = (_: any, info: any) => {
    setDragX(info.offset.x);
    if (!dragStartPos.current) {
      dragStartPos.current = { x: info.point.x, y: info.point.y };
    }
  };

  const handleDragEnd = (profile: User, _: any, info: any) => {
    const dragDistance = Math.abs(info.offset.x);
    const threshold = 120;

    // If drag distance is very small, treat as tap → open detail modal
    if (dragDistance < 10) {
      setDragX(0);
      dragStartPos.current = null;
      setDetailProfile(profile);
      return;
    }

    if (info.offset.x > threshold) {
      handleLike(profile);
    } else if (info.offset.x < -threshold) {
      handleDislike(profile);
    }
    setDragX(0);
    dragStartPos.current = null;
  };

  if (!currentProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Heart className="w-20 h-20 text-rose-200 dark:text-rose-800 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-rose-400 mb-2">Анкеты закончились</h2>
          <p className="text-muted-foreground">Заходите позже — появляются новые люди!</p>
          {canUndo && (
            <Button
              onClick={handleUndo}
              className="mt-4 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800"
            >
              <Undo2 className="w-4 h-4 mr-2" />Вернуть последнюю анкету
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-4 md:py-8 relative overflow-y-auto">
      {/* Filter toggle + title + Undo */}
      <div className="flex items-center justify-between w-full max-w-md mb-4">
        <h2 className="text-lg font-bold text-rose-700 dark:text-rose-300">Анкеты</h2>
        <div className="flex items-center gap-2">
          {canUndo && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                title="Вернуть"
              >
                <Undo2 className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="relative text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30">
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

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* Heart Burst */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* X burst */}
        <AnimatePresence>
          {showX && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <X className="w-24 h-24 text-gray-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Super Like burst */}
        <AnimatePresence>
          {showSuperLike && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
              <div className="bg-blue-500 rounded-full p-4">
                <Star className="w-16 h-16 text-white fill-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Card with drag */}
        <motion.div
          ref={cardRef}
          key={currentProfile.id}
          initial={{ opacity: 0, x: 100, rotate: 5 }}
          animate={{
            opacity: 1,
            x: swipeDir === 'right' ? 300 : swipeDir === 'left' ? -300 : dragX,
            rotate: swipeDir === 'right' ? 20 : swipeDir === 'left' ? -20 : dragX * 0.05,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          drag={swipeDir === null ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={(_, info) => handleDragEnd(currentProfile, _, info)}
          whileDrag={{ cursor: 'grabbing' }}
          className="w-full max-w-sm md:max-w-md relative touch-none"
        >
          <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl bg-card">
            <div className="relative aspect-[3/4]">
              <Image src={currentProfile.avatar || '/avatar-woman1.jpg'} alt={currentProfile.name} fill className="object-cover" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Swipe labels during drag */}
              {dragX > 60 && (
                <div className="absolute top-8 left-6 bg-green-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform -rotate-12 border-3 border-green-400 shadow-lg" style={{ opacity: Math.min(dragX / 120, 1) }}>НРАВИТСЯ</div>
              )}
              {dragX < -60 && (
                <div className="absolute top-8 right-6 bg-red-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform rotate-12 border-3 border-red-400 shadow-lg" style={{ opacity: Math.min(Math.abs(dragX) / 120, 1) }}>НЕТ</div>
              )}
              {swipeDir === 'right' && (
                <div className="absolute top-8 left-6 bg-green-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform -rotate-12 border-3 border-green-400 shadow-lg">НРАВИТСЯ</div>
              )}
              {swipeDir === 'left' && (
                <div className="absolute top-8 right-6 bg-red-500 text-white px-4 py-2 rounded-lg text-xl font-bold transform rotate-12 border-3 border-red-400 shadow-lg">НЕТ</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-bold text-white drop-shadow-lg">{currentProfile.name}, {currentProfile.age}</h2>
                    {currentProfile.city && (
                      <div className="flex items-center gap-1 mt-1 text-white/80">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{currentProfile.city}</span>
                      </div>
                    )}
                  </div>
                  {currentProfile.lookingFor && (
                    <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm flex-shrink-0 ml-2">
                      {currentProfile.lookingFor === 'all' ? 'Всех' : currentProfile.lookingFor === 'male' ? 'Мужчин' : 'Женщин'}
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
        <div className="flex items-center gap-5 mt-6">
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => handleDislike(currentProfile)} size="lg" className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border-2 border-gray-200 dark:border-rose-800 hover:border-red-300 hover:bg-red-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-red-500 shadow-lg transition-all">
              <X className="w-7 h-7 md:w-8 md:h-8" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => handleLike(currentProfile)} size="lg" className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-xl shadow-rose-200 dark:shadow-rose-900/30 transition-all">
              <Heart className="w-8 h-8 md:w-10 md:h-10 fill-white" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button onClick={() => handleSuperLike(currentProfile)} size="lg" className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 hover:text-blue-600 shadow-lg transition-all">
              <Star className="w-7 h-7 md:w-8 md:h-8" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Profile Detail Modal */}
      <AnimatePresence>
        {detailProfile && (
          <ProfileDetailModal
            profile={detailProfile}
            onClose={() => setDetailProfile(null)}
            onLike={() => handleLike(detailProfile)}
            onDislike={() => handleDislike(detailProfile)}
            onSuperLike={() => handleSuperLike(detailProfile)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
