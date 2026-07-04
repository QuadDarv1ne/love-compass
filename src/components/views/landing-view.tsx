'use client';

import React from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion } from 'framer-motion';
import {
  Heart, Compass, MessageCircle, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { logger } from '@/lib/logger';
import { AVATAR_BASE_URL } from '@/lib/constants';
import { FloatingHearts } from './shared';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import Link from 'next/link';

const FEATURES = [
  { icon: Compass, titleKey: 'landing.smartMatching', descKey: 'landing.smartMatchingDesc' },
  { icon: Heart, titleKey: 'landing.matches', descKey: 'landing.matchesDesc' },
  { icon: MessageCircle, titleKey: 'landing.chat', descKey: 'landing.chatDesc' },
  { icon: Shield, titleKey: 'landing.security', descKey: 'landing.securityDesc' },
];

interface DemoUser { name: string; email: string; avatar: string; }
const DEMO_USERS: DemoUser[] = [
  { name: 'Анна', email: 'anna@example.com', avatar: `${AVATAR_BASE_URL}?seed=Anastasia` },
  { name: 'Дмитрий', email: 'dmitry@example.com', avatar: `${AVATAR_BASE_URL}?seed=Dmitry` },
  { name: 'Екатерина', email: 'ekaterina@example.com', avatar: `${AVATAR_BASE_URL}?seed=Ekaterina` },
  { name: 'Максим', email: 'maxim@example.com', avatar: `${AVATAR_BASE_URL}?seed=Maxim` },
  { name: 'Ольга', email: 'olga@example.com', avatar: `${AVATAR_BASE_URL}?seed=Olga` },
  { name: 'Артём', email: 'artem@example.com', avatar: `${AVATAR_BASE_URL}?seed=Artem` },
  { name: 'Мария', email: 'maria@example.com', avatar: `${AVATAR_BASE_URL}?seed=Maria` },
  { name: 'Никита', email: 'nikita@example.com', avatar: `${AVATAR_BASE_URL}?seed=Nikita` },
  { name: 'Наташа', email: 'natasha@example.com', avatar: `${AVATAR_BASE_URL}?seed=Natalia` },
  { name: 'Минджун', email: 'minjun@example.com', avatar: `${AVATAR_BASE_URL}?seed=Minjun` },
  { name: 'София', email: 'sofia@example.com', avatar: `${AVATAR_BASE_URL}?seed=Sofia` },
  { name: 'Радж', email: 'raj@example.com', avatar: `${AVATAR_BASE_URL}?seed=Raj` },
  { name: 'Амара', email: 'amara@example.com', avatar: `${AVATAR_BASE_URL}?seed=Amara` },
  { name: 'Эйдан', email: 'aidan@example.com', avatar: `${AVATAR_BASE_URL}?seed=Aidan` },
  { name: 'Сакура', email: 'sakura@example.com', avatar: `${AVATAR_BASE_URL}?seed=Sakura` },
  { name: 'Кваме', email: 'kwame@example.com', avatar: `${AVATAR_BASE_URL}?seed=Kwame` },
  { name: 'Камилла', email: 'camille@example.com', avatar: `${AVATAR_BASE_URL}?seed=Camille` },
  { name: 'Эрик', email: 'erik@example.com', avatar: `${AVATAR_BASE_URL}?seed=Erik` },
  { name: 'Лейла', email: 'layla@example.com', avatar: `${AVATAR_BASE_URL}?seed=Layla` },
  { name: 'Лукас', email: 'lucas@example.com', avatar: `${AVATAR_BASE_URL}?seed=Lucas` },
];

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function LandingView() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);

  const quickLogin = async (avatarIndex: number) => {
    const user = DEMO_USERS[avatarIndex];
    if (!user?.email) return;
    setLoading(true);
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000);

      const csrfRes = await fetch('/api/auth/csrf-token', { signal: abortController.signal });
      clearTimeout(timeoutId);
      if (!csrfRes.ok) throw new Error('Failed to fetch CSRF token');
      const csrfData = await csrfRes.json();
      const csrfToken: string | undefined = csrfData.csrfToken;
      if (!csrfToken) throw new Error('CSRF token not found');

      const loginAbort = new AbortController();
      const loginTimeout = setTimeout(() => loginAbort.abort(), 10000);
      const loginRes = await fetch('/api/auth/demo-login', {
        signal: loginAbort.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ email: user.email }),
      });
      clearTimeout(loginTimeout);
      if (loginRes.ok) {
        useAppStore.getState().checkAuth();
      } else {
        const errData = await loginRes.json().catch(() => ({}));
        logger.error('landing-view.demo', 'Demo login rejected', { status: loginRes.status, error: errData.error });
        toast.error(errData.error || t('landing.demoLoginError'));
      }
    } catch (error) {
      logger.error('landing-view.demo', 'Demo login failed', error);
      toast.error(t('landing.demoLoginError'));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 relative">
      <FloatingHearts />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-8 md:mb-12 z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          className="inline-block mb-4"
        >
          <div className="relative">
            <Compass className="w-16 h-16 md:w-20 md:h-20 text-rose-500 mx-auto" strokeWidth={1.5} />
            <motion.div
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-rose-400/20 rounded-full blur-xl"
            />
          </div>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-4">{t('app.name')}</h1>
        <p className="text-lg md:text-xl text-rose-400 font-medium mb-2">{t('app.tagline')}</p>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          {t('landing.subtitle')}
        </p>
      </motion.div>

      {/* Auth Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full max-w-sm z-10 mb-8 space-y-3"
      >
        <Link href="/login" className="block">
          <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white py-6 text-lg font-semibold rounded-xl">
            {t('auth.login')}
          </Button>
        </Link>
        <Link href="/register" className="block">
          <Button variant="outline" className="w-full py-6 text-lg font-semibold rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
            {t('auth.register')}
          </Button>
        </Link>
      </motion.div>

      {/* Demo Login (dev mode only) */}
      {DEMO_MODE && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full max-w-2xl z-10 mb-8"
        >
          <Card className="border-rose-200 dark:border-rose-900/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-center font-semibold text-rose-700 dark:text-rose-300 mb-1">{t('landing.demoLogin')}</h3>
              <p className="text-center text-xs text-muted-foreground mb-4">{t('landing.demoProfiles')}</p>
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {DEMO_USERS.map((user, idx) => (
                  <motion.button
                    key={user.name}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => quickLogin(idx)}
                    disabled={loading}
                    className="flex flex-col items-center gap-1 p-1.5 md:p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-rose-200 dark:border-rose-800 shadow-sm">
                      <SafeImage src={user.avatar} alt={user.name} fill className="object-cover" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-rose-700 dark:text-rose-300 truncate w-full text-center">{user.name}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full max-w-3xl z-10 mt-16 mb-12"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text mb-8">{t('landing.whyLoveCompass')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
            >
              <Card className="border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 rounded-2xl h-full">
                <CardContent className="p-5 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-rose-500" />
                  </div>
                  <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">{t(feature.titleKey)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-8 mt-8 mb-12 z-10 text-center">
        {[
          { num: '10K+', labelKey: 'landing.usersStat' },
          { num: '5K+', labelKey: 'landing.matchesStat' },
          { num: '98%', labelKey: 'landing.satisfiedStat' },
        ].map((stat) => (
          <div key={stat.labelKey}>
            <div className="text-2xl font-bold gradient-text">{stat.num}</div>
            <div className="text-xs text-muted-foreground">{t(stat.labelKey)}</div>
          </div>
        ))}
      </motion.div>

      {/* Copyright Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-auto pt-8 pb-4 text-center z-10"
      >
        <p className="text-xs text-muted-foreground">
          {t('footer.copyright')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('footer.author')}
        </p>
      </motion.footer>
    </div>
  );
}
