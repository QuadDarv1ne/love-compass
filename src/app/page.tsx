'use client';

import { useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  Heart, Search, User, Eye, Compass, Camera, Trophy, Shield, Settings as SettingsIcon,
} from 'lucide-react';
import { useAppStore, type ViewType } from '@/lib/store';
import { viewTransitionVariants, DarkModeToggle } from '@/components/views/shared';
import { MatchAnimationOverlay } from '@/components/views/match-animation-overlay';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/useTranslation';

// Dynamic imports for route-level code splitting
const LandingView = lazy(() => import('@/components/views/landing-view').then((m) => ({ default: m.LandingView })));
const BrowseView = lazy(() => import('@/components/views/browse-view').then((m) => ({ default: m.BrowseView })));
const MatchesView = lazy(() => import('@/components/views/matches-view').then((m) => ({ default: m.MatchesView })));
const ChatListView = lazy(() => import('@/components/views/matches-view').then((m) => ({ default: m.ChatListView })));
const ChatView = lazy(() => import('@/components/views/chat-view').then((m) => ({ default: m.ChatView })));
const ProfileView = lazy(() => import('@/components/views/profile-view').then((m) => ({ default: m.ProfileView })));
const LikedYouView = lazy(() => import('@/components/views/liked-you-view').then((m) => ({ default: m.LikedYouView })));
const MomentsView = lazy(() => import('@/components/views/moments-view').then((m) => ({ default: m.MomentsView })));
const TopView = lazy(() => import('@/components/views/top-view').then((m) => ({ default: m.TopView })));
const SettingsView = lazy(() => import('@/components/views/settings-view').then((m) => ({ default: m.SettingsView })));
const AchievementsView = lazy(() => import('@/components/views/achievements-view').then((m) => ({ default: m.AchievementsView })));
const AdminView = lazy(() => import('@/components/views/admin-view').then((m) => ({ default: m.AdminView })));

