'use client';

import { OrbColorSet, isRainbowColor } from '@/constants/orbColors';

interface Props {
  colorSet: OrbColorSet;
  /** 'orb' for base/pulse, 'ring' for ring-color preview */
  variant: 'orb' | 'ring';
  /** Pixel size of the circle (width = height). Default 48. */
  size?: number;
  /** If this color id is a rainbow variant, render a rainbow preview */
  id?: string;
}

// Rainbow stops, shared between orb + ring variants so both read as "rainbow"
const RAINBOW_STOPS = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#ef4444',
];

/**
 * Faithful preview of an orb or ring color set. The outer color is rendered
 * at full opacity so dark/black rims (e.g. Eternal = black + gold, Obsidian,
 * Stargaze) are actually visible — the previous version used 0x44 alpha on
 * the outer which caused dark rims to vanish into the card background.
 */
export function OrbColorPreview({ colorSet, variant, size = 48, id }: Props) {
  const isRainbow = isRainbowColor(id);
  const s = size;

  if (variant === 'orb') {
    if (isRainbow) {
      return (
        <div
          className="rounded-full flex-shrink-0 relative overflow-hidden"
          style={{
            width: s,
            height: s,
            background: `conic-gradient(from 0deg, ${RAINBOW_STOPS.join(', ')})`,
            boxShadow: '0 0 16px -2px rgba(168,85,247,0.6), inset 0 -6px 10px rgba(0,0,0,0.4)',
          }}
        >
          {/* Specular highlight so it still reads as a sphere */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: s * 0.12,
              left: s * 0.22,
              width: s * 0.4,
              height: s * 0.4,
              background: 'radial-gradient(circle, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%)',
            }}
          />
        </div>
      );
    }
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: s,
          height: s,
          background: `radial-gradient(circle at 35% 28%,
            ${colorSet.core} 0%,
            ${colorSet.inner} 28%,
            ${colorSet.mid} 58%,
            ${colorSet.outer} 92%)`,
          boxShadow: `0 0 14px -2px ${colorSet.mid}cc, inset 0 -4px 6px ${colorSet.outer}`,
        }}
      />
    );
  }

  // Ring variant — dark orb body with two oblate ring arcs in the chosen palette
  if (isRainbow) {
    return (
      <div
        className="rounded-full flex-shrink-0 relative"
        style={{
          width: s,
          height: s,
          background: 'radial-gradient(circle at 35% 30%, #1e1e30, #0b0b14 70%)',
          boxShadow: '0 0 14px -4px rgba(168,85,247,0.6)',
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            inset: 3,
            // Conic rainbow ring
            background: `conic-gradient(from 0deg, ${RAINBOW_STOPS.join(', ')})`,
            WebkitMaskImage:
              'radial-gradient(ellipse 48% 16% at 50% 50%, transparent 60%, black 61%)',
            maskImage:
              'radial-gradient(ellipse 48% 16% at 50% 50%, transparent 60%, black 61%)',
            transform: 'rotate(25deg)',
          }}
        />
        <div
          className="absolute rounded-full opacity-70"
          style={{
            inset: 5,
            background: `conic-gradient(from 90deg, ${RAINBOW_STOPS.join(', ')})`,
            WebkitMaskImage:
              'radial-gradient(ellipse 45% 12% at 50% 50%, transparent 60%, black 61%)',
            maskImage:
              'radial-gradient(ellipse 45% 12% at 50% 50%, transparent 60%, black 61%)',
            transform: 'rotate(-20deg)',
          }}
        />
      </div>
    );
  }
  // Non-rainbow rings: match the actual renderer which distributes outer/mid/inner/core
  // across the ring particles. Show each color as a quarter-arc of the ring.
  const quarterRing = `conic-gradient(from 0deg,
    ${colorSet.outer} 0deg,    ${colorSet.outer} 90deg,
    ${colorSet.mid} 90deg,     ${colorSet.mid} 180deg,
    ${colorSet.inner} 180deg,  ${colorSet.inner} 270deg,
    ${colorSet.core} 270deg,   ${colorSet.core} 360deg)`;
  return (
    <div
      className="rounded-full flex-shrink-0 relative"
      style={{
        width: s,
        height: s,
        background: 'radial-gradient(circle at 35% 30%, #1e1e30, #0b0b14 70%)',
        boxShadow: `0 0 14px -4px ${colorSet.mid}aa`,
      }}
    >
      {/* Primary oblate ring — conic palette cycle + mask to a thin band */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 3,
          background: quarterRing,
          WebkitMaskImage: 'radial-gradient(ellipse 48% 14% at 50% 50%, transparent 60%, black 62%)',
          maskImage: 'radial-gradient(ellipse 48% 14% at 50% 50%, transparent 60%, black 62%)',
          transform: 'rotate(25deg)',
          filter: `drop-shadow(0 0 3px ${colorSet.mid}aa)`,
        }}
      />
      {/* Secondary ring — offset rotation + different stop order so the
          user sees each palette slot somewhere */}
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
    </div>
  );
}
