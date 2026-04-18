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
 * Tiny CSS-only orb for leaderboards/lists — built up from multiple layered
 * radial gradients, tilted rings, a specular highlight, an orbiting satellite,
 * and an expanding pulse wave so it visually mirrors the full SoulOrb canvas.
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
  const pulseIsRainbow = isRainbowColor(pulseColorId);

  const orbBg = baseIsRainbow
    ? `conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)`
    : `radial-gradient(circle at 32% 28%, #ffffff 0%, ${base.core} 12%, ${base.inner} 38%, ${base.mid} 66%, ${base.outer} 100%)`;

  const ringBg = ringIsRainbow
    ? `conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)`
    : `conic-gradient(from 0deg, ${ring.outer}, ${ring.mid}, ${ring.inner}, ${ring.core}, ${ring.inner}, ${ring.mid}, ${ring.outer})`;

  const pulseColor = pulseIsRainbow ? '#a855f7' : pulse.core;

  // Satellite orbit radius (tier 6+) — sits just outside the orb body
  const satR = size * 0.46;

  return (
    <div
      className="relative inline-block flex-shrink-0 animate-mini-orb-core"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${size * 0.25}px ${base.mid}cc) drop-shadow(0 0 ${size * 0.1}px ${base.core}aa)`,
      }}
      title={`Tier ${tier}`}
    >
      {/* Outer diffuse glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -size * 0.18,
          background: `radial-gradient(circle, ${base.mid}88 0%, ${base.outer}22 40%, transparent 70%)`,
        }}
      />

      {/* Expanding pulse wave (tier 3+) */}
      {tier >= 3 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none animate-mini-orb-pulse-wave"
          style={{
            border: `1.5px solid ${pulseColor}`,
            boxShadow: `0 0 6px ${pulseColor}`,
          }}
        />
      )}

      {/* Primary tilted ring (tier 2+) */}
      {tier >= 2 && (
        <div
          className="absolute inset-0 rounded-full animate-mini-orb-ring"
          style={{
            background: ringBg,
            WebkitMaskImage: 'radial-gradient(ellipse 55% 18% at 50% 50%, transparent 62%, black 66%)',
            maskImage: 'radial-gradient(ellipse 55% 18% at 50% 50%, transparent 62%, black 66%)',
            filter: `drop-shadow(0 0 3px ${ring.mid})`,
            opacity: 0.95,
          }}
        />
      )}

      {/* Secondary counter-rotating ring (tier 4+) */}
      {tier >= 4 && (
        <div
          className="absolute inset-0 rounded-full animate-mini-orb-ring-rev"
          style={{
            background: ringBg,
            WebkitMaskImage: 'radial-gradient(ellipse 18% 55% at 50% 50%, transparent 62%, black 66%)',
            maskImage: 'radial-gradient(ellipse 18% 55% at 50% 50%, transparent 62%, black 66%)',
            opacity: 0.7,
          }}
        />
      )}

      {/* Wreath dots (tier 5+) — more points than before, spinning */}
      {tier >= 5 && (
        <div className="absolute inset-0 animate-mini-orb-ring">
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = size / 2 - 0.5;
            const x = Math.cos(angle) * r + size / 2;
            const y = Math.sin(angle) * r + size / 2;
            const c = [ring.outer, ring.mid, ring.inner, ring.core][i % 4];
            const d = Math.max(1.5, size * 0.09);
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: d,
                  height: d,
                  left: x - d / 2,
                  top: y - d / 2,
                  background: c,
                  boxShadow: `0 0 4px ${c}, 0 0 1px #fff`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Orb body — multi-stop radial gradient */}
      <div
        className="absolute rounded-full"
        style={{
          inset: Math.max(1, size * 0.14),
          background: orbBg,
          boxShadow: `
            0 0 ${size * 0.35}px ${base.mid}aa,
            inset 0 -${size * 0.1}px ${size * 0.2}px ${base.outer},
            inset 0 ${size * 0.05}px ${size * 0.1}px ${base.inner}66
          `,
        }}
      />

      {/* Inner core pulse tint */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: Math.max(1.5, size * 0.26),
          background: `radial-gradient(circle at 34% 30%, ${pulse.core}cc 0%, ${pulse.inner}55 40%, transparent 70%)`,
          mixBlendMode: 'screen',
        }}
      />

      {/* Specular highlight — makes it read as a sphere */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size * 0.22,
          height: size * 0.16,
          left: size * 0.24,
          top: size * 0.22,
          background: `radial-gradient(ellipse, #ffffffdd 0%, #ffffff55 45%, transparent 80%)`,
          filter: 'blur(0.5px)',
        }}
      />

      {/* Orbiting satellite (tier 6+) */}
      {tier >= 6 && (
        <div
          className="absolute inset-0 animate-mini-orb-ring-rev pointer-events-none"
          style={{ transform: 'rotate(0deg)' }}
        >
          <span
            className="absolute rounded-full"
            style={{
              width: Math.max(2, size * 0.14),
              height: Math.max(2, size * 0.14),
              left: size / 2 + satR - Math.max(1, size * 0.07),
              top: size / 2 - Math.max(1, size * 0.07),
              background: pulseColor,
              boxShadow: `0 0 6px ${pulseColor}, 0 0 2px #fff`,
            }}
          />
        </div>
      )}
    </div>
  );
}
