'use client';

import { OrbColorSet, isRainbowColor } from '@/constants/orbColors';
import type { CosmeticRarity } from '@/constants/cosmetics';

interface Props {
  colorSet: OrbColorSet;
  /** 'orb' = full sphere (base-color preview). 'ring' = dark body with
   *  only the orbital rings showing. 'pulse' = dark body with only the
   *  pulse wave rings radiating outward — lets the pulse color be seen
   *  in isolation without the base-color sphere mixing in. */
  variant: 'orb' | 'ring' | 'pulse';
  /** Pixel size of the circle (width = height). Default 48. */
  size?: number;
  /** If this color id is a rainbow variant, render a rainbow preview */
  id?: string;
  /** Optional rarity — when set, adds premium layers (halo, sparkles, pulse). */
  rarity?: CosmeticRarity;
}

// Rainbow stops, shared between orb + ring variants so both read as "rainbow"
const RAINBOW_STOPS = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#ef4444',
];

const tierOf = (r?: CosmeticRarity): number => {
  if (!r) return 0;
  return { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 }[r];
};

/**
 * Faithful preview of an orb or ring color set. When `rarity` is provided, the
 * preview is wrapped in escalating premium layers: halo (rare+), tilted
 * orbit ring (epic+), orbiting sparkles + pulse (legendary+), hue-rotate
 * aurora wash (mythic). The base sphere fidelity itself is unchanged — black
 * rims like Eternal still render correctly because the outer stop is opaque.
 */
