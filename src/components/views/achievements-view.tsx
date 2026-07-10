'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, Star, MessageCircle, Users, Crown, Compass,
  Award, Zap, Gift, Lock, CheckCircle, Trophy, TrendingUp,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';
import { useTranslation } from '@/hooks/useTranslation';


interface AchievementState {
  likedUserIds: string[];
  matches: MatchWithUsers[];
  superLikedUserIds: string[];
  dislikedUserIds: string[];
  currentUser: User | null;
}

interface AchievementDef {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ElementType;
  threshold: number;
  getValue: (state: AchievementState) => number;
  category: 'dating' | 'communication' | 'explorer' | 'special';
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_like',
    nameKey: 'achievements.firstLike',
    descKey: 'achievements.firstLikeDesc',
    icon: Heart,
    threshold: 1,
    getValue: (s) => s.likedUserIds.length,
    category: 'dating',
  },
  {
    id: 'heart_hunter',
    nameKey: 'achievements.heartHunter',
    descKey: 'achievements.heartHunterDesc',
    icon: Heart,
    threshold: 10,
    getValue: (s) => s.likedUserIds.length,
    category: 'dating',
  },
  {
    id: 'super_star',
    nameKey: 'achievements.superStar',
    descKey: 'achievements.superStarDesc',
    icon: Star,
    threshold: 5,
    getValue: (s) => s.superLikedUserIds.length,
    category: 'dating',
  },

  {
    id: 'first_match',
    nameKey: 'achievements.firstMatch',
    descKey: 'achievements.firstMatchDesc',
    icon: MessageCircle,
    threshold: 1,
    getValue: (s) => s.matches.length,
    category: 'communication',
  },
  {
    id: 'popular',
    nameKey: 'achievements.popular',
    descKey: 'achievements.popularDesc',
    icon: Users,
    threshold: 5,
    getValue: (s) => s.matches.length,
    category: 'communication',
  },
  {
    id: 'beloved',
    nameKey: 'achievements.beloved',
    descKey: 'achievements.belovedDesc',
    icon: Crown,
    threshold: 10,
    getValue: (s) => s.matches.length,
    category: 'communication',
  },

  {
    id: 'started',
    nameKey: 'achievements.started',
    descKey: 'achievements.startedDesc',
    icon: Compass,
    threshold: 1,
    getValue: (s) => (s.currentUser ? 1 : 0),
    category: 'explorer',
  },
  {
    id: 'pro',
    nameKey: 'achievements.pro',
    descKey: 'achievements.proDesc',
    icon: Award,
    threshold: 50,
    getValue: (s) => s.likedUserIds.length + s.dislikedUserIds.length,
    category: 'explorer',
  },

  {
    id: 'super_master',
    nameKey: 'achievements.superMaster',
    descKey: 'achievements.superMasterDesc',
    icon: Zap,
    threshold: 3,
    getValue: (s) => s.superLikedUserIds.length,
    category: 'special',
  },
  {
    id: 'collector',
    nameKey: 'achievements.collector',
    descKey: 'achievements.collectorDesc',
    icon: Gift,
    threshold: 25,
    getValue: (s) => s.likedUserIds.length,
    category: 'special',
  },
];


const CATEGORIES: { key: AchievementDef['category']; titleKey: string; icon: React.ElementType }[] = [
  { key: 'dating', titleKey: 'achievements.catDating', icon: Heart },
  { key: 'communication', titleKey: 'achievements.catCommunication', icon: MessageCircle },
  { key: 'explorer', titleKey: 'achievements.catExplorer', icon: Compass },
  { key: 'special', titleKey: 'achievements.catSpecial', icon: Zap },
];


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 },
  },
} as const;


