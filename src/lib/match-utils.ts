import type { User, MatchWithUsers } from '@/lib/store';

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

export function formatMessageDate(dateStr: string, language: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(language || 'ru', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return date.toLocaleTimeString(language || 'ru', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(language || 'ru', { day: 'numeric', month: 'short' });
}

export function filterValidMatches(matches: MatchWithUsers[]): MatchWithUsers[] {
  return matches.filter((m) => m.user1 && m.user2);
}
