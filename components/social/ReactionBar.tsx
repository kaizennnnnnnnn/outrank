'use client';

import { motion } from 'framer-motion';
import { ReactionEmoji } from '@/types/feed';
import { cn } from '@/lib/utils';

const REACTIONS: ReactionEmoji[] = ['🔥', '💪', '👏', '⚡', '🤝'];

interface ReactionBarProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onReact: (emoji: string) => void;
}

export function ReactionBar({ reactions, currentUserId, onReact }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1.5">
      {REACTIONS.map((emoji) => {
        const users = reactions[emoji] || [];
        const reacted = users.includes(currentUserId);
        const count = users.length;

        return (
          <motion.button
            key={emoji}
            whileTap={{ scale: 1.3 }}
            onClick={() => onReact(emoji)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
              reacted
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-[#18182a] border border-[#2d2d45] hover:border-red-500/20'
            )}
          >
            <motion.span
              key={`${emoji}-${count}`}
              animate={reacted ? { scale: [1, 1.4, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {emoji}
            </motion.span>
            {count > 0 && <span className="text-slate-400 font-mono">{count}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
