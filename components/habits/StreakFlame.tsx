'use client';

import { cn } from '@/lib/utils';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

type Palette = {
  outer: string; mid: string; inner: string; core: string; tip: string;
  glow: string; text: string;
};

function getFlameColors(streak: number): Palette {
  if (streak >= 100) return {
    outer: '#991b1b', mid: '#dc2626', inner: '#f97316', core: '#fde047', tip: '#fffbeb',
    glow: 'rgba(220,38,38,0.6)', text: 'from-amber-300 via-red-500 to-rose-600',
  };
  if (streak >= 30) return {
    outer: '#7f1d1d', mid: '#dc2626', inner: '#ef4444', core: '#fb923c', tip: '#fde68a',
    glow: 'rgba(220,38,38,0.45)', text: 'from-red-400 to-rose-600',
  };
  if (streak >= 7) return {
    outer: '#9a3412', mid: '#ea580c', inner: '#f97316', core: '#fbbf24', tip: '#fef9c3',
    glow: 'rgba(249,115,22,0.4)', text: 'from-orange-400 to-red-600',
  };
  return {
    outer: '#92400e', mid: '#d97706', inner: '#f59e0b', core: '#fbbf24', tip: '#fef3c7',
    glow: 'rgba(245,158,11,0.35)', text: 'from-yellow-400 to-orange-600',
  };
}

const iconSizes = { sm: 22, md: 30, lg: 44 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

/**
 * Geometric shard flame — three nested prism-shaped layers, each swaying
 * independently on its own CSS keyframe. Totally different visual identity
 * from the big dashboard StreakFire: this one reads as a cold-edged crystal
 * "pointed" flame rather than a soft blob.
 */
export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;
  const c = getFlameColors(streak);
  const s = iconSizes[size];
  // Unique id per instance so the SVG gradient defs don't clash when several
  // flames render side-by-side (mastery shelf, habit list, etc.).
  const id = `shard-${streak}-${size}`;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="relative"
        style={{
          width: s,
          height: s,
          filter: `drop-shadow(0 0 ${s * 0.22}px ${c.glow})`,
        }}
      >
        <svg width={s} height={s} viewBox="0 0 60 80">
          <defs>
            <linearGradient id={`${id}-outer`} x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0" stopColor={c.outer} />
              <stop offset="0.6" stopColor={c.mid} />
              <stop offset="1" stopColor={c.inner} />
            </linearGradient>
            <linearGradient id={`${id}-mid`} x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0" stopColor={c.mid} />
              <stop offset="0.5" stopColor={c.inner} />
              <stop offset="1" stopColor={c.core} />
            </linearGradient>
            <linearGradient id={`${id}-core`} x1="0.5" y1="1" x2="0.5" y2="0">
              <stop offset="0" stopColor={c.inner} />
              <stop offset="0.5" stopColor={c.core} />
              <stop offset="1" stopColor={c.tip} />
            </linearGradient>
          </defs>

          {/* Base ember — a bright horizontal ellipse at the flame's foot */}
          <ellipse cx="30" cy="70" rx="13" ry="4" fill={c.inner} opacity="0.65" />

          {/* Outer shard — widest, bobs slow */}
          <path
            d="M30 72 Q 10 50 16 28 Q 22 10 30 2 Q 38 10 44 28 Q 50 50 30 72 Z"
            fill={`url(#${id}-outer)`}
            style={{
              transformOrigin: '30px 72px',
              animation: 'shard-sway 1.6s ease-in-out infinite',
            }}
          />

          {/* Mid shard — narrower, bobs on a different rhythm */}
          <path
            d="M30 66 Q 18 48 22 30 Q 26 16 30 8 Q 34 16 38 30 Q 42 48 30 66 Z"
            fill={`url(#${id}-mid)`}
            style={{
              transformOrigin: '30px 66px',
              animation: 'shard-sway-alt 1.25s ease-in-out infinite',
            }}
          />

          {/* Core shard — the hot tip */}
          <path
            d="M30 54 Q 25 42 26 30 Q 28 20 30 14 Q 32 20 34 30 Q 35 42 30 54 Z"
            fill={`url(#${id}-core)`}
            style={{
              transformOrigin: '30px 54px',
              animation: 'shard-sway 0.95s ease-in-out infinite',
              animationDelay: '0.1s',
            }}
          />

          {/* Spark chips — two tiny diamonds that flicker around the tip */}
          <path
            d="M22 22 L24 20 L22 18 L20 20 Z"
            fill={c.core}
            opacity="0.8"
            style={{ animation: 'shard-spark 1.8s ease-in-out infinite' }}
          />
          <path
            d="M38 26 L40 24 L38 22 L36 24 Z"
            fill={c.tip}
            opacity="0.8"
            style={{ animation: 'shard-spark 2.2s ease-in-out infinite', animationDelay: '0.4s' }}
          />
        </svg>
      </div>
      <span
        className={cn(
          'font-heading font-bold bg-clip-text text-transparent bg-gradient-to-b',
          textSizes[size],
          c.text,
          streak >= 100 && 'animate-shimmer',
        )}
      >
        {streak}d
      </span>
    </div>
  );
}
