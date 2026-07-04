import type { Moment } from '@/lib/store';

export function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('moments.justNow');
  if (mins < 60) return `${mins} ${t('moments.minShort')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('moments.hourShort')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('moments.dayShort')}`;
}

export function getUniqueUsersFromMoments(moments: Moment[]) {
  const seen = new Set<string>();
  return moments.filter((m) => {
    if (seen.has(m.userId)) return false;
    seen.add(m.userId);
    return true;
  }).map((m) => ({ id: m.userId, name: m.userName, avatar: m.userAvatar }));
}
