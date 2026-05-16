'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, type User, type MatchWithUsers } from '@/lib/store';
import { OnlineIndicator } from './shared';

export function MatchesView() {
  const { matches, currentUser, navigateTo, setSelectedMatch, unreadMatchIds } = useAppStore();
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      if (!currentUser) return;
      try {
        const res = await fetch('/api/matches');
        const data = await res.json();
        useAppStore.getState().setMatches(data);

        // Detect unread: matches that have messages where sender is not current user
        const unreadIds: string[] = [];
        for (const match of data) {
          if (match.messages && match.messages.length > 0) {
            const lastMsg = match.messages[0];
            if (lastMsg.senderId !== currentUser.id) {
              unreadIds.push(match.id);
            }
          }
        }
        useAppStore.getState().setUnreadMatchIds(unreadIds);
      } catch { console.error('Failed to load matches'); }
      setLocalLoading(false);
    };
    loadMatches();
  }, [currentUser]);

  const getPartner = (match: MatchWithUsers): User => {
    return match.user1.id === currentUser?.id ? match.user2 : match.user1;
  };

  const getLastMessage = (match: MatchWithUsers): string => {
    if (match.messages && match.messages.length > 0) {
      const lastMsg = match.messages[0];
      const isMine = lastMsg.senderId === currentUser?.id;
      return isMine ? `Вы: ${lastMsg.content}` : lastMsg.content;
    }
    return 'Начните общение!';
  };

  const openChat = (match: MatchWithUsers) => {
    setSelectedMatch(match);
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

  if (matches.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <Heart className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">Пока нет мэтчей</h2>
          <p className="text-muted-foreground text-sm">Просмотрите анкеты и нажмите ❤️</p>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="flex-1 px-4 py-4 md:py-6 overflow-y-auto custom-scrollbar">
      <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300 mb-4 md:mb-6">Ваши мэтчи</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <AnimatePresence>
          {matches.map((match, idx) => {
            const partner = getPartner(match);
            const isUnread = unreadMatchIds.includes(match.id);
            return (
              <motion.div key={match.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => openChat(match)} className="cursor-pointer">
                  <Card className="overflow-hidden border-rose-100 dark:border-rose-900/50 shadow-md hover:shadow-xl transition-shadow rounded-2xl bg-card">
                    <div className="relative aspect-square">
                      <Image src={partner.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={partner.name} fill className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {/* Online indicator */}
                      <OnlineIndicator userId={partner.id} size="md" />
                      {/* Unread dot */}
                      {isUnread && (
                        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border border-white dark:border-card" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm truncate">{partner.name}, {partner.age}</h3>
                        <p className="text-white/70 text-xs truncate">{getLastMessage(match)}</p>
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
  const { matches, currentUser, setSelectedMatch, chatListMatchId, setChatListMatchId } = useAppStore();

  const getPartner = (match: MatchWithUsers): User => {
    return match.user1.id === currentUser?.id ? match.user2 : match.user1;
  };

  const getLastMessage = (match: MatchWithUsers): string => {
    if (match.messages && match.messages.length > 0) {
      const lastMsg = match.messages[0];
      const isMine = lastMsg.senderId === currentUser?.id;
      return isMine ? `Вы: ${lastMsg.content}` : lastMsg.content;
    }
    return 'Начните общение!';
  };

  const openChat = (match: MatchWithUsers) => {
    setSelectedMatch(match);
    setChatListMatchId(match.id);
  };

  if (matches.length === 0) {
    return <div className="p-4 text-center text-muted-foreground text-sm">Нет мэтчей</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {matches.map((match) => {
        const partner = getPartner(match);
        const isActive = chatListMatchId === match.id;
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
                  {match.messages?.[0]?.createdAt
                    ? new Date(match.messages[0].createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                    : ''}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{getLastMessage(match)}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}


