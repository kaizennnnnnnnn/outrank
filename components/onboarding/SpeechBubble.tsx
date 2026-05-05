'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  children: ReactNode;
  className?: string;
  /** Side of the bubble where the tail points. Defaults to 'left'
   *  (mascot to the left of the bubble). 'top-center' is for layouts
   *  where the mascot is above the bubble and the tail points up. */
  tail?: 'bottom-left' | 'left' | 'bottom-center' | 'top-center';
}

/**
 * The phoenix mascot's speech bubble. Editorial paper card with a
 * hairline ink border and a small triangular tail toward the mascot.
 */
export function SpeechBubble({ children, className, tail = 'left' }: SpeechBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('font-body relative', className)}
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-ink)',
        padding: '14px 18px',
        color: 'var(--b-ink)',
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      {children}
      <div
        className={cn(
          'absolute',
          tail === 'left' && 'left-[-7px] top-1/2 -translate-y-1/2',
          tail === 'bottom-left' && 'bottom-[-7px] left-8',
          tail === 'bottom-center' && 'bottom-[-7px] left-1/2 -translate-x-1/2',
          tail === 'top-center' && 'top-[-7px] left-1/2 -translate-x-1/2',
        )}
        style={{
          width: 12,
          height: 12,
          background: 'var(--b-paper)',
          borderLeft: tail === 'left' || tail === 'top-center' ? '1px solid var(--b-ink)' : undefined,
          borderTop: tail === 'top-center' ? '1px solid var(--b-ink)' : undefined,
          borderBottom: tail === 'left' || tail === 'bottom-left' || tail === 'bottom-center' ? '1px solid var(--b-ink)' : undefined,
          borderRight: tail === 'bottom-left' || tail === 'bottom-center' ? '1px solid var(--b-ink)' : undefined,
          transform: 'rotate(45deg)',
        }}
      />
    </motion.div>
  );
}
