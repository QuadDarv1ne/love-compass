'use client';

import React from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/store';
import { appLogger } from '@/lib/logger';
import { AVATAR_BASE_URL } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

export function MatchAnimationOverlay() {
  const { t } = useTranslation();
  const { showMatchAnimation, matchAnimationPartner, setShowMatchAnimation, navigateTo, setSelectedMatch, currentUser } = useAppStore(useShallow((s) => ({
    showMatchAnimation: s.showMatchAnimation, matchAnimationPartner: s.matchAnimationPartner,
    setShowMatchAnimation: s.setShowMatchAnimation, navigateTo: s.navigateTo,
    setSelectedMatch: s.setSelectedMatch, currentUser: s.currentUser,
  })));

  if (!showMatchAnimation || !matchAnimationPartner || !currentUser) return null;

  const refreshMatches = async () => {
    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('Failed to fetch matches');
    const { data } = await res.json();
    useAppStore.getState().setMatches(data);
    return data;
  };

  const handleContinue = async () => {
    setShowMatchAnimation(false);
    if (currentUser) {
      try {
        await refreshMatches();
      } catch (error) {
        appLogger.error('match-animation.refresh', 'Failed to refresh matches', error);
      }
    }
    navigateTo('matches');
  };

  const handleSendMessage = async () => {
    setShowMatchAnimation(false);
    if (currentUser) {
      try {
        const matches = await refreshMatches();
        const latestMatch = matches[0];
        if (latestMatch) {
          setSelectedMatch(latestMatch);
          navigateTo('chat');
        }
      } catch (error) {
        appLogger.error('match-animation.refresh', 'Failed to refresh matches', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 rounded-3xl p-8 md:p-12 text-center text-white max-w-md mx-4 shadow-2xl overflow-hidden"
      >
        <div className="absolute top-4 left-4 heart-burst">
          <Heart className="w-6 h-6 fill-white/50" />
        </div>
        <div className="absolute top-8 right-8 heart-burst" style={{ animationDelay: '0.2s' }}>
          <Heart className="w-4 h-4 fill-white/40" />
        </div>
        <div className="absolute bottom-8 left-8 heart-burst" style={{ animationDelay: '0.4s' }}>
          <Heart className="w-5 h-5 fill-white/50" />
        </div>
        <div className="absolute bottom-4 right-4 heart-burst" style={{ animationDelay: '0.3s' }}>
          <Heart className="w-3 h-3 fill-white/30" />
        </div>

        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-yellow-200" />
          <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('matchAnimation.title')}</h2>
          <p className="text-white/90 mb-8 text-lg">{t('matchAnimation.subtitle')}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex justify-center items-center gap-4 mb-8"
        >
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <SafeImage src={currentUser.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={currentUser.name} fill className="object-cover" />
          </div>
          <div className="match-pulse">
            <Heart className="w-10 h-10 fill-white text-white" />
          </div>
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <SafeImage src={matchAnimationPartner.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={matchAnimationPartner.name} fill className="object-cover" />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-3"
        >
          <Button onClick={handleSendMessage} className="w-full bg-white text-rose-600 hover:bg-white/90 font-semibold text-lg py-6 rounded-xl">
            <MessageCircle className="w-5 h-5 mr-2" />
            {t('matchAnimation.sendMessage')}
          </Button>
          <Button onClick={handleContinue} variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 py-5 rounded-xl">
            {t('matchAnimation.continue')}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