export function OrbColorPreview({ colorSet, variant, size = 48, id, rarity }: Props) {
  const isRainbow = isRainbowColor(id);
  const s = size;
  const tier = tierOf(rarity);

  // Outer wrapper expands slightly for higher tiers to host the halo + orbits.
  // When no rarity is passed (inventory, profile previews) the wrapper shrinks
  // back to just the sphere so nothing changes for existing callers.
  const outerPad = tier === 0 ? 0 : tier === 1 ? 4 : tier === 2 ? 6 : 8;
  const outer = s + outerPad * 2;

  const haloColor = isRainbow ? '#ec4899' : colorSet.mid;
  const haloAccent = isRainbow ? '#a855f7' : colorSet.inner;

  // Premium layers, wrapped around the actual sphere. Each is toggled per tier.
  const layers = (
    <>
      {/* Outer colored halo — rare + */}
      {tier >= 1 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 0,
            background: `radial-gradient(circle, ${haloColor}66 0%, ${haloAccent}22 45%, transparent 72%)`,
            filter: tier >= 4 ? 'blur(2px)' : 'blur(1px)',
          }}
        />
      )}
      {/* Pulsing glow — legendary + */}
      {tier >= 3 && (
        <div
          className="absolute rounded-full pointer-events-none animate-frame-halo"
          style={{
            inset: -2,
            background: `radial-gradient(circle, ${haloColor}88 0%, transparent 65%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* Mythic gets an extra static brightness boost via a radial wash.
          Previously this layer ran an animated hue-rotate + blur(3px) conic
          gradient which was the single most expensive element in the shop
          when many mythic cards were visible — replaced with a static blob. */}
      {tier >= 4 && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -2,
            background: `radial-gradient(circle, ${colorSet.core}44 0%, ${haloColor}22 45%, transparent 75%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* Tilted orbit ring behind the sphere — epic + */}
      {tier >= 2 && (
        <div
          className="absolute pointer-events-none rounded-full animate-mini-orb-ring"
          style={{
            inset: outerPad - 2,
            background: `conic-gradient(from 0deg, transparent 0deg, ${haloColor} 45deg, ${haloAccent} 90deg, transparent 135deg, transparent 225deg, ${haloAccent} 270deg, ${haloColor} 315deg, transparent 360deg)`,
            WebkitMaskImage: 'radial-gradient(ellipse 55% 14% at 50% 50%, transparent 60%, black 62%)',
            maskImage: 'radial-gradient(ellipse 55% 14% at 50% 50%, transparent 60%, black 62%)',
            transform: 'rotate(-20deg)',
            filter: `drop-shadow(0 0 3px ${haloColor})`,
          }}
        />
      )}
      {/* Orbiting sparkles — legendary + (reduced count for perf; two is
          enough to read as "orbiting" without choking the frame budget when
          lots of mythic previews are on-screen). */}
      {tier >= 3 && (
        <div className="absolute inset-0 pointer-events-none animate-frame-orbit">
          {Array.from({ length: 2 }).map((_, i, arr) => {
            const angle = (i / arr.length) * Math.PI * 2;
            const r = outer / 2 - 1;
            const x = Math.cos(angle) * r + outer / 2;
            const y = Math.sin(angle) * r + outer / 2;
            const pal = [colorSet.core, colorSet.inner, colorSet.mid, colorSet.outer];
            const c = pal[i % pal.length];
            const sz = tier >= 4 ? 3.5 : 3;
            return (
              <span
                key={i}
                className="absolute rounded-full animate-frame-spark"
                style={{
                  width: sz, height: sz,
                  left: x - sz / 2, top: y - sz / 2,
                  background: c,
                  boxShadow: `0 0 6px ${c}, 0 0 2px #fff`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );

  // Variant-specific sphere body --------------------------------------------
  let sphere: React.ReactNode;

  if (variant === 'orb') {
    if (isRainbow) {
      sphere = (
        <div
          className="rounded-full relative overflow-hidden"
          style={{
            width: s,
            height: s,
            background: `conic-gradient(from 0deg, ${RAINBOW_STOPS.join(', ')})`,
            boxShadow: `0 0 18px -2px rgba(168,85,247,0.6),
                        inset 0 -${s * 0.14}px ${s * 0.18}px rgba(0,0,0,0.42),
                        inset 0 ${s * 0.04}px ${s * 0.08}px rgba(255,255,255,0.18)`,
          }}
        >
          {/* Specular highlight */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s * 0.12,
              left: s * 0.22,
              width: s * 0.4,
              height: s * 0.4,
              background: 'radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0) 60%)',
            }}
          />
          {/* Rim light — thin bright arc on the upper-left edge */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `inset ${s * 0.03}px ${s * 0.03}px ${s * 0.1}px rgba(255,255,255,0.35)`,
            }}
          />
        </div>
      );
    } else {
      sphere = (
        <div
          className="rounded-full relative overflow-hidden"
          style={{
            width: s,
            height: s,
            background: `radial-gradient(circle at 35% 28%,
              #ffffff 0%,
              ${colorSet.core} 14%,
              ${colorSet.inner} 38%,
              ${colorSet.mid} 66%,
              ${colorSet.outer} 100%)`,
            boxShadow: `0 0 16px -2px ${colorSet.mid}cc,
                        inset 0 -${s * 0.12}px ${s * 0.18}px ${colorSet.outer},
                        inset 0 ${s * 0.04}px ${s * 0.08}px ${colorSet.core}44`,
          }}
        >
          {/* Bigger specular highlight — even non-rainbow reads as a sphere now */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s * 0.12,
              left: s * 0.22,
              width: s * 0.32,
              height: s * 0.24,
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)',
              filter: 'blur(0.5px)',
            }}
          />
          {/* Rim light on the upper edge */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `inset ${s * 0.025}px ${s * 0.025}px ${s * 0.08}px ${colorSet.core}88`,
            }}
          />
          {/* Bottom reflective pool — tight under-glow */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              bottom: -s * 0.08,
              left: s * 0.18,
              width: s * 0.64,
              height: s * 0.12,
              background: `radial-gradient(ellipse, ${colorSet.mid}66, transparent 70%)`,
              filter: 'blur(2px)',
            }}
          />
        </div>
      );
    }
  } else if (variant === 'pulse') {
    // Pulse variant — dark body with expanding concentric pulse rings
    // radiating from the center. Shows the pulse color in isolation
    // (no base-color sphere, no orbital rings). Three rings offset in
    // time so at any moment the viewer sees the wave animating outward.
    const pulseColor = isRainbow ? '#ec4899' : colorSet.inner;
    const pulseCore  = isRainbow ? '#ffffff' : colorSet.core;
    const waves = [
      { delay: '0s',   dur: '1.8s' },
      { delay: '0.6s', dur: '1.8s' },
      { delay: '1.2s', dur: '1.8s' },
    ];
    sphere = (
      <div
        className="rounded-full relative overflow-hidden"
        style={{
          width: s,
          height: s,
          background:
            'radial-gradient(circle at 35% 30%, #1a1a28 0%, #0b0b14 70%)',
          boxShadow: `0 0 16px -4px ${pulseColor}80, inset 0 -4px 8px rgba(0,0,0,0.55)`,
        }}
      >
        {/* Expanding pulse waves */}
        {waves.map((w, i) => (
          <span
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              width: s * 0.2,
              height: s * 0.2,
              marginLeft: -(s * 0.1),
              marginTop: -(s * 0.1),
              border: `1.5px solid ${pulseColor}`,
              boxShadow: `0 0 6px ${pulseColor}`,
              animation: `preview-pulse-wave ${w.dur} ease-out ${w.delay} infinite`,
            }}
          />
        ))}
        {/* Bright core dot — the origin of the pulse */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            left: '50%',
            top: '50%',
            width: s * 0.14,
            height: s * 0.14,
            marginLeft: -(s * 0.07),
            marginTop: -(s * 0.07),
            background: `radial-gradient(circle, ${pulseCore} 0%, ${pulseColor} 55%, transparent 100%)`,
            boxShadow: `0 0 10px ${pulseColor}, 0 0 3px #ffffff`,
            animation: 'preview-pulse-core 1.6s ease-in-out infinite',
          }}
        />
      </div>
    );
  } else {
    // Ring variant
    if (isRainbow) {
      sphere = (
        <div
          className="rounded-full relative"
          style={{
            width: s,
            height: s,
            background: 'radial-gradient(circle at 35% 30%, #2a2a3d 0%, #0b0b14 75%)',
            boxShadow: '0 0 18px -4px rgba(168,85,247,0.7), inset 0 -4px 8px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              inset: 3,
              background: `conic-gradient(from 0deg, ${RAINBOW_STOPS.join(', ')})`,
              WebkitMaskImage: 'radial-gradient(ellipse 50% 15% at 50% 50%, transparent 60%, black 62%)',
              maskImage: 'radial-gradient(ellipse 50% 15% at 50% 50%, transparent 60%, black 62%)',
              transform: 'rotate(25deg)',
              filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.6))',
            }}
          />
          <div
            className="absolute rounded-full opacity-75"
            style={{
              inset: 5,
              background: `conic-gradient(from 90deg, ${RAINBOW_STOPS.join(', ')})`,
              WebkitMaskImage: 'radial-gradient(ellipse 46% 12% at 50% 50%, transparent 60%, black 62%)',
              maskImage: 'radial-gradient(ellipse 46% 12% at 50% 50%, transparent 60%, black 62%)',
              transform: 'rotate(-20deg)',
            }}
          />
          {/* Tiny body glimmer so the core isn't just a black hole */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s * 0.22, left: s * 0.24,
              width: s * 0.22, height: s * 0.16,
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.45), transparent 75%)',
            }}
          />
        </div>
      );
    } else {
      const quarterRing = `conic-gradient(from 0deg,
        ${colorSet.outer} 0deg,    ${colorSet.outer} 90deg,
        ${colorSet.mid} 90deg,     ${colorSet.mid} 180deg,
        ${colorSet.inner} 180deg,  ${colorSet.inner} 270deg,
        ${colorSet.core} 270deg,   ${colorSet.core} 360deg)`;
      sphere = (
        <div
          className="rounded-full relative"
          style={{
            width: s,
            height: s,
            background: `radial-gradient(circle at 35% 30%, #2a2a3d 0%, #0b0b14 75%)`,
            boxShadow: `0 0 16px -4px ${colorSet.mid}cc, inset 0 -4px 8px rgba(0,0,0,0.5)`,
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              inset: 3,
              background: quarterRing,
              WebkitMaskImage: 'radial-gradient(ellipse 50% 14% at 50% 50%, transparent 60%, black 62%)',
              maskImage: 'radial-gradient(ellipse 50% 14% at 50% 50%, transparent 60%, black 62%)',
              transform: 'rotate(25deg)',
              filter: `drop-shadow(0 0 4px ${colorSet.mid}cc)`,
            }}
          />
          <div
            className="absolute rounded-full opacity-85"
            style={{
              inset: 6,
              background: `conic-gradient(from 45deg,
                ${colorSet.inner} 0deg, ${colorSet.inner} 90deg,
                ${colorSet.core} 90deg,  ${colorSet.core} 180deg,
                ${colorSet.mid} 180deg,  ${colorSet.mid} 270deg,
                ${colorSet.outer} 270deg, ${colorSet.outer} 360deg)`,
              WebkitMaskImage: 'radial-gradient(ellipse 46% 11% at 50% 50%, transparent 60%, black 62%)',
              maskImage: 'radial-gradient(ellipse 46% 11% at 50% 50%, transparent 60%, black 62%)',
              transform: 'rotate(-20deg)',
              filter: `drop-shadow(0 0 2px ${colorSet.inner}aa)`,
            }}
          />
          {/* Core highlight so the center isn't purely dark */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s * 0.22, left: s * 0.24,
              width: s * 0.22, height: s * 0.16,
              background: `radial-gradient(ellipse, ${colorSet.core}aa, transparent 75%)`,
            }}
          />
        </div>
      );
    }
  }

  // If no rarity given, return the bare sphere — this matches the original
  // callsites (inventory, profile) without adding new layers.
  if (tier === 0) {
    return <div className="flex-shrink-0">{sphere}</div>;
  }

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: outer, height: outer }}
    >
      {layers}
      <div className="relative">{sphere}</div>
    </div>
  );
}
