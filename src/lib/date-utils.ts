import { DEFAULT_LOCALE } from './constants';

function resolveLocale(lang: string): string {
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'en') return 'en-US';
  return 'ru-RU';
}

export function formatTime(dateStr: string, lang: string = DEFAULT_LOCALE): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(resolveLocale(lang), { hour: '2-digit', minute: '2-digit' });
}

export function formatChatDate(
  dateStr: string,
  lang: string = DEFAULT_LOCALE,
  todayLabel?: string,
  yesterdayLabel?: string,
): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return todayLabel || formatTime(dateStr, lang);
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return yesterdayLabel || formatTime(dateStr, lang);
  }
  return date.toLocaleDateString(resolveLocale(lang), { day: 'numeric', month: 'short' });
}

export function formatFullDate(dateStr: string, lang: string = DEFAULT_LOCALE): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat(resolveLocale(lang), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
