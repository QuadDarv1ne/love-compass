'use client';

import { useEffect } from 'react';
import { Heart, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/hooks/useTranslation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    logger.error('route-error', 'Unhandled route error', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-rose-950 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-100 dark:bg-rose-900/30">
          <Heart className="w-10 h-10 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('error.pageTitle')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('error.pageMessage')}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          {t('error.tryAgain')}
        </button>
      </div>
    </div>
  );
}
