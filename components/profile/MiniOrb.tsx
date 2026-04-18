'use client';

import { getOrbTier } from '@/constants/orbTiers';
import { getOrbBaseColor, getOrbPulseColor, getOrbRingColor, isRainbowColor } from '@/constants/orbColors';

interface Props {
  tier?: number;
  baseColorId?: string;
  pulseColorId?: string;
  ringColorId?: string;
  size?: number; // px
}

/**
 * Tiny CSS-only orb for in-list previews (leaderboards, feed, etc.). Uses
 * the equipped base/pulse/ring colors so every row still reads as that
 * player's orb. Animated with a slow spin + pulse so it feels alive without
 * the cost of a full canvas.
 */
export function MiniOrb({ tier = 1, baseColorId, pulseColorId, ringColorId, size = 22 }: Props) {
  const config = getOrbTier(tier);
  const base = baseColorId ? getOrbBaseColor(baseColorId) : {
    outer: config.colors.outer, mid: config.colors.mid, inner: config.colors.inner, core: config.colors.core, glow: config.colors.glow,
  };
  const pulse = pulseColorId ? getOrbPulseColor(pulseColorId) : base;
  const ring = ringColorId ? getOrbRingColor(ringColorId) : base;

  const baseIsRainbow = isRainbowColor(baseColorId);
  const ringIsRainbow = isRainbowColor(ringColorId);

  const orbBg = baseIsRainbow
    ? `conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)`
    : `radial-gradient(circle at 35% 28%, ${base.core} 0%, ${base.inner} 30%, ${base.mid} 60%, ${base.outer} 95%)`;

  const ringBg = ringIsRainbow
    ? `conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)`
    : `linear-gradient(135deg, ${ring.mid}, ${ring.inner}, ${ring.mid})`;

  return (
    <div
      className="relative inline-block flex-shrink-0 animate-frame-pulse"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 4px ${base.mid}aa)`,
      }}
      title={`Tier ${tier}`}
    >
      {/* Ring — oblate conic/linear band, slow spin */}
      {tier >= 2 && (
        <div
          className="absolute inset-0 rounded-full animate-frame-spin"
          style={{
            background: ringBg,
            WebkitMaskImage: 'radial-gradient(ellipse 52% 16% at 50% 50%, transparent 62%, black 64%)',
            maskImage: 'radial-gradient(ellipse 52% 16% at 50% 50%, transparent 62%, black 64%)',
            transform: 'rotate(25deg)',
            opacity: 0.9,
          }}
        />
      )}
      {/* Outer tier-5+ wreath dots */}
      {tier >= 5 && (
        <>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            const r = size / 2 - 0.5;
            const x = Math.cos(angle) * r + size / 2;
            const y = Math.sin(angle) * r + size / 2;
            const c = [ring.outer, ring.mid, ring.inner, ring.core][i % 4];
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 2,
                  height: 2,
                  left: x - 1,
                  top: y - 1,
                  background: c,
                  boxShadow: `0 0 3px ${c}`,
                }}
              />
            );
          })}
        </>
      )}
      {/* Orb body */}
      <div
        className="absolute rounded-full"
        style={{
          inset: Math.max(1, size * 0.12),
          background: orbBg,
          boxShadow: `0 0 ${size * 0.3}px ${base.mid}88, inset 0 -${size * 0.08}px ${size * 0.16}px ${base.outer}`,
        }}
      />
      {/* Pulse highlight */}
      {tier >= 3 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: Math.max(1, size * 0.28),
            background: `radial-gradient(circle at 30% 30%, ${pulse.core}aa, transparent 55%)`,
          }}
        />
      )}
    </div>
  );
}
