'use client';

import { useState, useEffect } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, type MatchWithUsers } from '@/lib/store';
import { getPartner, getLastMessage, filterValidMatches, formatMessageDate } from '@/lib/match-utils';
import { OnlineIndicator } from './shared';
import { useTranslation } from '@/hooks/useTranslation';

export function MatchesView() {
  const { t } = useTranslation();
  const { matches, currentUser, navigateTo, setSelectedMatch, setChatListMatchId, unreadMatchIds, setUnreadMatchIds } = useAppStore(
    useShallow((s) => ({
      matches: s.matches,
      currentUser: s.currentUser,
      navigateTo: s.navigateTo,
      setSelectedMatch: s.setSelectedMatch,
      setChatListMatchId: s.setChatListMatchId,
      unreadMatchIds: s.unreadMatchIds,
      setUnreadMatchIds: s.setUnreadMatchIds,
    }))
  );
  const [localLoading, setLocalLoading] = useState(() => matches.length === 0);

  useEffect(() => {
    // Data is already loaded via hydrateAppData() on login
    // Just detect unread messages from existing store data
    if (!currentUser) {
      setLocalLoading(false);
      return;
    }
    const unreadIds: string[] = [];
    for (const match of matches) {
      if (match.messages && match.messages.length > 0) {
        const lastMsg = match.messages[match.messages.length - 1]!;
        if (lastMsg.senderId !== currentUser.id && !lastMsg.read) {
          unreadIds.push(match.id);
        }
      }
    }
    setUnreadMatchIds(unreadIds);
    setLocalLoading(false);
  }, [currentUser, matches, setUnreadMatchIds]);

  const openChat = (match: MatchWithUsers) => {
    setSelectedMatch(match);
    setChatListMatchId(match.id);
    navigateTo('chat');
  };

  if (localLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Heart className="w-10 h-10 text-rose-400" />
        </motion.div>
      </div>
    );
  }

  // Filter out matches with missing user data (deleted accounts)
  const validMatches = filterValidMatches(matches);

  if (validMatches.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Heart className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">{t('matches.empty')}</h2>
          <p className="text-muted-foreground text-sm">{t('matches.explorePrompt')}</p>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar pb-4">
      <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 mb-4 md:mb-6">{t('matches.yourMatches')}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <AnimatePresence>
          {validMatches.map((match, idx) => {
            const partner = getPartner(match, currentUser);
            // Safety guard — should never be null after filter, but prevent crash
            if (!partner) return null;
            const isUnread = unreadMatchIds.includes(match.id);
            const lastMsg = getLastMessage(match, currentUser, t('matches.youPrefix')) || t('matches.startChat');
            return (
              <motion.div key={match.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => openChat(match)} className="cursor-pointer">
                  <Card className="overflow-hidden border-rose-100 dark:border-rose-900/50 shadow-md hover:shadow-xl transition-shadow rounded-2xl bg-card">
                    <div className="relative aspect-square">
                      <SafeImage src={partner.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={partner.name} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {/* Online indicator */}
                      <OnlineIndicator userId={partner.id} size="md" />
                      {/* Unread dot */}
                      {isUnread && (
                        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-card" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm truncate">{partner.name}, {partner.age}</h3>
                        <p className="text-white/70 text-xs truncate">{lastMsg}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Chat List (for desktop sidebar) ────────────────────────────────────────
export function ChatListView() {
  const { t } = useTranslation();
  const { matches, currentUser, setSelectedMatch, chatListMatchId, setChatListMatchId } = useAppStore(
    useShallow((s) => ({
      matches: s.matches,
      currentUser: s.currentUser,
      setSelectedMatch: s.setSelectedMatch,
      chatListMatchId: s.chatListMatchId,
      setChatListMatchId: s.setChatListMatchId,
    }))
  );

  const openChat = (match: MatchWithUsers) => {
    setSelectedMatch(match);
    setChatListMatchId(match.id);
  };

  // Filter out matches with missing user data (deleted accounts)
  const validMatches = filterValidMatches(matches);

  if (validMatches.length === 0) {
    return <div className="p-4 text-center text-muted-foreground text-sm">{t('matches.empty')}</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {validMatches.map((match) => {
        const partner = getPartner(match, currentUser);
        if (!partner) return null;
        const isActive = chatListMatchId === match.id;
        const lastMsg = getLastMessage(match, currentUser, t('matches.youPrefix')) || t('matches.startChat');
        return (
          <motion.button
            key={match.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => openChat(match)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
              isActive ? 'bg-rose-100 dark:bg-rose-900/30' : 'hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12 border-2 border-rose-200 dark:border-rose-800">
                <AvatarImage src={partner.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={partner.name} />
                <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300">{partner.name[0]}</AvatarFallback>
              </Avatar>
              <OnlineIndicator userId={partner.id} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-rose-800 dark:text-rose-200 truncate">{partner.name}</h4>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {(() => {
                    const lastMsg = match.messages?.length ? match.messages[match.messages.length - 1] : null;
                    return lastMsg?.createdAt
                      ? formatMessageDate(lastMsg.createdAt, useAppStore.getState().language || 'ru', t('chat.yesterday'))
                      : '';
                  })()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{lastMsg}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}


