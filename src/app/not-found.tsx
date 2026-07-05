'use client';

import Link from 'next/link';
import { Heart, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-100 dark:bg-rose-900/30">
          <Heart className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('notFound.title')}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {t('notFound.description')}
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('notFound.homeLink')}
        </Link>
      </div>
    </div>
  );
}
