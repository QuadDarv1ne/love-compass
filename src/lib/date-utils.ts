function resolveLocale(lang: string): string {
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'en') return 'en-US';
  return 'ru-RU';
}

export function formatTime(dateStr: string, lang = 'ru'): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

export function formatChatDate(
  dateStr: string,
  lang = 'ru',
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
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
}

export function formatFullDate(dateStr: string, lang = 'ru'): string {
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
