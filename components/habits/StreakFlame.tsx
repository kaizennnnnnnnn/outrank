'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

function getFlameColor(streak: number): string {
  if (streak >= 100) return 'rainbow';
  if (streak >= 30) return 'purple';
  if (streak >= 7) return 'red';
  return 'orange';
}

const flameGradients: Record<string, string> = {
  orange: 'from-yellow-400 via-orange-400 to-orange-600',
  red: 'from-orange-400 via-red-500 to-red-700',
  purple: 'from-red-500 via-blue-500 to-blue-700',
  rainbow: 'from-yellow-400 via-red-500 to-blue-600',
};

const sizeMap = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;

  const color = getFlameColor(streak);

  return (
    <div className="inline-flex items-center gap-1.5">
      <motion.div
        animate={{
          scaleY: [1, 1.15, 0.95, 1.08, 1],
          scaleX: [1, 0.95, 1.05, 0.97, 1],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn('origin-bottom', sizeMap[size])}
      >
        🔥
      </motion.div>
      <span
        className={cn(
          'font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r',
          flameGradients[color],
          size === 'sm' && 'text-xs',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-xl',
          color === 'rainbow' && 'animate-shimmer'
        )}
      >
        {streak}d
      </span>
    </div>
  );
}
