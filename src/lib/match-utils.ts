import type { User, MatchWithUsers } from '@/lib/store';
import { formatChatDate, formatTime } from '@/lib/date-utils';

export function getPartner(match: MatchWithUsers, currentUser: User | null): User | null {
  if (!match.user1 || !match.user2) return null;
  if (!currentUser) return match.user1;
  return match.user1.id === currentUser.id ? match.user2 : match.user1;
}

export function getLastMessage(match: MatchWithUsers, currentUser: User | null, youPrefix: string): string {
  if (match.messages && match.messages.length > 0) {
    const lastMsg = match.messages[match.messages.length - 1]!;
    const isMine = lastMsg.senderId === currentUser?.id;
    return isMine ? `${youPrefix}${lastMsg.content}` : lastMsg.content;
  }
  return '';
}

export function formatMessageDate(dateStr: string, language: string, yesterdayLabel?: string): string {
  if (!dateStr) return '';
  const today = new Date();
  const date = new Date(dateStr);
  if (date.toDateString() === today.toDateString()) {
    return formatTime(dateStr, language || 'ru');
  }
  return formatChatDate(dateStr, language || 'ru', undefined, yesterdayLabel);
}

export function filterValidMatches(matches: MatchWithUsers[]): MatchWithUsers[] {
  return matches.filter((m) => m.user1 && m.user2);
}
