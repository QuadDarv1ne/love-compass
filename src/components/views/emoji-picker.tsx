'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { ANIMATION, EMOJI } from '@/lib/constants';

const POPULAR_EMOJIS = [
  '❤️', '🔥', '😘', '😂', '👍', '😍',
  '🥰', '✨', '😊', '🤗', '💋', '💕',
  '🌟', '😎', '🤩', '💘', '😇',
  '🎉', '💯', '🙈', '🤭', '😜', '🥂',
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 w-10 h-10 md:w-11 md:h-11 rounded-full flex-shrink-0"
        aria-label={t('chat.openEmojiPicker')}
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
