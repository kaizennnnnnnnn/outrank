'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

function getFlameColors(streak: number) {
  if (streak >= 100) return {
    outer: '#991b1b', mid: '#dc2626', inner: '#f97316', core: '#fbbf24', tip: '#fef3c7',
    glow: 'rgba(220,38,38,0.5)', text: 'from-yellow-400 via-red-500 to-red-600',
  };
  if (streak >= 30) return {
    outer: '#7f1d1d', mid: '#dc2626', inner: '#ef4444', core: '#fb923c', tip: '#fde68a',
    glow: 'rgba(220,38,38,0.4)', text: 'from-red-400 via-red-500 to-red-700',
  };
  if (streak >= 7) return {
    outer: '#9a3412', mid: '#ea580c', inner: '#f97316', core: '#fbbf24', tip: '#fef9c3',
    glow: 'rgba(249,115,22,0.4)', text: 'from-orange-400 via-red-500 to-red-700',
  };
  return {
    outer: '#92400e', mid: '#d97706', inner: '#f59e0b', core: '#fbbf24', tip: '#fef3c7',
    glow: 'rgba(245,158,11,0.35)', text: 'from-yellow-400 via-orange-400 to-orange-600',
  };
}

const iconSizes = { sm: 24, md: 32, lg: 44 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;

  const c = getFlameColors(streak);
  const s = iconSizes[size];
  const id = `flame-${streak}-${size}`;

  return (
    <div className="inline-flex items-center gap-1.5">
      <motion.div
        animate={{
          scaleY: [1, 1.22, 0.88, 1.15, 0.95, 1],
          scaleX: [1, 0.9, 1.08, 0.94, 1.02, 1],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="origin-bottom relative"
      >
        {/* Outer glow — big and soft */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full blur-lg"
          style={{
            background: c.glow,
            width: s * 1.4,
            height: s * 1.4,
            left: -(s * 0.2),
            top: -(s * 0.1),
          }}
        />

        {/* Inner glow — tighter, brighter */}
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
          className="absolute rounded-full blur-md"
          style={{
            background: `radial-gradient(circle, ${c.core}60 0%, transparent 70%)`,
            width: s,
            height: s,
            left: 0,
            top: s * 0.1,
          }}
        />

        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className="relative z-10"
          style={{ filter: `drop-shadow(0 0 4px ${c.mid}80)` }}>

          {/* Outermost flame — wide, dark base */}
          <path
            d="M16 1C16 1 9 8 9 18c0 3.9 3.1 7 7 7s7-3.1 7-7C23 8 16 1 16 1z"
            fill={`url(#${id}-outer)`}
          />

          {/* Left flicker tongue */}
          <path
            d="M11 10C11 10 8 14 9.5 19c0.5 1.5 1.5 2 2 1.5 0.5-0.5-0.5-2-0.5-4C11 14 11 10 11 10z"
            fill={c.mid}
            opacity="0.5"
          />

          {/* Right flicker tongue */}
          <path
            d="M21 10C21 10 24 14 22.5 19c-0.5 1.5-1.5 2-2 1.5-0.5-0.5 0.5-2 0.5-4C21 14 21 10 21 10z"
            fill={c.mid}
            opacity="0.5"
          />

          {/* Mid flame layer */}
          <path
            d="M16 5C16 5 11 11 11 18c0 2.8 2.2 5 5 5s5-2.2 5-5C21 11 16 5 16 5z"
            fill={`url(#${id}-mid)`}
          />

          {/* Inner hot flame */}
          <path
            d="M16 10C16 10 13 14 13 19c0 1.7 1.3 3 3 3s3-1.3 3-3C19 14 16 10 16 10z"
            fill={`url(#${id}-inner)`}
          />

          {/* Core — white-hot center */}
          <path
            d="M16 15C16 15 14.5 17 14.5 20c0 0.8 0.7 1.5 1.5 1.5s1.5-0.7 1.5-1.5C17.5 17 16 15 16 15z"
            fill={`url(#${id}-core)`}
          />

          {/* Bright tip spark */}
          <ellipse cx="16" cy="20" rx="0.8" ry="1.2" fill={c.tip} opacity="0.9" />

          {/* Tiny sparks at top */}
          <circle cx="14" cy="4" r="0.5" fill={c.core} opacity="0.6" />
          <circle cx="18" cy="3" r="0.4" fill={c.inner} opacity="0.5" />
          <circle cx="16" cy="2" r="0.3" fill={c.tip} opacity="0.7" />

          <defs>
            <linearGradient id={`${id}-outer`} x1="16" y1="1" x2="16" y2="25">
              <stop offset="0%" stopColor={c.inner} />
              <stop offset="40%" stopColor={c.mid} />
              <stop offset="100%" stopColor={c.outer} />
            </linearGradient>
            <linearGradient id={`${id}-mid`} x1="16" y1="5" x2="16" y2="23">
              <stop offset="0%" stopColor={c.core} />
              <stop offset="40%" stopColor={c.inner} />
              <stop offset="100%" stopColor={c.mid} />
            </linearGradient>
            <linearGradient id={`${id}-inner`} x1="16" y1="10" x2="16" y2="22">
              <stop offset="0%" stopColor={c.tip} />
              <stop offset="40%" stopColor={c.core} />
              <stop offset="100%" stopColor={c.inner} />
            </linearGradient>
            <linearGradient id={`${id}-core`} x1="16" y1="15" x2="16" y2="21.5">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor={c.tip} />
              <stop offset="100%" stopColor={c.core} />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      <span
        className={cn(
          'font-mono font-bold bg-clip-text text-transparent bg-gradient-to-r',
          c.text,
          textSizes[size],
          streak >= 100 && 'animate-shimmer'
        )}
      >
        {streak}d
      </span>
    </div>
  );
}
