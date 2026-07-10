'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Heart, MessageCircle, Plus, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Skeleton from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchWithCSRF, patchWithCSRF, fetchWithTimeout } from '@/lib/api';
import { useAppStore, type Moment } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { OnlineIndicator } from './shared';
import { logger } from '@/lib/logger';
import { MOMENTS as MOMENTS_CONST, ANIMATION, AVATAR_BASE_URL, REACTION_EMOJIS } from '@/lib/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { StoryViewer } from './story-viewer';
import { timeAgo, getUniqueUsersFromMoments } from './moments-utils';

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

const RING_GRADIENTS = [
  'from-rose-500 via-pink-500 to-fuchsia-500',
  'from-violet-500 via-purple-500 to-indigo-500',
  'from-amber-500 via-orange-500 to-red-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-blue-500 via-cyan-500 to-teal-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
];

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
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_PRESETS[0]!);
  const remaining = MOMENTS_CONST.CHARACTER_LIMIT - text.length;
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), selectedGradient);
    setText('');
    setSelectedGradient(GRADIENT_PRESETS[0]!);
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
            {t('moments.newMoment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Gradient preview */}
          <div className="relative h-40 rounded-xl overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedGradient}`} />
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-white text-center font-bold text-lg drop-shadow-lg">
                {text || t('moments.textPreview')}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => {
                if (e.target.value.length <= MOMENTS_CONST.CHARACTER_LIMIT) {
                  setText(e.target.value);
                }
              }}
              placeholder={t('moments.shareThoughts')}
              className="min-h-[100px] resize-none border-rose-200 dark:border-rose-800 focus-visible:ring-rose-300 dark:focus-visible:ring-rose-700 rounded-xl text-sm"
            />
            <p className={`text-xs text-right ${remaining < MOMENTS_CONST.CHARACTER_WARN_THRESHOLD ? 'text-red-500' : 'text-muted-foreground'}`}>
              {remaining} / {MOMENTS_CONST.CHARACTER_LIMIT}
            </p>
          </div>

          {/* Gradient presets */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{t('moments.chooseBackground')}</p>
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
            {t('moments.post')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden border-rose-100 dark:border-rose-900/50 bg-card rounded-2xl shadow-md hover:shadow-lg transition-shadow">
      {/* User info */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <Avatar className="h-9 w-9 border border-rose-200 dark:border-rose-800">
            <AvatarImage src={moment.userAvatar} alt={moment.userName} />
            <AvatarFallback className="bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300 text-sm">
              {moment.userName?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
          <OnlineIndicator userId={moment.userId} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-rose-800 dark:text-rose-200 truncate">{moment.userName}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{timeAgo(moment.createdAt, t)}</span>
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
            {moment.comments.slice(0, MOMENTS_CONST.PREVIEW_COMMENTS).map((comment) => (
              <p key={comment.id} className="text-xs text-muted-foreground">
                <span className="font-semibold text-rose-700 dark:text-rose-300">{comment.userName}</span>{' '}
                {comment.content}
              </p>
            ))}
            {moment.comments.length > MOMENTS_CONST.PREVIEW_COMMENTS && (
              <p className="text-xs text-rose-500 font-medium cursor-pointer hover:underline">
                {t('moments.viewAllComments', { count: moment.comments.length })}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

const MemoizedMomentFeedCard = memo(MomentFeedCard);

export function MomentsView() {
  const { currentUser, moments: storeMoments, setMoments: setStoreMoments, addMoment: addStoreMoment } = useAppStore(
    useShallow((s) => ({
      currentUser: s.currentUser,
      moments: s.moments,
      setMoments: s.setMoments,
      addMoment: s.addMoment,
    }))
  );
  const { t } = useTranslation();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryUserId, setSelectedStoryUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [likedMomentIds, setLikedMomentIds] = useState<Set<string>>(new Set());
  const myReactionsRef = useRef<Set<string>>(new Set());

  // Fetch moments from API — fall back to store data if already hydrated
  useEffect(() => {
    if (storeMoments.length > 0) {
      setMoments(storeMoments);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchWithTimeout('/api/moments');
        const { data } = await r.json();
        if (!cancelled && data) {
          setMoments(data);
          setStoreMoments(data);
          // Initialize reaction/like state from server
          const liked = new Set<string>();
          const reacted = new Set<string>();
          for (const m of data as Array<Moment & { userLiked?: boolean; userReactions?: string[] }>) {
            if (m.userLiked) liked.add(m.id);
            if (m.userReactions) {
              for (const emoji of m.userReactions) {
                reacted.add(`${m.id}:${emoji}`);
              }
            }
          }
          setLikedMomentIds(liked);
          myReactionsRef.current = reacted;
        }
      } catch (error) {
        logger.error('moments-view.fetch', 'Failed to fetch moments', error);
        if (!cancelled) setMoments([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeMoments, setStoreMoments]);

  // Unique users for stories row
  const storyUsers = getUniqueUsersFromMoments(moments);

  const openStory = (userId: string) => {
    const userMoments = moments.filter((m) => m.userId === userId);
    if (userMoments.length === 0) return;
    setSelectedStoryUserId(userId);
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
          userAvatar: currentUser.avatar || `${AVATAR_BASE_URL}?seed=Default`,
          content: data.content,
          gradient: data.gradient,
          createdAt: data.createdAt,
          likes: data.likes,
          comments: [],
          reactions: {},
          userLiked: false,
          userReactions: [],
        };
        setMoments((prev) => [newMoment, ...prev]);
        addStoreMoment(newMoment);
        toast.success(t('moments.published'));
      }
    } catch (error) {
      logger.error('moments-view.create', 'Failed to create moment', error);
      toast.error(t('moments.publishError'));
    }
  };

  const toggleFeedLike = async (momentId: string) => {
    const wasAdding = !likedMomentIds.has(momentId);
    setLikedMomentIds((prev) => {
      const next = new Set(prev);
      if (wasAdding) next.add(momentId);
      else next.delete(momentId);
      return next;
    });
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        return { ...m, likes: m.likes + (wasAdding ? 1 : -1) };
      })
    );
    try {
      const res = await patchWithCSRF('/api/moments', { id: momentId, action: 'like' });
      if (res.ok) {
        const body = await res.json();
        const serverLiked = body?.data?.liked === true;
        setLikedMomentIds((prev) => {
          const next = new Set(prev);
          if (serverLiked) next.add(momentId);
          else next.delete(momentId);
          return next;
        });
        setMoments((prev) =>
          prev.map((m) => {
            if (m.id !== momentId) return m;
            return { ...m, likes: body.data.likes };
          })
        );
      }
    } catch (error) {
      logger.error('moments-view.toggleLike', 'Failed to toggle like on moment', error);
      setLikedMomentIds((prev) => {
        const next = new Set(prev);
        if (wasAdding) next.delete(momentId);
        else next.add(momentId);
        return next;
      });
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          return { ...m, likes: m.likes + (wasAdding ? -1 : 1) };
        })
      );
    }
  };

  const handleFeedReaction = async (momentId: string, emoji: string) => {
    const key = `${momentId}:${emoji}`;
    let wasAdding = false;
    {
      const next = new Set(myReactionsRef.current);
      wasAdding = !next.has(key);
      if (wasAdding) next.add(key);
      else next.delete(key);
      myReactionsRef.current = next;
    }
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        const currentCount = m.reactions[emoji] || 0;
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: currentCount + (wasAdding ? 1 : -1),
          },
        };
      })
    );
    try {
      const res = await patchWithCSRF('/api/moments', { id: momentId, action: 'react', emoji });
      if (res.ok) {
        const body = await res.json();
        const wasRemoved = body?.data?.removed === true;
        if (wasRemoved !== wasAdding) {
          // Server toggled the opposite direction — reconcile
          {
            const next = new Set(myReactionsRef.current);
            if (wasRemoved) next.delete(key);
            else next.add(key);
            myReactionsRef.current = next;
          }
          setMoments((prev) =>
            prev.map((m) => {
              if (m.id !== momentId) return m;
              const currentCount = m.reactions[emoji] || 0;
              return {
                ...m,
                reactions: {
                  ...m.reactions,
                  [emoji]: currentCount + (wasRemoved ? -1 : 1),
                },
              };
            })
          );
        }
      }
    } catch (error) {
      logger.error('moments-view.feedReaction', 'Failed to sync feed reaction', error);
      {
        const next = new Set(myReactionsRef.current);
        if (wasAdding) next.delete(key);
        else next.add(key);
        myReactionsRef.current = next;
      }
      setMoments((prev) =>
        prev.map((m) => {
          if (m.id !== momentId) return m;
          const currentCount = m.reactions[emoji] || 0;
          return {
            ...m,
            reactions: {
              ...m.reactions,
              [emoji]: currentCount + (wasAdding ? -1 : 1),
            },
          };
        })
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="px-4 pt-4 pb-2 md:pt-6 md:pb-3">
          <Skeleton className="h-7 w-40 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="px-4 mb-4">
          <div className="flex items-center gap-3 overflow-hidden pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                <Skeleton className="w-16 h-16 md:w-[68px] md:h-[68px] rounded-full" />
                <Skeleton className="w-12 h-3 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Heart className="w-16 h-16 text-rose-200 dark:text-rose-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-400 mb-2">{t('moments.emptyTitle')}</h2>
          <p className="text-muted-foreground text-sm mb-4">
            {t('moments.emptyDesc')}
          </p>
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('moments.createMoment')}
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

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 md:pt-6 md:pb-3">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-300">{t('moments.title')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('moments.subtitle')}</p>
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
              {t('moments.create')}
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
                          {user.name?.[0] ?? '?'}
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
          {t('moments.feedTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {moments.map((moment, idx) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * ANIMATION.STAGGER_FAST, duration: ANIMATION.FEED_CARD_DURATION }}
              >
                <MemoizedMomentFeedCard
                  moment={moment}
                  liked={likedMomentIds.has(moment.id)}
                  likeCount={moment.likes}
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

      {/* Full-screen Story Viewer — only shows selected user's moments */}
      <AnimatePresence>
        {showStoryViewer && selectedStoryUserId && (
          <StoryViewer
            moments={moments.filter((m) => m.userId === selectedStoryUserId)}
            startIndex={0}
            onClose={() => { setShowStoryViewer(false); setSelectedStoryUserId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
