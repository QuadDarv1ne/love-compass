'use client';

import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { createTranslator, type Locale, SUPPORTED_LOCALES } from '@/lib/i18n';
import { DEFAULT_LOCALE } from '@/lib/constants';

/**
 * React hook that returns a translation function `t()` bound to the current
 * user's language from the app store.
 *
 * Re-renders when `language` changes so all consuming components stay in sync.
 */
export function useTranslation() {
  const language = useAppStore((s) => s.language);

  const locale: Locale = useMemo(
    () => (SUPPORTED_LOCALES.includes(language as Locale) ? (language as Locale) : DEFAULT_LOCALE),
    [language],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      createTranslator(locale)(key, params),
    [locale],
  );

  return { t, locale };
}
