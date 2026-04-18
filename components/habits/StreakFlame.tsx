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
    outer: '#7f1d1d', mid: '#dc2626', inner: '#f97316', core: '#fde047', tip: '#ffffff',
    glow: 'rgba(220,38,38,0.65)', text: 'from-amber-200 via-red-500 to-rose-600',
  };
  if (streak >= 30) return {
    outer: '#7f1d1d', mid: '#dc2626', inner: '#ef4444', core: '#fb923c', tip: '#fde68a',
    glow: 'rgba(220,38,38,0.48)', text: 'from-red-400 to-rose-600',
  };
  if (streak >= 7) return {
    outer: '#9a3412', mid: '#ea580c', inner: '#f97316', core: '#fbbf24', tip: '#fef9c3',
    glow: 'rgba(249,115,22,0.42)', text: 'from-orange-400 to-red-600',
  };
  return {
    outer: '#78350f', mid: '#d97706', inner: '#f59e0b', core: '#fde047', tip: '#fef3c7',
    glow: 'rgba(245,158,11,0.4)', text: 'from-yellow-300 to-orange-600',
  };
}

const iconSizes = { sm: 22, md: 30, lg: 44 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

/**
 * Classic teardrop flame — smooth organic curves (no shards this time), a
 * radial-gradient core so it reads as 3D, a small highlight near the top,
 * and a single ember that rises from the tip and fades. Gentle flicker via
 * transform + filter animations. Pure SVG + CSS, no framer-motion per
 * instance so it stays cheap when the habit list renders several side by
 * side.
 */
export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;
  const c = getFlameColors(streak);
  const s = iconSizes[size];
  const id = `flame-${streak}-${size}`;

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
        <svg width={s} height={s} viewBox="0 0 40 50">
          <defs>
            {/* Main body gradient — hot core at the bottom-middle, darker at edges + tip */}
            <radialGradient id={`${id}-body`} cx="0.5" cy="0.72" r="0.62">
              <stop offset="0"    stopColor={c.core} />
              <stop offset="0.32" stopColor={c.inner} />
              <stop offset="0.65" stopColor={c.mid} />
              <stop offset="1"    stopColor={c.outer} />
            </radialGradient>
            {/* Inner core gradient — brighter, tighter */}
            <radialGradient id={`${id}-core`} cx="0.5" cy="0.7" r="0.5">
              <stop offset="0"    stopColor={c.tip} />
              <stop offset="0.4"  stopColor={c.core} />
              <stop offset="1"    stopColor={c.inner} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Soft base halo — the glow pool under the flame */}
          <ellipse cx="20" cy="46" rx="10" ry="2.5" fill={c.inner} opacity="0.55" />

          {/* Outer flame body — teardrop shape with one side subtly wider than
              the other so it doesn't look perfectly symmetrical (reads more
              alive). Scales and slightly wobbles via CSS. */}
          <path
            d="M20 3
               Q 10 14  9 26
               Q 10 40 20 47
               Q 31 40 32 25
               Q 31 14 20 3 Z"
            fill={`url(#${id}-body)`}
            style={{
              transformOrigin: '20px 46px',
              animation: 'flame-breathe 1.3s ease-in-out infinite',
            }}
          />

          {/* Inner bright core — smaller, offset, its own rhythm */}
          <path
            d="M20 13
               Q 15 22 15 30
               Q 16 38 20 43
               Q 25 38 26 30
               Q 26 22 20 13 Z"
            fill={`url(#${id}-core)`}
            style={{
              transformOrigin: '20px 43px',
              animation: 'flame-core-pulse 0.9s ease-in-out infinite',
            }}
          />

          {/* Highlight ellipse near the top — the "shine" spot that makes
              the flame read as volumetric rather than flat */}
          <ellipse
            cx="20" cy="28"
            rx="3" ry="5"
            fill={c.tip}
            opacity="0.55"
            style={{ animation: 'flame-highlight 1.3s ease-in-out infinite' }}
          />

          {/* Ember — a single tiny spark rising off the tip and fading */}
          <circle
            cx="20" cy="4" r="1"
            fill={c.core}
            style={{
              animation: 'flame-ember-rise 2.2s ease-out infinite',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
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
