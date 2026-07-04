'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, BadgeCheck, Heart, Star, ShieldAlert, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/ui/safe-image';
import { SPRING, AVATAR_BASE_URL } from '@/lib/constants';
import type { User } from '@/lib/store';

export function ProfileDetailModal({
  profile,
  onClose,
  onLike,
  onDislike,
  onSuperLike,
  onBlock,
  onReport,
  t,
}: {
  profile: User;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSuperLike: () => void;
  onBlock: () => void;
  onReport: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <AnimatePresence>
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
          transition={{ type: 'spring', stiffness: SPRING.DETAIL_MODAL_STIFFNESS, damping: SPRING.DETAIL_MODAL_DAMPING }}
          className="relative w-full max-w-lg mx-auto bg-card rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-3xl md:rounded-t-3xl">
            <SafeImage src={profile.avatar || `${AVATAR_BASE_URL}?seed=Default`} alt={profile.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                {profile.name}, {profile.age}
                {profile.emailVerified && (
                  <BadgeCheck className="w-5 h-5 text-blue-400 drop-shadow" />
                )}
              </h2>
              {profile.city && (
                <div className="flex items-center gap-1 text-white/80 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{profile.city}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {profile.lookingFor && (
              <Badge variant="secondary" className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                {t('browse.lookingFor')} {profile.lookingFor === 'all' ? t('browse.lookingForAll') : profile.lookingFor === 'male' ? t('browse.lookingForMale') : t('browse.lookingForFemale')}
              </Badge>
            )}

            {profile.bio && (
              <div>
                <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">{t('browse.detailBio')}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {profile.interests && (
              <div>
                <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-2">{t('browse.detailInterests')}</h3>
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

          <div className="p-4 border-t border-rose-100 dark:border-rose-900/50 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => { onBlock(); onClose(); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {t('browse.block')}
            </button>
            <button
              type="button"
              onClick={() => { onReport(); onClose(); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              {t('browse.report')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
