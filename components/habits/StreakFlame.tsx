'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

function getFlameColors(streak: number): { main: string; inner: string; glow: string; text: string } {
  if (streak >= 100) return { main: '#dc2626', inner: '#fbbf24', glow: 'rgba(220,38,38,0.4)', text: 'from-yellow-400 via-red-500 to-red-600' };
  if (streak >= 30) return { main: '#dc2626', inner: '#ef4444', glow: 'rgba(220,38,38,0.3)', text: 'from-red-400 via-red-500 to-red-700' };
  if (streak >= 7) return { main: '#f97316', inner: '#fbbf24', glow: 'rgba(249,115,22,0.3)', text: 'from-orange-400 via-red-500 to-red-700' };
  return { main: '#f97316', inner: '#fbbf24', glow: 'rgba(249,115,22,0.25)', text: 'from-yellow-400 via-orange-400 to-orange-600' };
}

const iconSizes = { sm: 22, md: 30, lg: 42 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;

  const colors = getFlameColors(streak);
  const s = iconSizes[size];

  return (
    <div className="inline-flex items-center gap-1.5">
      <motion.div
        animate={{
          scaleY: [1, 1.18, 0.92, 1.1, 1],
          scaleX: [1, 0.93, 1.06, 0.96, 1],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="origin-bottom relative"
      >
        {/* Glow */}
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute -inset-1 blur-md rounded-full"
          style={{ background: colors.glow, width: s, height: s }}
        />
        {/* Flame SVG */}
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className="relative z-10">
          {/* Outer flame */}
          <path
            d="M12 2C12 2 8 6.5 8 13c0 2.2 1.8 4 4 4s4-1.8 4-4c0-6.5-4-11-4-11z"
            fill={`url(#flame-outer-${streak})`}
          />
          {/* Inner flame */}
          <path
            d="M12 8c0 0-2.5 3-2.5 7 0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5c0-4-2.5-7-2.5-7z"
            fill={`url(#flame-inner-${streak})`}
            opacity="0.9"
          />
          {/* Core bright spot */}
          <ellipse cx="12" cy="14" rx="1.2" ry="2" fill="#fef3c7" opacity="0.7" />
          <defs>
            <linearGradient id={`flame-outer-${streak}`} x1="12" y1="2" x2="12" y2="17">
              <stop offset="0%" stopColor={colors.inner} />
              <stop offset="50%" stopColor={colors.main} />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id={`flame-inner-${streak}`} x1="12" y1="8" x2="12" y2="17.5">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="50%" stopColor={colors.inner} />
              <stop offset="100%" stopColor={colors.main} />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
      <span
        className={cn(
          'font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r',
          colors.text,
          textSizes[size],
          streak >= 100 && 'animate-shimmer'
        )}
      >
        {streak}d
      </span>
    </div>
  );
}
