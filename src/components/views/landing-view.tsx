'use client';

import React from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion } from 'framer-motion';
import {
  Heart, Compass, MessageCircle, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore, type User } from '@/lib/store';
import { FloatingHearts } from './shared';
import Link from 'next/link';

// ─── Features data ──────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Compass,
    title: 'Умные рекомендации',
    description: 'Наш алгоритм подбирает идеальных кандидатов',
  },
  {
    icon: Heart,
    title: 'Мэтчи',
    description: 'Двусторонний лайк создает мэтч мгновенно',
  },
  {
    icon: MessageCircle,
    title: 'Чат',
    description: 'Общайтесь в реальном времени с собеседником',
  },
  {
    icon: Shield,
    title: 'Безопасность',
    description: 'Ваши данные под надёжной защитой',
  },
];

// ─── Demo users (only in dev mode) ──────────────────────────────────────────
const DEMO_USERS = [
  { name: 'Анна', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Anastasia' },
  { name: 'Дмитрий', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Dmitry' },
  { name: 'Екатерина', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ekaterina' },
  { name: 'Максим', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Maxim' },
  { name: 'Ольга', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Olga' },
  { name: 'Артём', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Artem' },
  { name: 'Мария', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Maria' },
  { name: 'Никита', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Nikita' },
  { name: 'Наташа', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Natalia' },
  { name: 'Минджун', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ivan' },
  { name: 'София', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sofia' },
  { name: 'Радж', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Andrey' },
  { name: 'Амара', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Alina' },
  { name: 'Эйдан', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sergey' },
  { name: 'Сакура', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Diana' },
  { name: 'Кваме', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Kirill' },
  { name: 'Камилла', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Polina' },
  { name: 'Эрик', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Roman' },
  { name: 'Лейла', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Viktoria' },
  { name: 'Лукас', avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Alexander' },
];

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function LandingView() {
  const [loading, setLoading] = React.useState(false);

  const quickLogin = async (avatarIndex: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/profiles?limit=100');
      const body = await res.json();
      const users: User[] = body.data ?? body;
      const selectedUser = users[avatarIndex];
      if (selectedUser) {
        const loginRes = await fetch('/api/auth/demo-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUser.id }),
        });
        if (loginRes.ok) {
          useAppStore.setState((state) => {
            state.checkAuth();
            return {};
          });
        }
      }
    } catch (error) {
      console.error('Demo login failed:', error);
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
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block mb-4"
        >
          <Compass className="w-16 h-16 md:w-20 md:h-20 text-rose-500 mx-auto" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-4">Love Compass</h1>
        <p className="text-lg md:text-xl text-rose-400 font-medium mb-2">Твой компас к любви</p>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          Знакомься с людьми со всего мира. Сотни тысяч уже нашли друг друга!
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
            Войти
          </Button>
        </Link>
        <Link href="/register" className="block">
          <Button variant="outline" className="w-full py-6 text-lg font-semibold rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
            Зарегистрироваться
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
              <h3 className="text-center font-semibold text-rose-700 dark:text-rose-300 mb-1">Войти как пользователь (демо)</h3>
              <p className="text-center text-xs text-muted-foreground mb-4">20 профилей из разных стран мира</p>
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
        <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text mb-8">Почему Love Compass?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
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
                  <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-8 mt-8 mb-12 z-10 text-center">
        {[
          { num: '10K+', label: 'Пользователей' },
          { num: '5K+', label: 'Мэтчей' },
          { num: '98%', label: 'Довольны' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl font-bold gradient-text">{stat.num}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
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
          © 2026 Love Compass. Все права защищены.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Автор: Дуплей Максим Игоревич
        </p>
      </motion.footer>
    </div>
  );
}
