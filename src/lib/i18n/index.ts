export type Locale = 'ru' | 'en' | 'zh' | 'es';

export const SUPPORTED_LOCALES: Locale[] = ['ru', 'en', 'zh', 'es'];

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  zh: '中文',
  es: 'Español',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  zh: '🇨🇳',
  es: '🇪🇸',
};

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'ru';
  const langs = navigator.languages ?? [navigator.language];
  for (const lang of langs) {
    const code = lang.split('-')[0]!.toLowerCase();
    if (code === 'zh' || code === 'cmn' || code === 'yue') return 'zh';
    if (code === 'es') return 'es';
    if (code === 'en') return 'en';
    if (code === 'ru') return 'ru';
  }
  return 'ru';
}

type Dict = Record<string, string | Record<string, string>>;

import { default as ruDict } from './ru';
import { default as enDict } from './en';
import { default as esDict } from './es';
import { default as zhDict } from './zh';

export const dictionaries: Record<Locale, Dict> = { ru: ruDict, en: enDict, zh: zhDict, es: esDict };

export function createTranslator(locale: Locale): (key: string, params?: Record<string, string | number>) => string {
  const dict = dictionaries[locale];
  return (key: string, params?: Record<string, string | number>): string => {
    let value = dict[key];
    if (value === undefined) {
      value = dictionaries.ru[key] ?? key;
    }
    if (typeof value === 'string' && params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    }
    return typeof value === 'string' ? value : key;
  };
}

export function createTranslatorForLanguage(language: string): (key: string, params?: Record<string, string | number>) => string {
  const locale: Locale = SUPPORTED_LOCALES.includes(language as Locale) ? (language as Locale) : 'ru';
  return createTranslator(locale);
}
