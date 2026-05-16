'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Heart, Moon, Sun, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';

// ─── Avatar Options ──────────────────────────────────────────────────────────
export const ALL_AVATARS = [
  'https://api.dicebear.com/9.x/notionists/svg?seed=Anastasia', 'https://api.dicebear.com/9.x/notionists/svg?seed=Viktoria', 'https://api.dicebear.com/9.x/notionists/svg?seed=Ekaterina', 'https://api.dicebear.com/9.x/notionists/svg?seed=Maria',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Olga', 'https://api.dicebear.com/9.x/notionists/svg?seed=Sofia', 'https://api.dicebear.com/9.x/notionists/svg?seed=Natalia', 'https://api.dicebear.com/9.x/notionists/svg?seed=Alina',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Diana', 'https://api.dicebear.com/9.x/notionists/svg?seed=Polina',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Alexander', 'https://api.dicebear.com/9.x/notionists/svg?seed=Dmitry', 'https://api.dicebear.com/9.x/notionists/svg?seed=Maxim', 'https://api.dicebear.com/9.x/notionists/svg?seed=Artem',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Ivan', 'https://api.dicebear.com/9.x/notionists/svg?seed=Nikita', 'https://api.dicebear.com/9.x/notionists/svg?seed=Andrey', 'https://api.dicebear.com/9.x/notionists/svg?seed=Sergey',
  'https://api.dicebear.com/9.x/notionists/svg?seed=Kirill', 'https://api.dicebear.com/9.x/notionists/svg?seed=Roman',
];

// ─── View Transition Variants ────────────────────────────────────────────────
export const viewTransitionVariants: Variants = {
  enter: (direction: string) => ({
    x: direction === 'forward' ? 80 : -80,
    y: 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: (direction: string) => ({
    x: direction === 'forward' ? -80 : 80,
    y: 0,
    opacity: 0,
  }),
};

// ─── Online Indicator ────────────────────────────────────────────────────────
export function OnlineIndicator({ userId, size = 'sm' }: { userId: string; size?: 'sm' | 'md' }) {
  const { onlineUserIds } = useAppStore();
  const isOnline = onlineUserIds.includes(userId);
  if (!isOnline) return null;
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span className={`absolute bottom-0 right-0 ${dotSize} bg-green-500 rounded-full border-2 border-white dark:border-card z-10`} />
  );
}

// ─── Typing Indicator ────────────────────────────────────────────────────────
export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="chat-received px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full inline-block" />
        <span className="typing-dot w-2 h-2 bg-muted-foreground rounded-full inline-block" />
      </div>
    </div>
  );
}

// ─── Dark Mode Toggle ────────────────────────────────────────────────────────
/**
 * Returns true once the component has mounted on the client.
 * Used to avoid SSR hydration mismatches for theme-dependent UI.
 */
function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export function DarkModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useClientMounted();
  if (!mounted) return <div className="w-9 h-9" />;
  const isDark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-full"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

// ─── Floating Hearts Background ─────────────────────────────────────────────
// Deterministic heart positions (pre-computed, no mutation)
const HEART_CONFIGS = (() => {
  const vals: number[] = [];
  let s = 42;
  for (let i = 0; i < 105; i++) {
    s = (s * 16807) % 2147483647;
    vals.push((s - 1) / 2147483646);
  }
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: `${vals[i * 7] * 100}%`,
    size: 12 + vals[i * 7 + 1] * 20,
    duration: 6 + vals[i * 7 + 2] * 8,
    delay: vals[i * 7 + 3] * 10,
    drift: `${(vals[i * 7 + 4] - 0.5) * 200}px`,
    spin: `${(vals[i * 7 + 5] - 0.5) * 360}deg`,
    opacity: 0.15 + vals[i * 7 + 6] * 0.25,
  }));
})();

export function FloatingHearts() {
  const hearts = HEART_CONFIGS;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="floating-heart absolute"
          style={{
            left: heart.left,
            bottom: '-30px',
            '--duration': `${heart.duration}s`,
            '--drift': heart.drift,
            '--spin': heart.spin,
            animationDelay: `${heart.delay}s`,
            opacity: heart.opacity,
          } as React.CSSProperties}
        >
          <Heart
            className="text-rose-300 fill-rose-300 dark:text-rose-400 dark:fill-rose-400"
            style={{ width: heart.size, height: heart.size }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Avatar Picker ──────────────────────────────────────────────────────────
export function AvatarPicker({ selected, onSelect }: { selected: string; onSelect: (avatar: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-rose-600">Аватар</Label>
      <div className="grid grid-cols-5 gap-2">
        {ALL_AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onSelect(avatar)}
            className={`relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              selected === avatar ? 'border-rose-500 ring-2 ring-rose-300 scale-105' : 'border-rose-200 hover:border-rose-300'
            }`}
          >
            <Image src={avatar} alt="avatar" fill className="object-cover" />
            {selected === avatar && (
              <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white drop-shadow" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Filter Panel ────────────────────────────────────────────────────────────
export function FilterPanel() {
  const {
    searchQuery, sortBy, filterGender, filterAgeMin, filterAgeMax, filterCity,
    setSearchQuery, setSortBy, setFilterGender, setFilterAgeMin, setFilterAgeMax, setFilterCity,
  } = useAppStore();

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('new');
    setFilterGender('all');
    setFilterAgeMin(0);
    setFilterAgeMax(99);
    setFilterCity('');
  };

  const hasActiveFilters = searchQuery !== '' || sortBy !== 'new' || filterGender !== 'all' || filterAgeMin > 0 || filterAgeMax < 99 || filterCity !== '';

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <Card className="border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-sm mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-rose-600">Фильтры</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-rose-400 hover:text-rose-600 h-auto p-0">
                Сбросить
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Поиск по имени</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введите имя..."
              className="h-9 text-sm"
            />
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Сортировка</Label>
            <div className="flex gap-1">
              {([['new', 'Новые'], ['name', 'По имени'], ['popular', 'Популярные']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortBy(value)}
                  className={`flex-1 h-8 text-xs rounded-lg font-medium transition-all ${
                    sortBy === value
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Пол</Label>
              <Select value={filterGender} onValueChange={(v) => setFilterGender(v as 'all' | 'male' | 'female')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="male">Мужчины</SelectItem>
                  <SelectItem value="female">Женщины</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Возраст от</Label>
              <Select value={String(filterAgeMin)} onValueChange={(v) => setFilterAgeMin(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Любой</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="35">35</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Возраст до</Label>
              <Select value={String(filterAgeMax)} onValueChange={(v) => setFilterAgeMax(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="99">Любой</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="35">35</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Город</Label>
            <Input
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="Название города..."
              className="h-9 text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Re-export SlidersHorizontal for BrowseView ──────────────────────────────
export { SlidersHorizontal };