export function AchievementsView() {
  const {
    currentUser,
    likedUserIds,
    matches,
    superLikedUserIds,
    dislikedUserIds,
    unlockedAchievements,
    unlockAchievement,
  } = useAppStore(useShallow((s) => ({
    currentUser: s.currentUser, likedUserIds: s.likedUserIds,
    matches: s.matches, superLikedUserIds: s.superLikedUserIds,
    dislikedUserIds: s.dislikedUserIds, unlockedAchievements: s.unlockedAchievements,
    unlockAchievement: s.unlockAchievement,
  })));
  const { t } = useTranslation();

  // Track which achievements were already unlocked when we first mounted,
  // so we only toast about *newly* unlocked ones.
  const initialUnlockedRef = useRef<Set<string>>(new Set(unlockedAchievements));

  const progressMap = useMemo(() => {
    const state: AchievementState = { likedUserIds, matches, superLikedUserIds, dislikedUserIds, currentUser };
    const map = new Map<string, number>();
    for (const a of ACHIEVEMENTS) {
      map.set(a.id, a.getValue(state));
    }
    return map;
  }, [likedUserIds, matches, superLikedUserIds, dislikedUserIds, currentUser]);

  const checkAndUnlock = useCallback(() => {
    const state: AchievementState = { likedUserIds, matches, superLikedUserIds, dislikedUserIds, currentUser };
    for (const a of ACHIEVEMENTS) {
      const val = a.getValue(state);
      if (val >= a.threshold && !unlockedAchievements.includes(a.id)) {
        unlockAchievement(a.id);
        // Only show toast for achievements that were NOT already unlocked at mount time
        if (!initialUnlockedRef.current.has(a.id)) {
          toast.success(t('achievements.newAchievement', { name: t(a.nameKey) }), {
            description: t(a.descKey),
            icon: <Trophy className="w-5 h-5 text-rose-500" />,
          });
        }
      }
    }
  }, [likedUserIds, matches, superLikedUserIds, dislikedUserIds, currentUser, unlockedAchievements, unlockAchievement, t]);

  useEffect(() => {
    checkAndUnlock();
  }, [checkAndUnlock]);

  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;
  const completionPercent = Math.round((unlockedCount / totalAchievements) * 100);

  const totalLiked = likedUserIds.length;
  const totalMatches = matches.length;
  const totalSuperLikes = superLikedUserIds.length;
  const totalViewed = likedUserIds.length + dislikedUserIds.length;

  const stats = [
    { icon: Heart, value: totalLiked, label: t('achievements.likes'), color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { icon: MessageCircle, value: totalMatches, label: t('achievements.matchCount'), color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { icon: Star, value: totalSuperLikes, label: t('achievements.superLikes'), color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: Eye, value: totalViewed, label: t('achievements.viewed'), color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-lg mx-auto space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300">
              {t('achievements.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('achievements.countOf', { unlocked: unlockedCount, total: totalAchievements })}
          </p>
          <div className="flex items-center gap-3 max-w-xs mx-auto">
            <Progress
              value={completionPercent}
              className="h-2.5 flex-1 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-rose-500 [&>[data-slot=progress-indicator]]:to-pink-500"
            />
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums w-10 text-right">
              {completionPercent}%
            </span>
          </div>
        </div>

        {/* ── Stats Summary Card ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-rose-100 dark:border-rose-900/50 shadow-lg rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-fuchsia-950/40 p-1">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                    {t('achievements.yourStats')}
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className={`${s.bg} rounded-xl p-3 text-center flex flex-col items-center`}
                    >
                      <s.icon className={`w-5 h-5 ${s.color} mb-1`} />
                      <span className={`text-lg font-bold ${s.color} tabular-nums`}>
                        {s.value}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        </motion.div>

        {/* ── Achievement Categories ──────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key="achievements-list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {CATEGORIES.map((cat) => {
              const catAchievements = ACHIEVEMENTS.filter((a) => a.category === cat.key);
              const catUnlocked = catAchievements.filter((a) =>
                unlockedAchievements.includes(a.id)
              ).length;
              const CatIcon = cat.icon;

              return (
                <section key={cat.key} className="space-y-3">
                  {/* Category header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CatIcon className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-0">
                        {t(cat.titleKey)}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {catUnlocked}/{catAchievements.length}
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {catAchievements.map((ach, idx) => {
                      const isUnlocked = unlockedAchievements.includes(ach.id);
                      const currentVal = progressMap.get(ach.id) ?? 0;
                      const progressPercent = Math.min(
                        Math.round((currentVal / ach.threshold) * 100),
                        100
                      );
                      const Icon = ach.icon;

                      return (
                        <motion.div
                          key={ach.id}
                          variants={cardVariants}
                          whileHover={{ scale: 1.04 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        >
                          <Card
                            className={`
                              relative overflow-hidden rounded-2xl border transition-all
                              ${
                                isUnlocked
                                  ? 'border-rose-200 dark:border-rose-800/60 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 shadow-md'
                                  : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 opacity-80'
                              }
                            `}
                          >
                            <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                              {/* Lock overlay for locked achievements */}
                              {!isUnlocked && (
                                <div className="absolute top-2 right-2">
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                </div>
                              )}

                              {/* Checkmark for unlocked */}
                              {isUnlocked && (
                                <div className="absolute top-2 right-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </div>
                              )}

                              {/* Icon */}
                              <div
                                className={`
                                  flex items-center justify-center w-12 h-12 rounded-xl
                                  ${
                                    isUnlocked
                                      ? 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/25'
                                      : 'bg-muted'
                                  }
                                `}
                              >
                                <Icon
                                  className={`w-6 h-6 ${
                                    isUnlocked
                                      ? 'text-white'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </div>

                              {/* Name */}
                              <h4
                                className={`
                                  text-sm font-semibold leading-tight
                                  ${
                                    isUnlocked
                                      ? 'text-rose-700 dark:text-rose-300'
                                      : 'text-muted-foreground'
                                  }
                                `}
                              >
                                {t(ach.nameKey)}
                              </h4>

                              {/* Description */}
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {t(ach.descKey)}
                              </p>

                              {/* Unlocked badge or progress */}
                              {isUnlocked ? (
                                <Badge
                                  className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0"
                                >
                                  {t('achievements.earned')}
                                </Badge>
                              ) : (
                                <div className="w-full space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                      {t('achievements.progress')}
                                    </span>
                                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                                      {currentVal}/{ach.threshold}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-rose-400 to-pink-400 dark:from-rose-500 dark:to-pink-500 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progressPercent}%` }}
                                      transition={{
                                        duration: 0.6,
                                        delay: idx * 0.08,
                                        ease: 'easeOut',
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* ── Motivational footer ──────────────────────────────────────── */}
        {unlockedCount === totalAchievements && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          >
            <Card className="border-rose-200 dark:border-rose-800/60 shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-1">
                <CardContent className="bg-card rounded-xl p-5 flex flex-col items-center text-center gap-2">
                  <Trophy className="w-10 h-10 text-amber-500" />
                  <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">
                    {t('achievements.allEarned')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('achievements.allEarnedDesc')}
                  </p>
                </CardContent>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
