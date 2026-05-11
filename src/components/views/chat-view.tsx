'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, ChevronLeft, Send, Sparkles, CheckCheck, Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, type Message } from '@/lib/store';
import { OnlineIndicator, TypingIndicator } from './shared';

// ─── Auto Reply Phrases ──────────────────────────────────────────────────────
const AUTO_REPLIES = [
  'Привет! Как дела? 😊',
  'Очень приятно познакомиться!',
  'Расскажи о себе больше!',
  'Ты тоже из России? Класс!',
  'Какие у тебя интересы?',
  'Любишь путешествовать? ✈️',
  'Давно здесь зарегистрирован(а)?',
  'У тебя очень красивое фото! 💕',
  'Чем занимаешься в свободное время?',
  'Давай встретимся! ☕',
  'Какой твой любимый фильм?',
  'Обожаю музыку! Что слушаешь?',
  'Ты кажешься очень интересным человеком!',
  'Привет! Рад(а) нашему мэтчу!',
  'Мечтаю посетить Японию 🗼',
  'Кошки или собаки? 🐱🐶',
  'Давно искал(а) такую компанию!',
  'У нас так много общего!',
  'Какое у тебя самое яркое воспоминание?',
  'Мне нравится твой стиль! 🔥',
];

// ─── Popular Emojis ──────────────────────────────────────────────────────────
const POPULAR_EMOJIS = [
  '❤️', '🔥', '😘', '😂', '👍', '😍',
  '🥰', '✨', '😊', '🤗', '💋', '💕',
  '😘', '🌟', '😎', '🤩', ' Cupid 💘', '😇',
  ' 🎉', '💯', '🙈', '🤭', '😜', '🥂',
];

// Clean up emojis (some have leading spaces due to editing)
const EMOJI_LIST = POPULAR_EMOJIS.map(e => e.trim()).filter(e => e.length > 0 && e.length <= 4);

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
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 right-0 bg-card border border-rose-200 dark:border-rose-800 rounded-2xl shadow-xl p-3 z-20"
          >
            <div className="emoji-picker-grid grid grid-cols-6 gap-1">
              {EMOJI_LIST.map((emoji) => (
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
  const { selectedMatch, currentUser, messages, setMessages, addMessage, navigateTo, onlineUserIds } = useAppStore();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoReplyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const partner = selectedMatch
    ? selectedMatch.user1.id === currentUser?.id ? selectedMatch.user2 : selectedMatch.user1
    : null;

  useEffect(() => {
    if (!selectedMatch) return;
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/messages?matchId=${selectedMatch.id}`);
        const data = await res.json();
        setMessages(data);
      } catch { console.error('Failed to load messages'); }
    };
    loadMessages();
    // Cleanup auto-reply timer on match change
    if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    return () => { if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current); };
  }, [selectedMatch, setMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partnerTyping]);

  // Auto-reply simulation
  useEffect(() => {
    if (messages.length === 0 || !selectedMatch || !currentUser) return;
    const lastMsg = messages[messages.length - 1];
    // Only simulate reply if the last message is from current user and there's an odd number of messages
    if (lastMsg.senderId === currentUser.id) {
      const replyDelay = 1500 + Math.random() * 2500; // 1.5-4 seconds
      // Show partner typing after 1 second
      const typingDelay = 800 + Math.random() * 700;
      autoReplyTimerRef.current = setTimeout(() => {
        setPartnerTyping(true);
        // Send reply after typing
        setTimeout(async () => {
          setPartnerTyping(false);
          const replyText = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
          try {
            const partnerId = selectedMatch.user1.id === currentUser.id ? selectedMatch.user2.id : selectedMatch.user1.id;
            const res = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ matchId: selectedMatch.id, senderId: partnerId, content: replyText }),
            });
            const msg = await res.json();
            if (msg.id) addMessage(msg);
          } catch { /* silent */ }
        }, replyDelay - typingDelay);
      }, typingDelay);
    }
    return () => {
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    };
  }, [messages.length > 0 ? messages[messages.length - 1]?.id : null]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || !currentUser || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatch.id, senderId: currentUser.id, content }),
      });
      const msg = await res.json();
      if (msg.id) addMessage(msg);
    } catch { console.error('Failed to send message'); }
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
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateStr = new Date(msg.createdAt).toDateString();
      if (dateStr !== lastDate) {
        groups.push({ date: msg.createdAt, messages: [msg] });
        lastDate = dateStr;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [messages]);

  if (!selectedMatch || !partner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <MessageCircle className="w-16 h-16 text-rose-200 dark:text-rose-800 mb-4" />
        <p className="text-muted-foreground">Выберите мэтч для начала чата</p>
        <Button onClick={() => navigateTo('matches')} variant="outline" className="mt-4 border-rose-200 dark:border-rose-800 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">К мэтчам</Button>
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
            <AvatarImage src={partner.avatar || '/avatar-woman1.jpg'} alt={partner.name} />
            <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300">{partner.name[0]}</AvatarFallback>
          </Avatar>
          <OnlineIndicator userId={partner.id} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-rose-800 dark:text-rose-200 truncate">{partner.name}, {partner.age}</h3>
          <p className="text-xs text-muted-foreground">{partnerTyping ? (
            <span className="text-rose-500 font-medium">печатает...</span>
          ) : isPartnerOnline ? (
            <span className="text-green-500">Онлайн</span>
          ) : (partner.city || 'Оффлайн')}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateTo('matches')} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 hidden md:flex">
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar gradient-bg">
        {/* Match notification */}
        <div className="flex justify-center">
          <div className="bg-card rounded-full px-4 py-1.5 shadow-sm text-xs text-muted-foreground border border-rose-100 dark:border-rose-900/50">
            💕 Вы понравились друг другу
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="w-10 h-10 text-rose-300 mb-3" />
            <p className="text-muted-foreground text-sm">Начните разговор! Скажите что-нибудь приятное 💬</p>
          </div>
        )}

        {messageGroups.map((group) => (
          <React.Fragment key={group.date}>
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
                        <AvatarImage src={partner.avatar || '/avatar-woman1.jpg'} alt={partner.name} />
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
          </React.Fragment>
        ))}

        {/* Typing indicator from partner */}
        {partnerTyping && !sending && <TypingIndicator />}

        {sending && (
          <div className="flex justify-end">
            <div className="chat-sent text-white px-4 py-2.5 rounded-2xl rounded-br-md">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-sm">...</motion.div>
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
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
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
