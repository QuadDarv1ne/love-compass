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
import { useAppStore } from '@/lib/store';

// ─── Achievement definitions ─────────────────────────────────────────────────

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  threshold: number;
  /** Returns the current progress value for this achievement */
  getValue: () => number;
  category: 'dating' | 'communication' | 'explorer' | 'special';
}

const ACHIEVEMENTS: AchievementDef[] = [
  // ── Знакомства (Dating) ──
  {
    id: 'first_like',
    name: 'Первый лайк',
    description: 'Отправьте первый лайк',
    icon: Heart,
    threshold: 1,
    getValue: () => useAppStore.getState().likedUserIds.length,
    category: 'dating',
  },
  {
    id: 'heart_hunter',
    name: 'Сердцеед',
    description: 'Лайкните 10 анкет',
    icon: Heart,
    threshold: 10,
    getValue: () => useAppStore.getState().likedUserIds.length,
    category: 'dating',
  },
  {
    id: 'super_star',
    name: 'Суперзвезда',
    description: 'Используйте 5 суперлайков',
    icon: Star,
    threshold: 5,
    getValue: () => useAppStore.getState().superLikedUserIds.length,
    category: 'dating',
  },

  // ── Общение (Communication) ──
  {
    id: 'first_match',
    name: 'Первый мэтч',
    description: 'Получите первый мэтч',
    icon: MessageCircle,
    threshold: 1,
    getValue: () => useAppStore.getState().matches.length,
    category: 'communication',
  },
  {
    id: 'popular',
    name: 'Популярный',
    description: 'Получите 5 мэтчей',
    icon: Users,
    threshold: 5,
    getValue: () => useAppStore.getState().matches.length,
    category: 'communication',
  },
  {
    id: 'beloved',
    name: 'Любимец',
    description: 'Получите 10 мэтчей',
    icon: Crown,
    threshold: 10,
    getValue: () => useAppStore.getState().matches.length,
    category: 'communication',
  },

  // ── Исследователь (Explorer) ──
  {
    id: 'started',
    name: 'Начало пути',
    description: 'Войдите в приложение',
    icon: Compass,
    threshold: 1,
    getValue: () => (useAppStore.getState().currentUser ? 1 : 0),
    category: 'explorer',
  },
  {
    id: 'pro',
    name: 'Профессионал',
    description: 'Просмотрите 50 анкет',
    icon: Award,
    threshold: 50,
    getValue: () => {
      const s = useAppStore.getState();
      return s.likedUserIds.length + s.dislikedUserIds.length;
    },
    category: 'explorer',
  },

  // ── Особенные (Special) ──
  {
    id: 'super_master',
    name: 'Суперлайк мастер',
    description: '3 суперлайка за сессию',
    icon: Zap,
    threshold: 3,
    getValue: () => useAppStore.getState().superLikedUserIds.length,
    category: 'special',
  },
  {
    id: 'collector',
    name: 'Коллекционер',
    description: 'Лайкните 25 анкет',
    icon: Gift,
    threshold: 25,
    getValue: () => useAppStore.getState().likedUserIds.length,
    category: 'special',
  },
];

// ─── Category metadata ───────────────────────────────────────────────────────

const CATEGORIES: { key: AchievementDef['category']; title: string; icon: React.ElementType }[] = [
  { key: 'dating', title: 'Знакомства', icon: Heart },
  { key: 'communication', title: 'Общение', icon: MessageCircle },
  { key: 'explorer', title: 'Исследователь', icon: Compass },
  { key: 'special', title: 'Особенные', icon: Zap },
];

// ─── Animation variants ──────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementsView() {
  const {
    likedUserIds,
    matches,
    superLikedUserIds,
    dislikedUserIds,
    unlockedAchievements,
    unlockAchievement,
  } = useAppStore();

  // Track which achievements were already unlocked when we first mounted,
  // so we only toast about *newly* unlocked ones.
  const initialUnlockedRef = useRef<Set<string>>(new Set(unlockedAchievements));

  // ── Compute current progress values for every achievement ──
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of ACHIEVEMENTS) {
      map.set(a.id, a.getValue());
    }
    return map;
  }, [likedUserIds, matches, superLikedUserIds, dislikedUserIds]);

  // ── Auto-unlock on mount and on state changes ──
  const checkAndUnlock = useCallback(() => {
    for (const a of ACHIEVEMENTS) {
      const val = a.getValue();
      if (val >= a.threshold && !unlockedAchievements.includes(a.id)) {
        unlockAchievement(a.id);
        // Only show toast for achievements that were NOT already unlocked at mount time
        if (!initialUnlockedRef.current.has(a.id)) {
          toast.success(`Новое достижение: ${a.name}!`, {
            description: a.description,
            icon: <Trophy className="w-5 h-5 text-rose-500" />,
          });
        }
      }
    }
  }, [unlockedAchievements, unlockAchievement]);

  useEffect(() => {
    checkAndUnlock();
  }, [checkAndUnlock]);

  // ── Derived stats ──
  const totalAchievements = ACHIEVEMENTS.length;
  const unlockedCount = unlockedAchievements.length;
  const completionPercent = Math.round((unlockedCount / totalAchievements) * 100);

  const totalLiked = likedUserIds.length;
  const totalMatches = matches.length;
  const totalSuperLikes = superLikedUserIds.length;
  const totalViewed = likedUserIds.length + dislikedUserIds.length;

  // ── Stats summary data ──
  const stats = [
    { icon: Heart, value: totalLiked, label: 'Лайков', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { icon: MessageCircle, value: totalMatches, label: 'Мэтчей', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
    { icon: Star, value: totalSuperLikes, label: 'Суперлайков', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { icon: Eye, value: totalViewed, label: 'Просмотрено', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  ];

  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-lg mx-auto space-y-6">
        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300">
              Достижения
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} из {totalAchievements} получено
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
                    Ваша статистика
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
                        {cat.title}
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
                                      : 'bg-gray-200 dark:bg-gray-800'
                                  }
                                `}
                              >
                                <Icon
                                  className={`w-6 h-6 ${
                                    isUnlocked
                                      ? 'text-white'
                                      : 'text-gray-400 dark:text-gray-500'
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
                                      : 'text-gray-600 dark:text-gray-400'
                                  }
                                `}
                              >
                                {ach.name}
                              </h4>

                              {/* Description */}
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {ach.description}
                              </p>

                              {/* Unlocked badge or progress */}
                              {isUnlocked ? (
                                <Badge
                                  className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] px-2 py-0"
                                >
                                  Получено!
                                </Badge>
                              ) : (
                                <div className="w-full space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                      Прогресс
                                    </span>
                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                                      {currentVal}/{ach.threshold}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
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
                <CardContent className="bg-white dark:bg-gray-950 rounded-xl p-5 flex flex-col items-center text-center gap-2">
                  <Trophy className="w-10 h-10 text-amber-500" />
                  <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">
                    Все достижения получены!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Вы настоящий мастер знакомств. Продолжайте в том же духе!
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
