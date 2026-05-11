'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, Eye, MapPin,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore, type User } from '@/lib/store';
import { OnlineIndicator } from './shared';

export function LikedYouView() {
  const { currentUser, likedYouProfiles, setLikedYouProfiles, onlineUserIds, setShowMatchAnimation, setMatchAnimationPartner, navigateTo } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLikedYou = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch(`/api/likes/received?userId=${currentUser.id}`);
        const data = await res.json();
        setLikedYouProfiles(data);
        useAppStore.getState().setLikedYouCount(data.length);
      } catch { console.error('Failed to load liked you'); }
      setLoading(false);
    };
    loadLikedYou();
  }, [currentUser, setLikedYouProfiles]);

  const handleLikeBack = async (profile: User) => {
    if (!currentUser) return;
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
        setTimeout(() => { setShowMatchAnimation(true); }, 300);
      } else {
        toast.info(`${profile.name} оценил(а) вашу анкету!`, {
          description: 'Вы лайкнули в ответ',
        });
      }
      // Remove from liked you list
      setLikedYouProfiles(likedYouProfiles.filter(p => p.id !== profile.id));
    } catch { console.error('Like back failed'); }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Heart className="w-10 h-10 text-rose-400" />
        </motion.div>
      </div>
    );
  }

  if (likedYouProfiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Eye className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">Пока никто не лайкнул</h2>
          <p className="text-muted-foreground text-sm">Добавьте фото и заполните профиль!</p>
          <Button onClick={() => navigateTo('browse')} variant="outline" className="mt-4 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20">
            К анкетам
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 mb-4 md:mb-6">Кто вас лайкнул</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <AnimatePresence>
          {likedYouProfiles.map((profile, idx) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="overflow-hidden border-rose-100 dark:border-rose-900/50 shadow-md hover:shadow-xl transition-shadow rounded-2xl bg-card">
                <div className="relative aspect-square">
                  <Image src={profile.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={profile.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <OnlineIndicator userId={profile.id} size="md" />
                  {/* Heart icon */}
                  <div className="absolute top-2 right-2">
                    <div className="bg-rose-500 rounded-full p-1.5 shadow-lg">
                      <Heart className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-semibold text-sm truncate">{profile.name}, {profile.age}</h3>
                    {profile.city && (
                      <p className="text-white/70 text-xs truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{profile.city}
                      </p>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <Button
                    onClick={() => handleLikeBack(profile)}
                    size="sm"
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs py-2 rounded-lg"
                  >
                    <Heart className="w-3 h-3 mr-1 fill-white" />Лайкнуть в ответ
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
