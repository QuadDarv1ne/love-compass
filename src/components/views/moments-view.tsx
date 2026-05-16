'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, MessageCircle, X, Plus, Send, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore, type Moment, type MomentComment } from '@/lib/store';
import { OnlineIndicator } from './shared';
import { fetchWithCSRF, patchWithCSRF } from '@/lib/api';

// ─── Gradient Presets ────────────────────────────────────────────────────────
const GRADIENT_PRESETS = [
  'from-rose-400 to-pink-500',
  'from-purple-400 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-cyan-500',
  'from-fuchsia-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-red-400 to-rose-500',
];

// ─── Story Ring Gradients ────────────────────────────────────────────────────
const RING_GRADIENTS = [
  'from-rose-500 via-pink-500 to-fuchsia-500',
  'from-violet-500 via-purple-500 to-indigo-500',
  'from-amber-500 via-orange-500 to-red-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
];

// ─── Reaction Emojis ─────────────────────────────────────────────────────────
const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😍'];

// ─── Seed Data ───────────────────────────────────────────────────────────────
const _SEED_MOMENTS: Moment[] = [
  {
    id: 'moment-1',
    userId: 'story-user-1',
    userName: 'Анна',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Anastasia',
    content: 'Сегодня прекрасный день для новых знакомств! ☀️',
    gradient: 'from-rose-400 to-pink-500',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    likes: 24,
    comments: [
      { id: 'c1', userId: 'u1', userName: 'Мария', content: 'Прекрасный день!', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
      { id: 'c2', userId: 'u2', userName: 'Дмитрий', content: 'Полностью согласен 😊', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 12, '🔥': 5, '😂': 3, '😍': 4 },
  },
  {
    id: 'moment-2',
    userId: 'story-user-2',
    userName: 'Дмитрий',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Dmitry',
    content: 'Люблю закаты на берегу моря... 🌅',
    gradient: 'from-purple-400 to-indigo-500',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    likes: 38,
    comments: [
      { id: 'c3', userId: 'u3', userName: 'Елена', content: 'Какая красота!', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 20, '🔥': 10, '😂': 2, '😍': 6 },
  },
  {
    id: 'moment-3',
    userId: 'story-user-3',
    userName: 'Мария',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Maria',
    content: 'Кофе и хорошая книга — идеальное утро ☕📖',
    gradient: 'from-amber-400 to-orange-500',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    likes: 15,
    comments: [],
    reactions: { '❤️': 8, '🔥': 3, '😂': 1, '😍': 3 },
  },
  {
    id: 'moment-4',
    userId: 'story-user-4',
    userName: 'Алексей',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Maxim',
    content: 'Путешествие всей мечты сбылось! ✈️🏔️',
    gradient: 'from-emerald-400 to-teal-500',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    likes: 52,
    comments: [
      { id: 'c4', userId: 'u4', userName: 'Ольга', content: 'Завидую белой завистью!', createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      { id: 'c5', userId: 'u5', userName: 'Иван', content: 'Куда летел?', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
      { id: 'c6', userId: 'u6', userName: 'Наталья', content: 'Невероятно!', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 30, '🔥': 15, '😍': 7 },
  },
  {
    id: 'moment-5',
    userId: 'story-user-5',
    userName: 'Елена',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ekaterina',
    content: 'Танцы до утра — лучший способ провести выходные! 💃🎉',
    gradient: 'from-fuchsia-400 to-pink-500',
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    likes: 19,
    comments: [
      { id: 'c7', userId: 'u7', userName: 'Анна', content: 'Давай на следующие выходные! 🙌', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 10, '🔥': 6, '😂': 2, '😍': 1 },
  },
  {
    id: 'moment-6',
    userId: 'story-user-1',
    userName: 'Анна',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Anastasia',
    content: 'Готовлю свой лучший десерт — тирамису! 🍰',
    gradient: 'from-violet-400 to-purple-500',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    likes: 31,
    comments: [
      { id: 'c8', userId: 'u8', userName: 'Дмитрий', content: 'Хочу попробовать!', createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 18, '🔥': 8, '😂': 1, '😍': 4 },
  },
  {
    id: 'moment-7',
    userId: 'story-user-2',
    userName: 'Дмитрий',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Dmitry',
    content: 'Первый снег — самое волшебное время года ❄️✨',
    gradient: 'from-blue-400 to-cyan-500',
    createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    likes: 44,
    comments: [
      { id: 'c9', userId: 'u9', userName: 'Мария', content: 'Обожаю снег!', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      { id: 'c10', userId: 'u10', userName: 'Елена', content: 'Давай лепить снеговика! ⛄', createdAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString() },
    ],
    reactions: { '❤️': 25, '🔥': 12, '😂': 3, '😍': 4 },
  },
  {
    id: 'moment-8',
    userId: 'story-user-3',
    userName: 'Мария',
    userAvatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Maria',
    content: 'Вечерний променад по старому городу — романтика в каждом шаге 🌃🌹',
    gradient: 'from-red-400 to-rose-500',
    createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    likes: 27,
    comments: [],
    reactions: { '❤️': 15, '🔥': 7, '😂': 2, '😍': 3 },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} д`;
}

function getUniqueUsersFromMoments(moments: Moment[]) {
  const seen = new Map<string, { id: string; name: string; avatar: string }>();
  for (const m of moments) {
    if (!seen.has(m.userId)) {
      seen.set(m.userId, { id: m.userId, name: m.userName, avatar: m.userAvatar });
    }
  }
  return Array.from(seen.values());
}

// ─── Story Viewer (Full-screen overlay) ──────────────────────────────────────
function StoryViewer({
  moments,
  startIndex,
  onClose,
}: {
  moments: Moment[];
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [likedMoments, setLikedMoments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [localMoments, setLocalMoments] = useState<Moment[]>(moments);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  const currentMoment = localMoments[currentIndex];

  // Auto-advance progress
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let currentProgress = 0;
    timerRef.current = setInterval(() => {
      currentProgress += 2;
      if (currentProgress >= 100) {
        if (currentIndex < localMoments.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onClose();
        }
        return;
      }
      setProgress(currentProgress);
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, localMoments.length, onClose]);

  const goToNext = useCallback(() => {
    if (currentIndex < localMoments.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentIndex, localMoments.length, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      goToPrev();
    } else {
      goToNext();
    }
  }, [goToNext, goToPrev]);

  // Touch handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientY - dragStartY.current;
    if (diff > 100) {
      onClose();
    }
  };

  const toggleLike = () => {
    setLikedMoments((prev) => {
      const next = new Set(prev);
      if (next.has(currentMoment.id)) {
        next.delete(currentMoment.id);
      } else {
        next.add(currentMoment.id);
      }
      return next;
    });
  };

  const handleReaction = (emoji: string) => {
    setLocalMoments((prev) =>
      prev.map((m) => {
        if (m.id !== currentMoment.id) return m;
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: (m.reactions[emoji] || 0) + 1,
          },
        };
      })
    );
    toast.success(`Реакция ${emoji} добавлена!`);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    const newComment: MomentComment = {
      id: `new-c-${Date.now()}`,
      userId: 'current-user',
      userName: 'Вы',
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setLocalMoments((prev) =>
      prev.map((m) => {
        if (m.id !== currentMoment.id) return m;
        return { ...m, comments: [...m.comments, newComment] };
      })
    );
    setCommentText('');
    toast.success('Комментарий добавлен!');
  };

  if (!currentMoment) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentMoment.gradient}`} />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-3 pb-2">
          {localMoments.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white/80">
                <AvatarImage src={currentMoment.userAvatar} alt={currentMoment.userName} />
                <AvatarFallback className="bg-white/30 text-white text-sm font-semibold">
                  {currentMoment.userName[0]}
                </AvatarFallback>
              </Avatar>
              <OnlineIndicator userId={currentMoment.userId} size="sm" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm drop-shadow-md">{currentMoment.userName}</p>
              <p className="text-white/70 text-xs">{timeAgo(currentMoment.createdAt)}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Tap area for navigation + Text content */}
        <div className="flex-1 flex items-center justify-center px-6" onClick={handleTap}>
          <motion.p
            key={currentMoment.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="text-white text-center text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed drop-shadow-lg max-w-md"
          >
            {currentMoment.content}
          </motion.p>
        </div>

        {/* Bottom bar */}
        <div className="px-4 pb-6 pt-4">
          {/* Swipe down hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center text-white/50 text-xs mb-3"
          >
            Проведите вниз или нажмите X, чтобы закрыть
          </motion.p>

          {/* Like + Reactions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Like button */}
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                className="flex items-center gap-1.5"
              >
                <Heart
                  className={`w-7 h-7 drop-shadow-md transition-colors ${
                    likedMoments.has(currentMoment.id)
                      ? 'text-red-400 fill-red-400'
                      : 'text-white'
                  }`}
                />
                <span className="text-white font-semibold text-sm drop-shadow-md">
                  {currentMoment.likes + (likedMoments.has(currentMoment.id) ? 1 : 0)}
                </span>
              </motion.button>

              {/* Reaction emojis */}
              <div className="flex items-center gap-1">
                {REACTION_EMOJIS.map((emoji) => {
                  const count = currentMoment.reactions[emoji] || 0;
                  return (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 1.4 }}
                      onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                      className="relative flex flex-col items-center"
                    >
                      <span className="text-2xl drop-shadow-md">{emoji}</span>
                      {count > 0 && (
                        <span className="absolute -bottom-1.5 text-[9px] text-white font-bold drop-shadow-md">
                          {count}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Comment count */}
            <div className="flex items-center gap-1 text-white/80">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{currentMoment.comments.length}</span>
            </div>
          </div>

          {/* Comment input */}
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 relative">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Написать комментарий..."
                className="h-10 bg-black/20 border-white/30 text-white placeholder:text-white/50 rounded-full pr-10 focus-visible:ring-white/40"
              />
              {commentText && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleComment}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create Moment Dialog ────────────────────────────────────────────────────
function CreateMomentDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string, gradient: string) => void;
}) {
  const [text, setText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]);
  const CHAR_LIMIT = 200;
  const remaining = CHAR_LIMIT - text.length;

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), selectedGradient);
    setText('');
    setSelectedGradient(GRADIENT_PRESETS[0]);
    onOpenChange(false);
  };

  // Reset on open via key-based approach — the parent passes a key
  // that changes when dialog opens, causing a remount.
  // State is initialized to empty, so no extra reset logic needed.

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-rose-700 dark:text-rose-300">
            Новый момент
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Gradient preview */}
          <div className="relative h-40 rounded-xl overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedGradient}`} />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-white text-center font-bold text-lg drop-shadow-lg">
                {text || 'Ваш текст появится здесь...'}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= CHAR_LIMIT) {
                  setText(e.target.value);
                }
              }}
              placeholder="Поделитесь своими мыслями..."
              className="min-h-[100px] resize-none border-rose-200 dark:border-rose-800 focus-visible:ring-rose-300 dark:focus-visible:ring-rose-700 rounded-xl text-sm"
            />
            <p className={`text-xs text-right ${remaining < 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {remaining} / {CHAR_LIMIT}
            </p>
          </div>

          {/* Gradient presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Выберите фон</p>
            <div className="flex items-center gap-2 flex-wrap">
              {GRADIENT_PRESETS.map((gradient) => (
                <motion.button
                  key={gradient}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} transition-all ${
                    selectedGradient === gradient
                      ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-card scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl h-11 font-semibold disabled:opacity-50"
          >
            Опубликовать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Moment Feed Card ────────────────────────────────────────────────────────
function MomentFeedCard({
  moment,
  onLike,
  onReaction,
  liked,
  likeCount,
}: {
  moment: Moment;
  onLike: () => void;
  onReaction: (emoji: string) => void;
  liked: boolean;
  likeCount: number;
}) {
  return (
    <Card className="overflow-hidden border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md hover:shadow-lg transition-shadow">
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <Avatar className="h-9 w-9 border border-rose-200 dark:border-rose-800">
            <AvatarImage src={moment.userAvatar} alt={moment.userName} />
            <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 text-sm">
              {moment.userName[0]}
            </AvatarFallback>
          </Avatar>
          <OnlineIndicator userId={moment.userId} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-rose-800 dark:text-rose-200 truncate">{moment.userName}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{timeAgo(moment.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Gradient card content */}
      <div className={`mx-4 h-32 rounded-xl bg-gradient-to-br ${moment.gradient} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <p className="text-white text-center font-bold text-sm md:text-base leading-relaxed drop-shadow-md line-clamp-3">
            {moment.content}
          </p>
        </div>
      </div>

      {/* Interactions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Like */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={onLike}
              className="flex items-center gap-1"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  liked ? 'text-red-500 fill-red-500' : 'text-rose-400 hover:text-rose-500'
                }`}
              />
              <span className={`text-sm font-medium ${liked ? 'text-red-500' : 'text-muted-foreground'}`}>
                {likeCount}
              </span>
            </motion.button>

            {/* Reactions */}
            <div className="flex items-center gap-0.5">
              {REACTION_EMOJIS.map((emoji) => {
                const count = moment.reactions[emoji] || 0;
                if (count === 0) return null;
                return (
                  <motion.button
                    key={emoji}
                    whileTap={{ scale: 1.3 }}
                    onClick={() => onReaction(emoji)}
                    className="flex items-center gap-0.5 px-1 py-0.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <span className="text-sm">{emoji}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{count}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Comment count */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-medium">{moment.comments.length}</span>
          </div>
        </div>

        {/* Comments preview */}
        {moment.comments.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-rose-50 dark:border-rose-900/30 pt-2">
            {moment.comments.slice(0, 2).map((comment) => (
              <p key={comment.id} className="text-xs text-muted-foreground">
                <span className="font-semibold text-rose-700 dark:text-rose-300">{comment.userName}</span>{' '}
                {comment.content}
              </p>
            ))}
            {moment.comments.length > 2 && (
              <p className="text-xs text-rose-500 font-medium cursor-pointer hover:underline">
                Посмотреть все комментарии ({moment.comments.length})
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Moments View ────────────────────────────────────────────────────────────
export function MomentsView() {
  const { currentUser, moments: storeMoments, setMoments: setStoreMoments, addMoment: addStoreMoment } = useAppStore();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [likedMomentIds, setLikedMomentIds] = useState<Set<string>>(new Set());

  // Fetch moments from API
  useEffect(() => {
    if (storeMoments.length > 0) return;
    let cancelled = false;
    fetch('/api/moments')
      .then((r) => r.json())
      .then(({ data }) => {
        if (!cancelled) {
          setMoments(data ?? []);
          setStoreMoments(data ?? []);
        }
      })
      .catch(() => { if (!cancelled) setMoments([]); });
    return () => { cancelled = true; };
  }, [storeMoments, setStoreMoments]);

  // Sync store moments to local state when store updates
  useEffect(() => {
    if (storeMoments.length > 0) {
      setMoments(storeMoments);
    }
  }, [storeMoments]);

  // Unique users for stories row
  const storyUsers = getUniqueUsersFromMoments(moments);

  const openStory = (userId: string) => {
    const userMoments = moments.filter((m) => m.userId === userId);
    if (userMoments.length === 0) return;
    // Find the first index in the overall moments array
    const firstIdx = moments.findIndex((m) => m.userId === userId);
    setStoryStartIndex(firstIdx);
    setShowStoryViewer(true);
  };

  const openCreateDialog = () => {
    setDialogKey((k) => k + 1);
    setCreateDialogOpen(true);
  };

  const handleCreateMoment = async (text: string, gradient: string) => {
    if (!currentUser) return;
    try {
      const res = await fetchWithCSRF('/api/moments', { content: text, gradient });
      if (res.ok) {
        const { data } = await res.json();
        const newMoment: Moment = {
          id: data.id,
          userId: data.userId,
          userName: currentUser.name,
          userAvatar: currentUser.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=Default',
          content: data.content,
          gradient: data.gradient,
          createdAt: data.createdAt,
          likes: data.likes,
          comments: [],
          reactions: {},
        };
        setMoments((prev) => [newMoment, ...prev]);
        addStoreMoment(newMoment);
        toast.success('Момент опубликован!');
      }
    } catch {
      toast.error('Не удалось опубликовать момент');
    }
  };

  const toggleFeedLike = async (momentId: string) => {
    setLikedMomentIds((prev) => {
      const next = new Set(prev);
      if (next.has(momentId)) {
        next.delete(momentId);
      } else {
        next.add(momentId);
      }
      return next;
    });
    try {
      await patchWithCSRF('/api/moments', { id: momentId, action: 'like' });
    } catch {
      setLikedMomentIds((prev) => {
        const next = new Set(prev);
        if (next.has(momentId)) next.delete(momentId);
        else next.add(momentId);
        return next;
      });
    }
  };

  const handleFeedReaction = async (momentId: string, emoji: string) => {
    let wasAdding = false;
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const currentCount = m.reactions[emoji] || 0;
        wasAdding = currentCount === 0;
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: currentCount > 0 ? currentCount - 1 : currentCount + 1,
          },
        };
      })
    );
    try {
      await patchWithCSRF('/api/moments', { id: momentId, action: 'react', emoji });
    } catch {
      // Reverse the optimistic change: if we removed, add back; if we added, remove
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const currentCount = m.reactions[emoji] || 0;
          return {
            ...m,
            reactions: {
              ...m.reactions,
              [emoji]: wasAdding ? (currentCount > 0 ? currentCount - 1 : currentCount + 1) : currentCount + 1,
            },
          };
        })
      );
    }
  };

  // ─── Empty State ──────────────────────────────────────────────────────────
  if (moments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Heart className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">Пока нет моментов</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Будьте первым, кто поделится своим моментом!
          </p>
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать момент
          </Button>
        </motion.div>

        <CreateMomentDialog
          key={dialogKey}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreateMoment}
        />
      </div>
    );
  }

  // ─── Main View ────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 md:pt-6 md:pb-3">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300">Моменты</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Истории и впечатления пользователей</p>
      </div>

      {/* Stories Row */}
      <div className="px-4 mb-4 md:mb-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {/* Add moment button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreateDialog}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div className="w-16 h-16 md:w-[68px] md:h-[68px] rounded-full border-2 border-dashed border-rose-300 dark:border-rose-700 flex items-center justify-center bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
              <Plus className="w-6 h-6 text-rose-400" />
            </div>
            <span className="text-[10px] md:text-xs text-rose-500 font-medium w-16 md:w-[68px] text-center truncate">
              Создать
            </span>
          </motion.button>

          {/* Story avatars */}
          {storyUsers.map((user, idx) => {
            const ringGradient = RING_GRADIENTS[idx % RING_GRADIENTS.length];
            const userMoments = moments.filter((m) => m.userId === user.id);
            return (
              <motion.button
                key={user.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openStory(user.id)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                <div className="relative">
                  {/* Gradient ring */}
                  <div className={`w-[68px] h-[68px] md:w-[72px] md:h-[72px] rounded-full p-[3px] bg-gradient-to-br ${ringGradient}`}>
                    <div className="w-full h-full rounded-full p-[2px] bg-card">
                      <Avatar className="w-full h-full border-0">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 font-bold text-lg">
                          {user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <OnlineIndicator userId={user.id} size="sm" />
                  {/* Moment count badge */}
                  {userMoments.length > 1 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] border-0 px-1 flex items-center justify-center rounded-full">
                      {userMoments.length}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground w-16 md:w-[72px] text-center truncate">
                  {user.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Feed Grid */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Лента моментов
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {moments.map((moment, idx) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
              >
                <MomentFeedCard
                  moment={moment}
                  liked={likedMomentIds.has(moment.id)}
                  likeCount={moment.likes + (likedMomentIds.has(moment.id) ? 1 : 0)}
                  onLike={() => toggleFeedLike(moment.id)}
                  onReaction={(emoji) => handleFeedReaction(moment.id, emoji)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Moment Dialog */}
      <CreateMomentDialog
        key={`main-${dialogKey}`}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateMoment}
      />

      {/* Full-screen Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && (
          <StoryViewer
            moments={moments}
            startIndex={storyStartIndex}
            onClose={() => setShowStoryViewer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
