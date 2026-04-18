'use client';

import { cn } from '@/lib/utils';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

type Palette = {
  core: string; inner: string; mid: string; outer: string; ember: string;
  glow: string; textClass: string;
};

function paletteOf(streak: number): Palette {
  if (streak >= 100) return {
    core: '#ffffff', inner: '#fde047', mid: '#dc2626', outer: '#450a0a',
    ember: '#fde047', glow: 'rgba(220,38,38,0.6)',
    textClass: 'from-amber-200 via-red-500 to-rose-600',
  };
  if (streak >= 30) return {
    core: '#fef3c7', inner: '#fb923c', mid: '#dc2626', outer: '#7f1d1d',
    ember: '#f97316', glow: 'rgba(220,38,38,0.45)',
    textClass: 'from-red-400 to-rose-600',
  };
  if (streak >= 7) return {
    core: '#fef9c3', inner: '#fbbf24', mid: '#f97316', outer: '#9a3412',
    ember: '#fb923c', glow: 'rgba(249,115,22,0.42)',
    textClass: 'from-orange-400 to-red-600',
  };
  return {
    core: '#fef3c7', inner: '#fbbf24', mid: '#f59e0b', outer: '#b45309',
    ember: '#fde047', glow: 'rgba(245,158,11,0.4)',
    textClass: 'from-yellow-300 to-orange-600',
  };
}

const iconSizes = { sm: 22, md: 30, lg: 42 };
const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };

/**
 * Compact CSS flame for per-habit streak badges. Same recipe as the big
 * StreakFire on the dashboard — three stacked radial-gradient bodies that
 * breathe at different rates, an under-pool glow, and a trio of embers
 * floating up — just scaled for badge-size use.
 *
 * Keyframes (fire-breathe, fire-breathe-alt, fire-pool, fire-ember) are
 * already defined in globals.css and shared with StreakFire, so adding
 * instances here doesn't cost extra CSS.
 */
export function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  if (streak === 0) return null;
  const p = paletteOf(streak);
  const W = iconSizes[size];
  const H = Math.round(W * 1.1);

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className="relative"
        style={{
          width: W,
          height: H,
          filter: `drop-shadow(0 0 ${W * 0.22}px ${p.glow})`,
        }}
      >
        {/* Under-pool — bright ground glow */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.75,
            height: H * 0.16,
            left: W * 0.125,
            bottom: 0,
            background: `radial-gradient(ellipse, ${p.mid} 0%, ${p.outer}77 55%, transparent 95%)`,
            filter: 'blur(2px)',
            animation: 'fire-pool 1.6s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}
        />

        {/* Outer body */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.62,
            height: H * 0.85,
            left: W * 0.19,
            bottom: H * 0.06,
            background: `radial-gradient(ellipse 48% 60% at 50% 70%, ${p.mid}dd 0%, ${p.outer}aa 48%, transparent 82%)`,
            filter: 'blur(1.5px)',
            transformOrigin: 'center bottom',
            animation: 'fire-breathe 1.25s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Mid body — narrower, hotter */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.42,
            height: H * 0.7,
            left: W * 0.29,
            bottom: H * 0.08,
            background: `radial-gradient(ellipse 55% 62% at 50% 75%, ${p.inner}ee 0%, ${p.mid}99 55%, transparent 88%)`,
            filter: 'blur(1px)',
            transformOrigin: 'center bottom',
            animation: 'fire-breathe-alt 0.88s ease-in-out infinite',
            animationDelay: '0.08s',
            willChange: 'transform',
          }}
        />

        {/* Core — small and hot */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.22,
            height: H * 0.5,
            left: W * 0.39,
            bottom: H * 0.13,
            background: `radial-gradient(ellipse 60% 70% at 50% 80%, ${p.core} 0%, ${p.inner}cc 55%, transparent 92%)`,
            transformOrigin: 'center bottom',
            animation: 'fire-breathe 0.7s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Embers — 3 tiny drift dots on staggered loops */}
        {[
          { x: 0.36, delay: 0.0, drift: -1.5 },
          { x: 0.52, delay: 0.9, drift:  1.5 },
          { x: 0.44, delay: 1.7, drift: -1 },
        ].map((e, i) => (
          <span
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 2,
              height: 2,
              left: W * e.x,
              bottom: H * 0.2,
              background: p.ember,
              boxShadow: `0 0 3px ${p.ember}`,
              animation: 'fire-ember 2.6s linear infinite',
              animationDelay: `${e.delay}s`,
              ['--drift' as string]: `${e.drift}px`,
              willChange: 'transform, opacity',
            } as React.CSSProperties}
          />
        ))}
      </div>

      <span
        className={cn(
          'font-heading font-bold bg-clip-text text-transparent bg-gradient-to-b',
          textSizes[size],
          p.textClass,
          streak >= 100 && 'animate-shimmer',
        )}
      >
        {streak}d
      </span>
    </div>
  );
}
