'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  children: ReactNode;
  className?: string;
  /** Side of the bubble where the tail points. Defaults to 'bottom-left'
   *  so the tail points down toward a mascot positioned to the lower-left. */
  tail?: 'bottom-left' | 'left' | 'bottom-center';
}

/**
 * The phoenix mascot's speech bubble. Soft dark surface with a small
 * tail pointer toward the mascot. Animates in on mount.
 */
export function SpeechBubble({ children, className, tail = 'left' }: SpeechBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative bg-[#10101a] border border-white/10 rounded-2xl px-5 py-4 text-white text-base leading-relaxed shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]',
        className,
      )}
    >
      {children}
      {/* Tail — small rotated square pinned to the bubble edge */}
      <div
        className={cn(
          'absolute w-3 h-3 bg-[#10101a] border-white/10',
          tail === 'left' && 'left-[-6px] top-1/2 -translate-y-1/2 border-l border-b rotate-45',
          tail === 'bottom-left' && 'bottom-[-6px] left-8 border-r border-b rotate-45',
          tail === 'bottom-center' && 'bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b rotate-45',
        )}
      />
    </motion.div>
  );
}
