'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { patchWithCSRF } from '@/lib/api';
import { type Moment, type MomentComment } from '@/lib/store';
import { OnlineIndicator } from './shared';
import { logger } from '@/lib/logger';
import { MOMENTS as MOMENTS_CONST, ANIMATION, REACTION_EMOJIS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { timeAgo } from './moments-utils';

export function StoryViewer({
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
  const onCloseRef = useRef(onClose);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const currentMoment = localMoments[currentIndex]!;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let currentProgress = 0;
    timerRef.current = setInterval(() => {
      currentProgress += MOMENTS_CONST.STORY_PROGRESS_TICK;
      if (currentProgress >= MOMENTS_CONST.STORY_PROGRESS_MAX) {
        if (currentIndex < localMoments.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onCloseRef.current();
        }
        return;
      }
      setProgress(currentProgress);
    }, MOMENTS_CONST.STORY_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, localMoments.length]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]!.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0]!.clientY - dragStartY.current;
    if (diff > MOMENTS_CONST.STORY_SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
  };

  const toggleLike = async () => {
    const wasLiked = likedMoments.has(currentMoment.id);
    setLikedMoments((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(currentMoment.id);
      else next.add(currentMoment.id);
      return next;
    });
    try {
      const res = await patchWithCSRF('/api/moments', { id: currentMoment.id, action: 'like' });
      if (res.ok) {
        const body = await res.json();
        const serverLiked = body?.data?.liked === true;
        setLikedMoments((prev) => {
          const next = new Set(prev);
          if (serverLiked) next.add(currentMoment.id);
          else next.delete(currentMoment.id);
          return next;
        });
        setLocalMoments((prev) =>
          prev.map((m) => {
            if (m.id !== currentMoment.id) return m;
            return { ...m, likes: body.data.likes };
          })
        );
      }
    } catch {
      setLikedMoments((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(currentMoment.id);
        else next.delete(currentMoment.id);
        return next;
      });
    }
  };

  const handleReaction = async (emoji: string) => {
    setLocalMoments((prev) =>
      prev.map((m) => {
        if (m.id !== currentMoment.id) return m;
        return {
          ...m,
          reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] || 0) + 1 },
        };
      })
    );
    try {
      const res = await patchWithCSRF('/api/moments', { id: currentMoment.id, action: 'react', emoji });
      if (res.ok) {
        const body = await res.json();
        const wasRemoved = body?.data?.removed === true;
        if (wasRemoved) {
          setLocalMoments((prev) =>
            prev.map((m) => {
              if (m.id !== currentMoment.id) return m;
              return { ...m, reactions: { ...m.reactions, [emoji]: Math.max((m.reactions[emoji] || 0) - 1, 0) } };
            })
          );
          toast.success(t('moments.reactionRemoved', { emoji }));
        } else {
          toast.success(t('moments.reactionAdded', { emoji }));
        }
      }
    } catch (error) {
      logger.error('story-viewer.syncReaction', 'Failed to sync reaction', error);
      toast.error(t('moments.reactionError'));
      setLocalMoments((prev) =>
        prev.map((m) => {
          if (m.id !== currentMoment.id) return m;
          return { ...m, reactions: { ...m.reactions, [emoji]: Math.max((m.reactions[emoji] || 0) - 1, 0) } };
        })
      );
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    const content = commentText.trim();
    const newComment: MomentComment = {
      id: `new-c-${Date.now()}`,
      userId: 'current-user',
      userName: t('moments.you'),
      content,
      createdAt: new Date().toISOString(),
    };

    setLocalMoments((prev) =>
      prev.map((m) => {
        if (m.id !== currentMoment.id) return m;
        return { ...m, comments: [...m.comments, newComment] };
      })
    );
    setCommentText('');

    patchWithCSRF('/api/moments', { id: currentMoment.id, action: 'comment', content }).then(() => {
      toast.success(t('moments.commentAdded'));
    }).catch((error) => {
      logger.error('story-viewer.syncComment', 'Failed to sync comment', error);
      toast.error(t('moments.commentError'));
      setLocalMoments((prev) =>
        prev.map((m) => {
          if (m.id !== currentMoment.id) return m;
          return { ...m, comments: m.comments.filter((c) => c.id !== newComment.id) };
        })
      );
    });
  };

  if (!currentMoment) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: ANIMATION.STORY_OVERLAY_DURATION }}
      className="fixed inset-0 z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${currentMoment.gradient}`} />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex flex-col h-full">
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

        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-white/80">
                <AvatarImage src={currentMoment.userAvatar} alt={currentMoment.userName} />
                <AvatarFallback className="bg-white/30 text-white text-sm font-semibold">
                  {currentMoment.userName?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <OnlineIndicator userId={currentMoment.userId} size="sm" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm drop-shadow-md">{currentMoment.userName}</p>
              <p className="text-white/70 text-xs">{timeAgo(currentMoment.createdAt, t)}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label={t('moments.closeStory')}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6" onClick={handleTap}>
          <motion.p
            key={currentMoment.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: ANIMATION.STORY_TEXT_DURATION, ease: 'easeOut' }}
            className="text-white text-center text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed drop-shadow-lg max-w-md"
          >
            {currentMoment.content}
          </motion.p>
        </div>

        <div className="px-4 pb-6 pt-4">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: ANIMATION.STORY_HINT_DELAY, duration: ANIMATION.STORY_HINT_DURATION }}
            className="text-center text-white/50 text-xs mb-3"
          >
            {t('moments.swipeHint')}
          </motion.p>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
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
                  {currentMoment.likes}
                </span>
              </motion.button>

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

            <div className="flex items-center gap-1 text-white/80">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{currentMoment.comments.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 relative">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                placeholder={t('moments.writeComment')}
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
