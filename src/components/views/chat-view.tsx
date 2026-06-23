'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { MessageCircle, ChevronLeft, Send, Sparkles, CheckCheck, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, type Message, type MatchWithUsers } from '@/lib/store';
import { OnlineIndicator, TypingIndicator } from './shared';
import { fetchWithCSRF, fetchWithTimeout } from '@/lib/api';
import { appLogger } from '@/lib/logger';
import { AUTO_REPLY, EMOJI, ANIMATION } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Popular Emojis ──────────────────────────────────────────────────────────
const POPULAR_EMOJIS = [
  '❤️', '🔥', '😘', '😂', '👍', '😍',
  '🥰', '✨', '😊', '🤗', '💋', '💕',
  '🌟', '😎', '🤩', '💘', '😇',
  '🎉', '💯', '🙈', '🤭', '😜', '🥂',
];

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ─── Emoji Picker ────────────────────────────────────────────────────────────
function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 w-10 h-10 md:w-11 md:h-11 rounded-full flex-shrink-0"
      >
        <Smile className="w-5 h-5" />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: ANIMATION.EMOJI_PICKER_DURATION }}
            className="absolute bottom-full right-0 mb-2 bg-card border border-rose-200 dark:border-rose-800 rounded-2xl shadow-xl p-3 z-20 overflow-y-auto"
            style={{ maxHeight: `${EMOJI.PICKER_MAX_HEIGHT_VH}vh` }}
          >
            <div className="emoji-picker-grid gap-1" style={{ display: 'grid', gridTemplateColumns: `repeat(${EMOJI.GRID_COLUMNS}, minmax(0, 1fr))` }}>
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    setOpen(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Chat View ──────────────────────────────────────────────────────────────
export function ChatView() {
  const { t } = useTranslation();
  const { selectedMatch, currentUser, messages, setMessages, addMessage, navigateTo, onlineUserIds, markMessagesAsRead } = useAppStore(
    useShallow((s) => ({
      selectedMatch: s.selectedMatch,
      currentUser: s.currentUser,
      messages: s.messages,
      setMessages: s.setMessages,
      addMessage: s.addMessage,
      navigateTo: s.navigateTo,
      onlineUserIds: s.onlineUserIds,
      markMessagesAsRead: s.markMessagesAsRead,
    }))
  );
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoReplyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const innerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const partner = selectedMatch && selectedMatch.user1 && selectedMatch.user2
    ? selectedMatch.user1.id === currentUser?.id ? selectedMatch.user2 : selectedMatch.user1
    : null;

  const currentUserRef = useRef<typeof currentUser>(null);
  currentUserRef.current = currentUser;

  const selectedMatchId = selectedMatch?.id ?? null;
  const selectedMatchIdRef = useRef<string | null>(null);
  selectedMatchIdRef.current = selectedMatchId;

  // Track new message count for badge indicator
  const [newMessageCount, setNewMessageCount] = useState(0);
  const hasFocusRef = useRef(true);

  // Polling for real-time message updates — cursor-based incremental fetch
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef<number>(0);
  const isPollingRef = useRef(false);
  const pollingRetryDelayRef = useRef(1000);
  const typingSignalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Send typing signal with debounce
  const signalTyping = useCallback(async (matchId: string) => {
    try {
      await fetchWithCSRF('/api/messages/typing', { matchId });
    } catch {
      // Silently fail — typing indicator is not critical
    }
  }, []);

  const checkPartnerTyping = useCallback(async (matchId: string) => {
    try {
      const res = await fetch(`/api/messages/typing?matchId=${encodeURIComponent(matchId)}`);
      if (res.ok) {
        const data = await res.json();
        setPartnerTyping(data.typing === true);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (!selectedMatch) return;
    const abortController = new AbortController();
    let cancelled = false;
    lastMessageIdRef.current = null;
    let inFlightAbortController = abortController;
    pollingRetryDelayRef.current = 1000;

    const wrappedLoadMessages = async (isPoll = false) => {
      if (isPoll && isPollingRef.current) return;
      if (isPoll) isPollingRef.current = true;
      if (!isPoll) setIsLoadingMessages(true);
      const callAbortController = new AbortController();
      inFlightAbortController = callAbortController;
      try {
        let url = `/api/messages?matchId=${selectedMatch.id}`;
        if (isPoll && lastMessageIdRef.current) {
          url += `&cursor=${lastMessageIdRef.current}&limit=50`;
        }
        const res = await fetchWithTimeout(url, { signal: callAbortController.signal });
        if (!res.ok) throw new Error('Failed to load messages');
        const data = await res.json();
        if (!cancelled) {
          const messageList: Message[] = data.messages ?? data;
          if (messageList.length === 0) return;
          if (isPoll && lastMessageIdRef.current) {
            for (const msg of messageList) {
              addMessage(msg);
            }
          } else {
            setMessages(messageList);
          }
          lastMessageIdRef.current = messageList[messageList.length - 1]!.id;
          const currentUserId = currentUserRef.current?.id;
          const unreadIds = messageList
            .filter((m: Message) => m.senderId !== currentUserId && !m.read)
            .map((m: Message) => m.id);
          if (unreadIds.length > 0) {
            try {
              const markRes = await fetchWithCSRF('/api/messages/mark-read', { messageIds: unreadIds });
              if (!markRes.ok) throw new Error('Failed to mark as read');
              markMessagesAsRead(unreadIds);
            } catch (error) {
              appLogger.error('chat-view.markRead', 'Failed to mark messages as read', error);
              toast.error(t('chat.markReadError'));
            }
          }
        }
        // Reset retry delay on success
        pollingRetryDelayRef.current = 1000;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        if (!cancelled) appLogger.error('chat-view.loadMessages', 'Failed to load messages', error);
      } finally {
        if (isPoll) isPollingRef.current = false;
        if (!isPoll) setIsLoadingMessages(false);
      }
    };

    wrappedLoadMessages(false);

    // Set up polling for real-time updates — incremental fetch with auto-retry
    pollingIntervalRef.current = setInterval(async () => {
      const currentMatchId = selectedMatchIdRef.current;
      if (currentMatchId && hasFocusRef.current) {
        await wrappedLoadMessages(true);
        // Also check if partner is typing
        await checkPartnerTyping(currentMatchId);
        pollingRetryDelayRef.current = 1000;
      } else if (currentMatchId && !hasFocusRef.current) {
        // Even without focus, check typing status for badge updates
        await checkPartnerTyping(currentMatchId);
      }
    }, 5000);

    return () => {
      cancelled = true;
      inFlightAbortController.abort();
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (typingSignalTimerRef.current) clearTimeout(typingSignalTimerRef.current);
    };
    // selectedMatch is used as a guard — only the stable .id is needed for re-trigger
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch?.id, checkPartnerTyping]);

  // Track window focus to control polling
  useEffect(() => {
    const onFocus = () => { hasFocusRef.current = true; };
    const onBlur = () => { hasFocusRef.current = false; };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Detect new messages and update badge
  const messagesLength = messages.length;
  useEffect(() => {
    if (!hasFocusRef.current && messagesLength > lastMessageCountRef.current) {
      setNewMessageCount((prev) => prev + (messagesLength - lastMessageCountRef.current));
    }
    lastMessageCountRef.current = messagesLength;
  }, [messagesLength]);

  // Scroll to bottom on new messages, but only if already near bottom
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (isNearBottom || partnerTyping) {
        scrollRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages, partnerTyping]);

  const selectedMatchRef = useRef<MatchWithUsers | null>(null);
  selectedMatchRef.current = selectedMatch;

  // Auto-reply simulation — only triggers when the *latest* message is from current user
  const lastMessage = messages.length > 0 ? messages[messages.length - 1]! : null;
  const lastMessageRef = useRef<Message | null>(null);
  lastMessageRef.current = lastMessage ?? null;

  useEffect(() => {
    if (!lastMessage || !selectedMatchRef.current || !currentUserRef.current || !IS_DEMO_MODE) return;
    if (lastMessage.senderId !== currentUserRef.current.id) return;

    const replyDelay = AUTO_REPLY.MIN_DELAY + Math.random() * (AUTO_REPLY.MAX_DELAY - AUTO_REPLY.MIN_DELAY);
    const typingDelay = AUTO_REPLY.TYPING_MIN + Math.random() * (AUTO_REPLY.TYPING_MAX - AUTO_REPLY.TYPING_MIN);

    const matchId = selectedMatchRef.current.id;
    const senderId = currentUserRef.current.id;
    autoReplyTimerRef.current = setTimeout(() => {
      // Verify the message is still the latest (user didn't switch chats)
      const currentLast = lastMessageRef.current;
      if (!currentLast || currentLast.id !== lastMessage.id || currentLast.senderId !== senderId) return;

      setPartnerTyping(true);
      innerTimerRef.current = setTimeout(async () => {
        setPartnerTyping(false);
        try {
          const res = await fetchWithCSRF('/api/messages/auto-reply', { matchId });
          if (res.ok) {
            const msg = await res.json();
            if (msg) addMessage(msg);
          }
        } catch (error) {
          appLogger.error('chat-view.autoReply', 'Failed to send auto-reply', error);
        }
      }, replyDelay - typingDelay);
    }, typingDelay);
    return () => {
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
      if (innerTimerRef.current) clearTimeout(innerTimerRef.current);
    };
    // Intentionally not including lastMessage, selectedMatch, currentUser here —
    // we only want to trigger a new auto-reply cycle when the message ID changes.
    // Stable values are captured via refs inside the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMessage?.id, addMessage]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || !currentUser || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    // Clear new message badge when user sends a message
    setNewMessageCount(0);

    try {
      const res = await fetchWithCSRF('/api/messages', { matchId: selectedMatch.id, content });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      const msg = await res.json();
      if (msg.id) addMessage(msg);
    } catch (error) {
      appLogger.error('chat-view.sendMessage', 'Failed to send message', error);
      toast.error(t('chat.sendError'), { description: t('chat.sendRetry') });
      setNewMessage(content);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const lang = useAppStore.getState().language || 'ru';
    return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const lang = useAppStore.getState().language || 'ru';
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return t('chat.today');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return t('chat.yesterday');
    return date.toLocaleDateString(lang, { day: 'numeric', month: 'long' });
  };

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return messages;
    const q = messageSearch.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  // Group messages by date
  const messageGroups = useMemo(() => {
    const target = filteredMessages;
    const groups: { date: string; messages: Message[] }[] = [];
    let lastDate = '';
    for (const msg of target) {
      const dateStr = new Date(msg.createdAt).toDateString();
      if (dateStr !== lastDate) {
        groups.push({ date: msg.createdAt, messages: [msg] });
        lastDate = dateStr;
      } else {
        groups[groups.length - 1]!.messages.push(msg);
      }
    }
    return groups;
  }, [filteredMessages]);

  // Reset new message badge when chat becomes visible
  useEffect(() => {
    if (selectedMatch) {
      setNewMessageCount(0);
    }
  }, [selectedMatch]);

  if (!selectedMatch || !partner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <MessageCircle className="w-16 h-16 text-rose-200 dark:text-rose-800 mb-4" />
        <p className="text-muted-foreground">{t('chat.selectMatch')}</p>
        <Button onClick={() => navigateTo('matches')} variant="outline" className="mt-4 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">{t('chat.goToMatches')}</Button>
      </div>
    );
  }

  const isPartnerOnline = onlineUserIds.includes(partner.id);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-3 md:p-4 border-b border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => navigateTo('matches')} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/30 md:hidden">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-10 w-10 border-2 border-rose-200 dark:border-rose-800">
            <AvatarImage src={partner.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={partner.name} />
            <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300">{partner.name[0]}</AvatarFallback>
          </Avatar>
          <OnlineIndicator userId={partner.id} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-rose-800 dark:text-rose-200 truncate">{partner.name}, {partner.age}</h3>
            {newMessageCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
              >
                {newMessageCount > 9 ? '9+' : newMessageCount}
              </motion.span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{partnerTyping ? (
            <span className="text-rose-500 font-medium">{t('chat.typing')}</span>
          ) : isPartnerOnline ? (
            <span className="text-green-500">{t('chat.online')}</span>
          ) : (partner.city || t('chat.offline'))}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateTo('matches')} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 hidden md:flex">
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Message search */}
      <div className="px-4 pt-2 pb-0">
        <div className="relative">
          <Input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            placeholder={t('chat.searchPlaceholder')}
            className="w-full border-rose-200 dark:border-rose-800 focus:border-rose-400 rounded-full px-4 py-1.5 text-xs h-8 bg-rose-50/50 dark:bg-rose-900/20"
          />
          {messageSearch && (
            <button
              onClick={() => setMessageSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-rose-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar gradient-bg">
        {/* Match notification */}
        <div className="flex justify-center">
          <div className="bg-card rounded-full px-4 py-1.5 shadow-sm text-xs text-muted-foreground border border-rose-100 dark:border-rose-900/50">
            {t('chat.matchNotification')}
          </div>
        </div>

        {messageSearch && filteredMessages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-10 h-10 text-rose-300 mb-3" />
            <p className="text-muted-foreground text-sm">{t('chat.searchNoResults')}</p>
          </div>
        )}
        {!messageSearch && messages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-10 h-10 text-rose-300 mb-3" />
            <p className="text-muted-foreground text-sm">{t('chat.startConversation')}</p>
          </div>
        )}

        {isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-muted-foreground text-sm">
              {t('chat.loading')}
            </motion.div>
          </div>
        )}

        {messageGroups.map((group) => (
          <Fragment key={group.date}>
            {/* Date separator */}
            <div className="flex justify-center">
              <span className="bg-card/80 dark:bg-card text-xs text-muted-foreground px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">
                {formatDate(group.date)}
              </span>
            </div>
            {group.messages.map((msg) => {
              const isMine = msg.senderId === currentUser?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start items-end gap-2'}`}
                >
                  {/* Avatar on received */}
                  {!isMine && (
                    <div className="flex-shrink-0">
                      <Avatar className="h-7 w-7 border border-rose-200 dark:border-rose-800">
                        <AvatarImage src={partner.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default'} alt={partner.name} />
                        <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 text-[10px]">{partner.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  <div className={`max-w-[80%] md:max-w-[60%] ${isMine ? 'order-1' : ''}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMine
                          ? 'chat-sent text-white rounded-br-md'
                          : 'chat-received rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className={`text-[10px] text-muted-foreground mt-1 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {formatTime(msg.createdAt)}
                      {isMine && (
                        <CheckCheck className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </Fragment>
        ))}

        {/* Typing indicator from partner */}
        {partnerTyping && !sending && <TypingIndicator />}

        {sending && (
          <div className="flex justify-end">
            <div className="chat-sent text-white px-4 py-2.5 rounded-2xl rounded-br-md">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: ANIMATION.SENDING_DOTS_DURATION, repeat: Infinity }} className="text-sm">...</motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-3 md:p-4 border-t border-rose-100 dark:border-rose-900/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Debounced typing signal
                if (selectedMatchIdRef.current && e.target.value) {
                  if (typingSignalTimerRef.current) clearTimeout(typingSignalTimerRef.current);
                  typingSignalTimerRef.current = setTimeout(() => {
                    if (selectedMatchIdRef.current) signalTyping(selectedMatchIdRef.current);
                  }, 500);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              className="flex-1 border-rose-200 dark:border-rose-800 focus:border-rose-400 rounded-full px-4 py-5 bg-rose-50/50 dark:bg-rose-900/20"
            />
          <EmojiPicker onSelect={handleEmojiSelect} />
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-md disabled:opacity-40 flex-shrink-0"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
