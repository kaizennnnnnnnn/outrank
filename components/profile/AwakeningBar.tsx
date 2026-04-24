'use client';

import { cn } from '@/lib/utils';

interface AwakeningBarProps {
  awakening: number;
}

/**
 * Persistent 0-100 awakening progress bar. Survives evolve/ascend; only
 * full-awakening resets it. Rendered on the /orb page (the orb command
 * center) — the profile page only shows a static orb now.
 */
export function AwakeningBar({ awakening }: AwakeningBarProps) {
  const pct = Math.max(0, Math.min(100, awakening));
  const atMax = pct >= 100;
  const milestones = [25, 50, 75, 100];

  return (
    <div className="-mt-3 max-w-sm mx-auto relative">
      <div
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background: atMax
            ? 'radial-gradient(ellipse at center, rgba(253,224,71,0.35), rgba(236,72,153,0.25) 40%, transparent 75%)'
            : `radial-gradient(ellipse at center, rgba(236,72,153,${Math.min(0.35, pct / 400)}), transparent 75%)`,
          filter: 'blur(6px)',
          opacity: atMax ? 1 : pct / 100,
        }}
      />

      <div className="relative flex items-center justify-between mb-1.5">
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.25em]',
            atMax ? 'bg-clip-text text-transparent' : 'text-pink-300/90'
          )}
          style={
            atMax
              ? {
                  background: 'linear-gradient(90deg, #fde047, #f9a8d4, #a855f7, #22d3ee, #fde047)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  animation: 'awakening-fill-flow 2.5s linear infinite',
                }
              : undefined
          }
        >
          {atMax ? 'Awakening · Ready!' : 'Awakening'}
        </span>
        <span
          className="font-heading text-base font-bold bg-clip-text text-transparent tabular-nums"
          style={{
            background: atMax
              ? 'linear-gradient(90deg, #fde047, #f9a8d4, #22d3ee, #fde047)'
              : 'linear-gradient(90deg, #fbbf24, #ec4899, #a855f7)',
            backgroundSize: atMax ? '200% 100%' : undefined,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            animation: atMax ? 'awakening-fill-flow 2.5s linear infinite' : undefined,
            filter: `drop-shadow(0 0 ${Math.min(8, pct / 14)}px rgba(236,72,153,${Math.min(0.8, pct / 140)}))`,
          }}
        >
          {pct}%
        </span>
      </div>

      <div
        className="relative h-3 rounded-full overflow-hidden border"
        style={{
          background:
            'radial-gradient(ellipse at 50% -20%, rgba(236,72,153,0.12), transparent 60%), #06060c',
          borderColor: atMax ? 'rgba(253,224,71,0.6)' : 'rgba(236,72,153,0.22)',
          boxShadow: atMax
            ? 'inset 0 0 12px rgba(253,224,71,0.4), 0 0 14px rgba(253,224,71,0.45)'
            : 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full transition-[width] duration-700 ease-out overflow-hidden"
          style={{
            width: `${pct}%`,
            background: atMax
              ? 'linear-gradient(90deg, #fde047, #f472b6, #a855f7, #22d3ee, #fde047, #f472b6)'
              : 'linear-gradient(90deg, #7c3aed, #ec4899, #fbbf24, #ec4899, #7c3aed)',
            backgroundSize: '220% 100%',
            animation: `awakening-fill-flow ${atMax ? '2.2s' : '3.2s'} linear infinite`,
            willChange: 'background-position',
          }}
        >
          <div
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(95deg, transparent, rgba(255,255,255,0.65), transparent)',
              animation: 'awakening-shimmer 2.2s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>

        {pct > 0 && (
          <div
            className="absolute top-1/2 pointer-events-none rounded-full"
            style={{
              left: `${pct}%`,
              width: atMax ? 14 : 12,
              height: atMax ? 14 : 12,
              marginLeft: atMax ? -10 : -8,
              marginTop: atMax ? -7 : -6,
              background: atMax
                ? 'radial-gradient(circle, #ffffff 0%, #fde047 40%, #ec4899 80%, transparent 100%)'
                : 'radial-gradient(circle, #ffffff 0%, #f9a8d4 50%, #ec4899 100%)',
              boxShadow: atMax
                ? '0 0 18px #fde047, 0 0 10px #ec4899, 0 0 4px #ffffff'
                : '0 0 12px #ec4899, 0 0 5px #ffffff',
              animation: `awakening-head 1.4s ease-in-out infinite`,
              willChange: 'transform, opacity',
            }}
          />
        )}

        {atMax && (
          <>
            {[15, 38, 62, 85].map((x, i) => (
              <span
                key={x}
                className="absolute top-1/2 w-1 h-1 rounded-full animate-frame-spark pointer-events-none"
                style={{
                  left: `${x}%`,
                  marginLeft: -2,
                  marginTop: -2,
                  background: ['#fde047', '#f9a8d4', '#22d3ee', '#fde047'][i],
                  boxShadow: `0 0 6px ${['#fde047', '#f9a8d4', '#22d3ee', '#fde047'][i]}, 0 0 2px #ffffff`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      <div className="relative mt-1.5 h-2">
        {milestones.map((m) => {
          const reached = pct >= m;
          const isMax = m === 100;
          return (
            <div
              key={m}
              className="absolute top-0"
              style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: reached ? (isMax ? 5 : 4) : 3,
                  height: reached ? (isMax ? 5 : 4) : 3,
                  background: reached
                    ? (isMax ? '#fde047' : '#ec4899')
                    : '#1e1e30',
                  boxShadow: reached
                    ? `0 0 ${isMax ? 8 : 5}px ${isMax ? '#fde047' : '#ec4899'}`
                    : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
