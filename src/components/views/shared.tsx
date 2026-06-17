'use client';

import { useState, useEffect, useRef } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
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
import { FILTER } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useDebounce } from '@/hooks/useDebounce';

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
  const { setTheme, resolvedTheme, theme } = useTheme();
  const mounted = useClientMounted();
  const { t } = useTranslation();
  if (!mounted) return <div className="w-9 h-9" />;

  // Cycle: light → dark → system → light
  const cycleTheme = () => {
    const current = theme ?? 'system';
    if (current === 'light') setTheme('dark');
    else if (current === 'dark') setTheme('system');
    else setTheme('light');
  };

  // Icon reflects the ACTUAL rendered theme (resolvedTheme)
  const isDark = resolvedTheme === 'dark';

  // Tooltip label based on current setting
  const current = theme ?? 'system';
  const tooltipLabel = current === 'system'
    ? `${t('theme.system')} (${isDark ? t('theme.dark').toLowerCase() : t('theme.light').toLowerCase()})`
    : current === 'dark'
      ? t('theme.dark')
      : t('theme.light');

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={tooltipLabel}
      className="text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-full"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

// ─── Floating Hearts Background (CSS-only) ───────────────────────────────────
// Uses simplified DOM + CSS animations for better performance vs SVG per heart.
// Deterministic heart positions (pre-computed, no mutation)
const HEART_STYLES = (() => {
  const vals: number[] = [];
  let s = 42;
  for (let i = 0; i < 70; i++) {
    s = (s * 16807) % 2147483647;
    vals.push((s - 1) / 2147483646);
  }
  return Array.from({ length: 10 }, (_, i) => ({
    left: `${vals[i * 7]! * 100}%`,
    size: 14 + vals[i * 7 + 1]! * 18,
    duration: 8 + vals[i * 7 + 2]! * 8,
    delay: vals[i * 7 + 3]! * 12,
    opacity: 0.12 + vals[i * 7 + 6]! * 0.18,
  }));
})();

export function FloatingHearts() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {HEART_STYLES.map((h, i) => (
        <div
          key={i}
          className="absolute text-rose-300/30 dark:text-rose-400/20 select-none"
          style={{
            left: h.left,
            bottom: '-40px',
            fontSize: `${h.size}px`,
            animation: `float-heart ${h.duration}s ease-out ${h.delay}s infinite`,
            opacity: h.opacity,
            willChange: 'transform, opacity',
          }}
        >
          ♥
        </div>
      ))}
    </div>
  );
}

// ─── Avatar Picker ──────────────────────────────────────────────────────────
export function AvatarPicker({ selected, onSelect }: { selected: string; onSelect: (avatar: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <Label className="text-rose-600">{t('profile.avatarLabel')}</Label>
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
            <SafeImage src={avatar} alt="avatar" fill className="object-cover" />
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

// ─── Debounced Input ────────────────────────────────────────────────────────
function DebouncedInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 300);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    onChange(debouncedValue);
  }, [debouncedValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <Input
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}

// ─── Filter Panel ────────────────────────────────────────────────────────────
export function FilterPanel() {
  const {
    searchQuery, sortBy, filterGender, filterAgeMin, filterAgeMax, filterCity,
    setSearchQuery, setSortBy, setFilterGender, setFilterAgeMin, setFilterAgeMax, setFilterCity,
  } = useAppStore();
  const { t } = useTranslation();

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('new');
    setFilterGender('all');
    setFilterAgeMin(0);
    setFilterAgeMax(99);
    setFilterCity('');
  };

  const hasActiveFilters = searchQuery !== '' || sortBy !== 'new' || filterGender !== 'all' || filterAgeMin > FILTER.AGE_DEFAULT_MIN || filterAgeMax < FILTER.AGE_DEFAULT_MAX || filterCity !== '';

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
            <h4 className="text-sm font-semibold text-rose-600">{t('filter.title')}</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-rose-400 hover:text-rose-600 h-auto p-0">
                {t('filter.reset')}
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('filter.searchByName')}</Label>
            <DebouncedInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('filter.searchPlaceholder')}
              className="h-9 text-sm"
            />
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('filter.sortBy')}</Label>
            <div className="flex gap-1">
              {([
                ['new', t('filter.sortNew')],
                ['name', t('filter.sortName')],
                ['popular', t('filter.sortPopular')],
              ] as const).map(([value, label]) => (
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
              <Label className="text-xs text-muted-foreground">{t('filter.gender')}</Label>
              <Select value={filterGender} onValueChange={(v) => setFilterGender(v as 'all' | 'male' | 'female')}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.genderAll')}</SelectItem>
                  <SelectItem value="male">{t('filter.genderMale')}</SelectItem>
                  <SelectItem value="female">{t('filter.genderFemale')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('filter.ageFrom')}</Label>
              <Select value={String(filterAgeMin)} onValueChange={(v) => setFilterAgeMin(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('filter.anyAge')}</SelectItem>
                  <SelectItem value="18">18</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="35">35</SelectItem>
                  <SelectItem value="40">40</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('filter.ageTo')}</Label>
              <Select value={String(filterAgeMax)} onValueChange={(v) => setFilterAgeMax(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="99">{t('filter.anyAge')}</SelectItem>
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
            <Label className="text-xs text-muted-foreground">{t('filter.city')}</Label>
            <DebouncedInput
              value={filterCity}
              onChange={setFilterCity}
              placeholder={t('filter.cityPlaceholder')}
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
