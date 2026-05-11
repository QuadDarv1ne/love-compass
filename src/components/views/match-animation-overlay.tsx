'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function MatchAnimationOverlay() {
  const { showMatchAnimation, matchAnimationPartner, setShowMatchAnimation, navigateTo, setSelectedMatch, currentUser } = useAppStore();

  if (!showMatchAnimation || !matchAnimationPartner || !currentUser) return null;

  const handleContinue = async () => {
    setShowMatchAnimation(false);
    if (currentUser) {
      const res = await fetch(`/api/matches?userId=${currentUser.id}`);
      const matches = await res.json();
      useAppStore.getState().setMatches(matches);
    }
    navigateTo('matches');
  };

  const handleSendMessage = async () => {
    setShowMatchAnimation(false);
    if (currentUser) {
      const res = await fetch(`/api/matches?userId=${currentUser.id}`);
      const matches = await res.json();
      useAppStore.getState().setMatches(matches);
      const latestMatch = matches[0];
      if (latestMatch) {
        setSelectedMatch(latestMatch);
        navigateTo('chat');
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
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Это мэтч!</h2>
          <p className="text-white/90 mb-8 text-lg">Вы понравились друг другу</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          className="flex justify-center items-center gap-4 mb-8"
        >
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <Image src={currentUser.avatar || '/avatar-woman1.jpg'} alt={currentUser.name} fill className="object-cover" />
          </div>
          <div className="match-pulse">
            <Heart className="w-10 h-10 fill-white text-white" />
          </div>
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
            <Image src={matchAnimationPartner.avatar || '/avatar-man1.jpg'} alt={matchAnimationPartner.name} fill className="object-cover" />
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
            Написать сообщение
          </Button>
          <Button onClick={handleContinue} variant="outline" className="w-full border-white/50 text-white hover:bg-white/10 py-5 rounded-xl">
            Продолжить
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
