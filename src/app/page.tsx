'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Search, User, Eye, Compass, Camera, Trophy, Settings as SettingsIcon,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { viewTransitionVariants, DarkModeToggle } from '@/components/views/shared';
import { MatchAnimationOverlay } from '@/components/views/match-animation-overlay';
import { LandingView } from '@/components/views/landing-view';
import { BrowseView } from '@/components/views/browse-view';
import { MatchesView, ChatListView } from '@/components/views/matches-view';
import { ChatView } from '@/components/views/chat-view';
import { ProfileView } from '@/components/views/profile-view';
import { LikedYouView } from '@/components/views/liked-you-view';
import { MomentsView } from '@/components/views/moments-view';
import { TopView } from '@/components/views/top-view';
import { SettingsView } from '@/components/views/settings-view';
import { AchievementsView } from '@/components/views/achievements-view';
import { Separator } from '@/components/ui/separator';

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const { currentView, matches, likedYouCount, viewDirection, authStatus, checkAuth } = useAppStore();

  // Check auth session on mount
  useEffect(() => {
    if (authStatus === 'idle') {
      checkAuth();
    }
  }, [authStatus, checkAuth]);

  const matchCount = matches.length;

  // Primary nav items (bottom bar + sidebar top)
  const navItems = [
    { view: 'browse' as const, icon: Search, label: 'Анкеты' },
    { view: 'moments' as const, icon: Camera, label: 'Моменты' },
    { view: 'matches' as const, icon: Heart, label: 'Мэтчи', badge: matchCount },
    { view: 'top' as const, icon: Trophy, label: 'Рейтинг' },
    { view: 'profile' as const, icon: User, label: 'Профиль' },
  ];

  // Secondary nav items (sidebar only)
  const secondaryNavItems = [
    { view: 'likedYou' as const, icon: Eye, label: 'Лайки', badge: likedYouCount },
    { view: 'achievements' as const, icon: Trophy, label: 'Достижения' },
    { view: 'settings' as const, icon: SettingsIcon, label: 'Настройки' },
  ];

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative">
      {/* Match Animation Overlay */}
      <AnimatePresence>
        {useAppStore.getState().showMatchAnimation && <MatchAnimationOverlay />}
      </AnimatePresence>

      {currentView === 'landing' ? (
        <LandingView />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Desktop Sidebar */}
          <div className="hidden md:flex md:flex-col md:w-72 lg:w-80 border-r border-rose-100 dark:border-rose-900/50 bg-card/60 backdrop-blur-sm">
            {/* Logo + Dark Mode */}
            <div className="flex items-center justify-between p-4 border-b border-rose-100 dark:border-rose-900/50">
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
                <span className="text-lg font-bold gradient-text">Love Compass</span>
              </div>
              <DarkModeToggle />
            </div>

            {/* Primary Nav */}
            <nav className="p-3 space-y-1">
              {navItems.map(({ view, icon: Icon, label, badge }) => (
                <motion.button
                  key={view}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => useAppStore.getState().navigateTo(view)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    currentView === view || (view === 'matches' && currentView === 'chat')
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>

            <Separator className="bg-rose-100 dark:bg-rose-900/50 mx-3" />

            {/* Secondary Nav */}
            <nav className="p-3 space-y-1">
              {secondaryNavItems.map(({ view, icon: Icon, label, badge }) => (
                <motion.button
                  key={view}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => useAppStore.getState().navigateTo(view)}
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                    currentView === view
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-auto bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>

            <Separator className="bg-rose-100 dark:bg-rose-900/50 mx-3" />

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-3 pb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Сообщения</h3>
              </div>
              <ChatListView />
            </div>
          </div>

          {/* Main Content with transitions */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait" custom={viewDirection}>
              {currentView === 'browse' && renderView('browse', <BrowseView />, viewDirection)}
              {currentView === 'moments' && renderView('moments', <MomentsView />, viewDirection)}
              {currentView === 'matches' && renderView('matches', <MatchesView />, viewDirection)}
              {currentView === 'chat' && renderView('chat', <ChatView />, viewDirection)}
              {currentView === 'profile' && renderView('profile', <ProfileView />, viewDirection)}
              {currentView === 'likedYou' && renderView('likedYou', <LikedYouView />, viewDirection)}
              {currentView === 'top' && renderView('top', <TopView />, viewDirection)}
              {currentView === 'settings' && renderView('settings', <SettingsView />, viewDirection)}
              {currentView === 'achievements' && renderView('achievements', <AchievementsView />, viewDirection)}
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Tab Bar */}
          <nav className="md:hidden flex items-center justify-around border-t border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-lg safe-area-pb">
            {navItems.map(({ view, icon: Icon, label, badge }) => (
              <motion.button
                key={view}
                whileTap={{ scale: 0.9 }}
                onClick={() => useAppStore.getState().navigateTo(view)}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors relative ${
                  currentView === view
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-rose-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-0.5 right-1 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {badge}
                  </span>
                )}
              </motion.button>
            ))}
            {/* Dark mode toggle in mobile nav */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <DarkModeToggle />
            </div>
          </nav>
        </div>

        {/* Copyright Footer */}
        <footer className="text-center py-3 border-t border-rose-100 dark:border-rose-900/30 bg-card/40 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">
            © 2026 Love Compass. Все права защищены. Автор: Дуплей Максим Игоревич
          </p>
        </footer>
      )}
    </div>
  );
}

// Helper to render animated view wrapper
function renderView(key: string, children: React.ReactNode, direction: 'forward' | 'backward') {
  return (
    <motion.div
      key={key}
      custom={direction}
      variants={viewTransitionVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex-1 flex flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
