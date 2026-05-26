'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Crown, TrendingUp, UserPlus, MapPin, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useAppStore, type User } from '@/lib/store';
import { OnlineIndicator } from './shared';
import { appLogger } from '@/lib/logger';

interface RankedUser extends User {
  popularityScore: number;
  activityScore: number;
  matchCount: number;
  likesReceived: number;
}

type SortKey = 'popular' | 'active' | 'new';

function sortUsers(ranked: RankedUser[], sortKey: SortKey): RankedUser[] {
  const sorted = [...ranked];
  switch (sortKey) {
    case 'popular':
      sorted.sort((a, b) => b.popularityScore - a.popularityScore);
      break;
    case 'active':
      sorted.sort((a, b) => b.activityScore - a.activityScore);
      break;
    case 'new':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
  return sorted;
}

function getMotivationalText(rank: number, total: number): string {
  if (rank === 1) return '🏆 Вы на вершине! Невероятно!';
  if (rank <= 3) return '🔥 Впечатляющий результат! В тройке лидеров!';
  if (rank <= 10) return '✨ Отличный рейтинг! Так держать!';
  if (rank <= total * 0.25) return '😊 Хороший результат, вы в верхней четверти!';
  if (rank <= total * 0.5) return '💪 Неплохо! Есть куда расти!';
  return '🌱 Продолжайте проявлять активность!';
}

// ─── Podium Card ────────────────────────────────────────────────────────────
function PodiumCard({
  ranked,
  place,
  delay,
}: {
  ranked: RankedUser;
  place: 1 | 2 | 3;
  delay: number;
}) {
  const isCurrent = useAppStore((s) => s.currentUser?.id === ranked.id);

  const medals: Record<1 | 2 | 3, { emoji: string; label: string }> = {
    1: { emoji: '🥇', label: '1 место' },
    2: { emoji: '🥈', label: '2 место' },
    3: { emoji: '🥉', label: '3 место' },
  };

  const gradients = {
    1: 'from-amber-300 via-yellow-200 to-amber-400 dark:from-amber-700 dark:via-yellow-600 dark:to-amber-800',
    2: 'from-slate-300 via-gray-200 to-slate-400 dark:from-slate-600 dark:via-gray-500 dark:to-slate-700',
    3: 'from-orange-300 via-amber-200 to-orange-400 dark:from-orange-700 dark:via-amber-600 dark:to-orange-800',
  };

  const borderColors = {
    1: 'border-amber-300 dark:border-amber-600',
    2: 'border-slate-300 dark:border-slate-500',
    3: 'border-orange-300 dark:border-orange-600',
  };

  const isFirst = place === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={`flex flex-col items-center ${isFirst ? 'md:-mt-4' : 'mt-2'}`}
    >
      <div
        className={`relative bg-gradient-to-b ${gradients[place]} rounded-2xl p-4 ${isFirst ? 'p-6' : 'p-4'} border-2 ${borderColors[place]} shadow-lg w-full ${isFirst ? 'max-w-[180px] md:max-w-[200px]' : 'max-w-[150px] md:max-w-[170px]'} text-center`}
      >
        {/* Medal + Crown for 1st */}
        <div className="flex justify-center mb-2">
          <span className="text-2xl md:text-3xl">{medals[place].emoji}</span>
        </div>
        {isFirst && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + 0.3, type: 'spring' }}
            className="absolute -top-4 left-1/2 -translate-x-1/2"
          >
            <Crown className="w-8 h-8 text-amber-500 drop-shadow-lg" />
          </motion.div>
        )}

        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div className={`relative ${isFirst ? 'w-20 h-20' : 'w-16 h-16'}`}>
            <Avatar className={`${isFirst ? 'w-20 h-20' : 'w-16 h-16'} border-2 border-white dark:border-gray-800 shadow-md`}>
              <AvatarImage src={ranked.avatar} alt={ranked.name} />
              <AvatarFallback className="bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300">
                {ranked.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <OnlineIndicator userId={ranked.id} size="md" />
          </div>
        </div>

        {/* Name & info */}
        <h3
          className={`font-bold text-gray-800 dark:text-gray-100 truncate ${isFirst ? 'text-lg' : 'text-base'}`}
        >
          {ranked.name}
        </h3>
        {ranked.city && (
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate flex items-center justify-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {ranked.city}
          </p>
        )}

        {/* Like count */}
        <div className="flex items-center justify-center gap-1 mt-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {ranked.popularityScore}
          </span>
        </div>

        {/* "Вы" badge */}
        {isCurrent && (
          <Badge className="mt-2 bg-rose-500 text-white text-[10px] px-2 py-0">
            Вы
          </Badge>
        )}
      </div>

      {/* Pedestal */}
      <div
        className={`w-full flex items-center justify-center rounded-b-xl bg-gradient-to-t ${gradients[place]} ${borderColors[place]} border-x-2 border-b-2 ${isFirst ? 'h-8' : 'h-6'}`}
      >
        <span className="text-xs font-bold text-gray-700 dark:text-gray-100">
          {medals[place].label}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Ranked List Row ────────────────────────────────────────────────────────
function RankedListRow({
  ranked,
  rank,
  index,
  scoreLabel,
  scoreValue,
}: {
  ranked: RankedUser;
  rank: number;
  index: number;
  scoreLabel: string;
  scoreValue: number;
}) {
  const currentUserId = useAppStore((s) => s.currentUser?.id);
  const isCurrent = currentUserId === ranked.id;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: 'easeOut' }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isCurrent
          ? 'bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700/50'
          : 'hover:bg-muted/50'
      }`}
    >
      {/* Rank number */}
      <div className="w-8 text-center flex-shrink-0">
        <span
          className={`text-sm font-bold ${
            rank <= 10
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          }`}
        >
          #{rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10 border border-rose-100 dark:border-rose-800">
          <AvatarImage src={ranked.avatar} alt={ranked.name} />
          <AvatarFallback className="bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 text-xs">
            {ranked.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <OnlineIndicator userId={ranked.id} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold truncate">{ranked.name}</span>
          <span className="text-xs text-muted-foreground">{ranked.age}</span>
          {isCurrent && (
            <Badge className="bg-rose-500 text-white text-[10px] px-1.5 py-0 h-4">
              Вы
            </Badge>
          )}
        </div>
        {ranked.city && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {ranked.city}
          </p>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {scoreLabel === 'Лайки' ? (
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
        ) : scoreLabel === 'Активность' ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <UserPlus className="w-3.5 h-3.5 text-blue-400" />
        )}
        <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {scoreValue}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function TopView() {
  const { currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState<SortKey>('popular');
  const [leaderboardData, setLeaderboardData] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard data from API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaderboard?sort=${activeTab}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!cancelled) {
          setLeaderboardData(data ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        appLogger.error('top-view.leaderboard', 'Failed to fetch leaderboard', err);
        if (!cancelled) {
          setLeaderboardData([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const sortedUsers = useMemo(
    () => sortUsers(leaderboardData, activeTab),
    [leaderboardData, activeTab]
  );

  const top3 = sortedUsers.slice(0, 3);
  const rest = sortedUsers.slice(3);

  // Find current user rank
  const currentUserRank = useMemo(() => {
    if (!currentUser) return null;
    const idx = sortedUsers.findIndex((r) => r.id === currentUser.id);
    if (idx === -1) return null;
    return {
      rank: idx + 1,
      total: sortedUsers.length,
      user: sortedUsers[idx],
    };
  }, [sortedUsers, currentUser]);

  const tabConfig: {
    key: SortKey;
    label: string;
    icon: React.ReactNode;
    scoreLabel: string;
    scoreGetter: (r: RankedUser) => number;
  }[] = [
    {
      key: 'popular',
      label: 'Популярные',
      icon: <Heart className="w-4 h-4" />,
      scoreLabel: 'Лайки',
      scoreGetter: (r) => r.popularityScore,
    },
    {
      key: 'active',
      label: 'Активные',
      icon: <TrendingUp className="w-4 h-4" />,
      scoreLabel: 'Активность',
      scoreGetter: (r) => r.activityScore,
    },
    {
      key: 'new',
      label: 'Новые лица',
      icon: <UserPlus className="w-4 h-4" />,
      scoreLabel: 'На платформе',
      scoreGetter: (r) => Math.floor((Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
    },
  ];

  const currentTab = tabConfig.find((t) => t.key === activeTab) ?? tabConfig[0];

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Heart className="w-10 h-10 text-rose-400" />
        </motion.div>
      </div>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (leaderboardData.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Sparkles className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">
            Рейтинг пока пуст
          </h2>
          <p className="text-muted-foreground text-sm">
            Загрузите анкеты, чтобы увидеть лидеров
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 md:pt-6 md:pb-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <Sparkles className="w-6 h-6 md:w-7 md:h-7" />
            Рейтинг
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Самые популярные пользователи
          </p>
        </motion.div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as SortKey)}
          className="w-full"
        >
          <TabsList className="w-full bg-rose-50 dark:bg-rose-900/20 h-10 p-1 rounded-xl">
            <TabsTrigger
              value="popular"
              className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-rose-800/50 data-[state=active]:shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-300 text-xs md:text-sm"
            >
              <Heart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Популярные</span>
              <span className="sm:hidden">Лайки</span>
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-rose-800/50 data-[state=active]:shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-300 text-xs md:text-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Активные</span>
              <span className="sm:hidden">Актив</span>
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="flex-1 gap-1.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-rose-800/50 data-[state=active]:shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-300 text-xs md:text-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Новые лица</span>
              <span className="sm:hidden">Новые</span>
            </TabsTrigger>
          </TabsList>

          {/* Popular tab */}
          <TabsContent value="popular">
            <LeaderboardContent
              top3={top3}
              rest={rest}
              scoreLabel={currentTab.scoreLabel}
              scoreGetter={currentTab.scoreGetter}
            />
          </TabsContent>

          {/* Active tab */}
          <TabsContent value="active">
            <LeaderboardContent
              top3={top3}
              rest={rest}
              scoreLabel={currentTab.scoreLabel}
              scoreGetter={currentTab.scoreGetter}
            />
          </TabsContent>

          {/* New tab */}
          <TabsContent value="new">
            <LeaderboardContent
              top3={top3}
              rest={rest}
              scoreLabel={currentTab.scoreLabel}
              scoreGetter={currentTab.scoreGetter}
            />
          </TabsContent>
        </Tabs>

        {/* Current user rank card — sticky at bottom */}
        {currentUserRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-6"
          >
            <Card className="border-rose-200 dark:border-rose-700/50 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 rounded-2xl shadow-md overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Ваш рейтинг
                  </span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                    #{currentUserRank.rank} из {currentUserRank.total}
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  value={Math.max(
                    2,
                    ((currentUserRank.total - currentUserRank.rank + 1) /
                      currentUserRank.total) *
                      100
                  )}
                  className="h-2.5 mb-2 [&>div]:bg-gradient-to-r [&>div]:from-rose-500 [&>div]:to-pink-500"
                />

                {/* Motivational text */}
                <p className="text-xs text-muted-foreground">
                  {getMotivationalText(
                    currentUserRank.rank,
                    currentUserRank.total
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Spacer for bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}

// ─── Leaderboard Content (shared across tabs) ──────────────────────────────
function LeaderboardContent({
  top3,
  rest,
  scoreLabel,
  scoreGetter,
}: {
  top3: RankedUser[];
  rest: RankedUser[];
  scoreLabel: string;
  scoreGetter: (r: RankedUser) => number;
}) {
  // Ensure we have at least 3 entries in podium (pad with undefined if needed)
  const podiumEntries: (RankedUser | null)[] = [
    top3[0] ?? null,
    top3[1] ?? null,
    top3[2] ?? null,
  ];

  // Podium order: [2nd, 1st, 3rd]
  const podiumOrder: (1 | 2 | 3)[] = [2, 1, 3];

  return (
    <div className="mt-4">
      {/* Top 3 Podium */}
      <AnimatePresence mode="wait">
        {top3.length >= 3 && (
          <motion.div
            key={scoreLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-end justify-center gap-2 sm:gap-3 md:gap-4 mb-6"
          >
            {podiumOrder.map((place, idx) => {
              const ranked = podiumEntries[place - 1];
              if (!ranked) {
                return (
                  <div
                    key={place}
                    className="w-[150px] md:w-[170px] flex-shrink-0"
                  />
                );
              }
              return (
                <PodiumCard
                  key={`${scoreLabel}-${ranked.id}-${place}`}
                  ranked={ranked}
                  place={place}
                  delay={0.1 + idx * 0.15}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranked list (4th+) */}
      {rest.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
            Остальные участники
          </h3>
          <Card className="border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl overflow-hidden">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <div className="p-2 space-y-1">
                <AnimatePresence mode="popLayout">
                  {rest.map((ranked, idx) => (
                    <RankedListRow
                      key={`${scoreLabel}-${ranked.id}`}
                      ranked={ranked}
                      rank={idx + 4}
                      index={idx}
                      scoreLabel={scoreLabel}
                      scoreValue={scoreGetter(ranked)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* If fewer than 4 users total, show a message */}
      {top3.length > 0 && rest.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Пока слишком мало участников для полного рейтинга
        </p>
      )}
    </div>
  );
}
