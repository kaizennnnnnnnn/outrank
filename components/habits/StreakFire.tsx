'use client';

interface StreakFireProps {
  size?: number;
  streak: number;
}

// Palette scales with streak length. At 100+ the core goes white-hot.
function paletteOf(streak: number) {
  if (streak >= 100) return {
    core: '#ffffff', inner: '#fde047', mid: '#dc2626', outer: '#450a0a',
    ember: '#fde047', textTop: '#fef3c7', textBot: '#ef4444',
  };
  if (streak >= 30) return {
    core: '#fef3c7', inner: '#fb923c', mid: '#dc2626', outer: '#7f1d1d',
    ember: '#f97316', textTop: '#fef3c7', textBot: '#ef4444',
  };
  if (streak >= 7) return {
    core: '#fef9c3', inner: '#fbbf24', mid: '#f97316', outer: '#9a3412',
    ember: '#fb923c', textTop: '#fde68a', textBot: '#ea580c',
  };
  return {
    core: '#fef3c7', inner: '#fbbf24', mid: '#f59e0b', outer: '#b45309',
    ember: '#fde047', textTop: '#fef9c3', textBot: '#d97706',
  };
}

/**
 * CSS-only flame — no canvas, no requestAnimationFrame. Three stacked
 * radial-gradient "flame bodies" breathe independently, a soft under-pool
 * glow anchors the base, and 6 ember dots float up on staggered timing.
 *
 * Intentionally looks different from StreakFlame: that one is a crisp
 * geometric SVG shard for per-habit badges, while this one is the big
 * volumetric flame that sits on the dashboard hero.
 */
export function StreakFire({ size = 60, streak }: StreakFireProps) {
  if (streak === 0) return null;
  const p = paletteOf(streak);

  // Flame body sits in the top ~85% of the canvas; bottom 15% is the glow pool.
  const W = size;
  const H = size;

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative" style={{ width: W, height: H }}>
        {/* Under-pool — the bright ground glow the flame "sits in" */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.7,
            height: H * 0.18,
            left: W * 0.15,
            bottom: H * 0.02,
            background: `radial-gradient(ellipse, ${p.mid} 0%, ${p.outer}88 55%, transparent 95%)`,
            filter: 'blur(3px)',
            animation: 'fire-pool 1.6s ease-in-out infinite',
            willChange: 'transform, opacity',
          }}
        />

        {/* Outer body — widest blob, soft outer color */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.62,
            height: H * 0.82,
            left: W * 0.19,
            bottom: H * 0.08,
            background: `radial-gradient(ellipse 48% 60% at 50% 70%, ${p.mid}dd 0%, ${p.outer}aa 48%, transparent 82%)`,
            filter: 'blur(2.5px)',
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
            height: H * 0.68,
            left: W * 0.29,
            bottom: H * 0.1,
            background: `radial-gradient(ellipse 55% 62% at 50% 75%, ${p.inner}ee 0%, ${p.mid}99 55%, transparent 88%)`,
            filter: 'blur(1.6px)',
            transformOrigin: 'center bottom',
            animation: 'fire-breathe-alt 0.88s ease-in-out infinite',
            animationDelay: '0.08s',
            willChange: 'transform',
          }}
        />

        {/* Core — small and white-hot */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: W * 0.22,
            height: H * 0.5,
            left: W * 0.39,
            bottom: H * 0.15,
            background: `radial-gradient(ellipse 60% 70% at 50% 80%, ${p.core} 0%, ${p.inner}cc 55%, transparent 92%)`,
            transformOrigin: 'center bottom',
            animation: 'fire-breathe 0.7s ease-in-out infinite',
            willChange: 'transform',
          }}
        />

        {/* Embers — six tiny dots on staggered float-up loops */}
        {[
          { x: 0.32, delay: 0,   drift: -2 },
          { x: 0.5,  delay: 0.5, drift:  2 },
          { x: 0.62, delay: 1.0, drift: -1 },
          { x: 0.38, delay: 1.5, drift:  3 },
          { x: 0.55, delay: 2.0, drift: -3 },
          { x: 0.45, delay: 0.8, drift:  1 },
        ].map((e, i) => (
          <span
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 3,
              height: 3,
              left: W * e.x,
              bottom: H * 0.2,
              background: p.ember,
              boxShadow: `0 0 5px ${p.ember}, 0 0 2px #ffffff`,
              animation: 'fire-ember 2.6s linear infinite',
              animationDelay: `${e.delay}s`,
              // custom prop consumed by the keyframe's translateX target
              ['--drift' as string]: `${e.drift}px`,
              willChange: 'transform, opacity',
            } as React.CSSProperties}
          />
        ))}
      </div>

      <span
        className="font-heading font-bold text-xl bg-clip-text text-transparent"
        style={{
          background: `linear-gradient(180deg, ${p.textTop}, ${p.textBot})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        {streak}
      </span>
    </div>
  );
}