export default function HomePage() {
  const { currentView, matches, likedYouCount, viewDirection, authStatus, checkAuth, showMatchAnimation, currentUser } = useAppStore(
    useShallow((s) => ({
      currentView: s.currentView,
      matches: s.matches,
      likedYouCount: s.likedYouCount,
      viewDirection: s.viewDirection,
      authStatus: s.authStatus,
      checkAuth: s.checkAuth,
      showMatchAnimation: s.showMatchAnimation,
      currentUser: s.currentUser,
    }))
  );
  const { t } = useTranslation();

  // Check auth session on mount
  useEffect(() => {
    if (authStatus === 'idle') {
      checkAuth();
    }
  }, [authStatus, checkAuth]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (authStatus !== 'authenticated') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const keyMap: Record<string, string> = {
        '1': 'browse', '2': 'moments', '3': 'matches', '4': 'top', '5': 'profile',
      };
      const view = keyMap[e.key];
      if (view && currentView !== view) {
        useAppStore.getState().navigateTo(view as ViewType);
      }
      if (e.key === 'g' && currentUser?.role === 'admin') {
        useAppStore.getState().navigateTo('admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authStatus, currentUser, currentView]);

  const matchCount = matches.length;

  // Primary nav items (bottom bar + sidebar top)
  const navItems = [
    { view: 'browse' as const, icon: Search, label: t('nav.browse'), badge: undefined as number | undefined },
    { view: 'moments' as const, icon: Camera, label: t('nav.moments'), badge: undefined as number | undefined },
    { view: 'matches' as const, icon: Heart, label: t('nav.matches'), badge: matchCount },
    { view: 'top' as const, icon: Trophy, label: t('nav.top'), badge: undefined as number | undefined },
    { view: 'profile' as const, icon: User, label: t('nav.profile'), badge: undefined as number | undefined },
  ];

  // Secondary nav items (sidebar only)
  const secondaryNavItems = [
    { view: 'likedYou' as const, icon: Eye, label: t('nav.likedYou'), badge: likedYouCount },
    { view: 'achievements' as const, icon: Trophy, label: t('nav.achievements'), badge: undefined as number | undefined },
    ...(currentUser?.role === 'admin' ? [{ view: 'admin' as const, icon: Shield, label: t('nav.admin'), badge: undefined as number | undefined }] : []),
    { view: 'settings' as const, icon: SettingsIcon, label: t('nav.settings'), badge: undefined as number | undefined },
  ];

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative">
      {/* Match Animation Overlay */}
      <AnimatePresence>
        {showMatchAnimation && <MatchAnimationOverlay />}
      </AnimatePresence>

      {currentView === 'landing' ? (
        <LandingView />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:flex-col md:w-72 lg:w-80 border-r border-rose-100 dark:border-rose-900/50 bg-card/60 backdrop-blur-sm min-h-0">
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
                  whileHover={{ x: 4, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => useAppStore.getState().navigateTo(view)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    currentView === view || (view === 'matches' && currentView === 'chat')
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-300'
                  }`}
                >
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
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
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-2">
              <div className="p-3 pb-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">{t('nav.messages')}</h3>
              </div>
              <ChatListView />
            </div>
          </aside>

          {/* Main Content with transitions */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnimatePresence mode="wait" custom={viewDirection}>
              {currentView === 'browse' && renderView('browse', <Suspense fallback={<ViewSkeleton />}><BrowseView /></Suspense>, viewDirection)}
              {currentView === 'moments' && renderView('moments', <Suspense fallback={<ViewSkeleton />}><MomentsView /></Suspense>, viewDirection)}
              {currentView === 'matches' && renderView('matches', <Suspense fallback={<ViewSkeleton />}><MatchesView /></Suspense>, viewDirection)}
              {currentView === 'chat' && renderView('chat', <Suspense fallback={<ViewSkeleton />}><ChatView /></Suspense>, viewDirection)}
              {currentView === 'profile' && renderView('profile', <Suspense fallback={<ViewSkeleton />}><ProfileView /></Suspense>, viewDirection)}
              {currentView === 'likedYou' && renderView('likedYou', <Suspense fallback={<ViewSkeleton />}><LikedYouView /></Suspense>, viewDirection)}
              {currentView === 'top' && renderView('top', <Suspense fallback={<ViewSkeleton />}><TopView /></Suspense>, viewDirection)}
              {currentView === 'settings' && renderView('settings', <Suspense fallback={<ViewSkeleton />}><SettingsView /></Suspense>, viewDirection)}
              {currentView === 'achievements' && renderView('achievements', <Suspense fallback={<ViewSkeleton />}><AchievementsView /></Suspense>, viewDirection)}
              {currentView === 'admin' && renderView('admin', <Suspense fallback={<ViewSkeleton />}><AdminView /></Suspense>, viewDirection)}
            </AnimatePresence>
          </main>

          {/* Mobile Bottom Tab Bar */}
          <nav className="md:hidden flex items-center justify-around border-t border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-lg safe-area-pb px-1 pt-1">
            {navItems.map(({ view, icon: Icon, label, badge }) => (
              <motion.button
                key={view}
                whileTap={{ scale: 0.9 }}
                onClick={() => useAppStore.getState().navigateTo(view)}
                className={`flex flex-col items-center gap-0.5 py-2 px-2 transition-colors relative min-w-0 ${
                  currentView === view
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-gray-400 dark:text-gray-500 hover:text-rose-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-0.5 right-0 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {badge}
                  </span>
                )}
              </motion.button>
            ))}
            <div className="flex flex-col items-center gap-0.5 py-2 px-2">
              <DarkModeToggle />
            </div>
          </nav>

          {/* Copyright Footer */}
          <footer className="md:hidden text-center py-2 border-t border-rose-100 dark:border-rose-900/30 bg-card/40 backdrop-blur-sm safe-area-pb">
            <p className="text-[10px] text-muted-foreground">
              {t('footer.copyright')}
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}

// Skeleton fallback for lazy-loaded views
function ViewSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
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
