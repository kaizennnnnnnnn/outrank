'use client';

import { cn } from '@/lib/utils';
import { getCategoryIconComponent } from './CategoryIcons';
import { resolveSlug } from '@/constants/categories';

interface CategoryIconProps {
  icon: string; // legacy prop — kept for compat, no longer rendered as emoji
  color: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  className?: string;
  slug?: string;
  name?: string; // when slug is missing, we'll resolve from display name
}

const sizeMap = {
  sm: { container: 'w-9 h-9', iconSize: 18, radius: 'rounded-xl' },
  md: { container: 'w-12 h-12', iconSize: 24, radius: 'rounded-2xl' },
  lg: { container: 'w-16 h-16', iconSize: 32, radius: 'rounded-2xl' },
};

/**
 * Category tile — "gemstone" treatment.
 *
 * What each layer contributes:
 *   - Base gradient      : color-tinted diagonal wash into near-black bottom.
 *                          Gives the tile a warm/cool cast without going flat.
 *   - Radial spotlight   : bright color pooled in the top-left. Reads as a
 *                          virtual light source and prevents the tile from
 *                          looking like a flat swatch.
 *   - Rim (box-shadow)   : inset 1px color rim + 1px white hairline inside
 *                          creates a "polished edge". The outer drop-shadow
 *                          is tinted with the category color so the tile
 *                          floats above dark backgrounds instead of sitting
 *                          flush.
 *   - Specular sheen     : narrow high-opacity stripe near top-left. The
 *                          classic "glass" highlight you get on iOS icons.
 *   - Bottom curtain     : subtle inner shadow along the bottom edge so the
 *                          tile doesn't look bottom-heavy or printed-on.
 *   - Icon drop-shadow   : adds color-matched glow behind the SVG so it
 *                          separates from the background at small sizes.
 *
 * Selected state: same layers, cranked up (brighter base + thicker rim +
 * full-tile outer glow). No new layers so sizing never jumps.
 */
export function CategoryIcon({ color, size = 'md', selected, className, slug, name }: CategoryIconProps) {
  const s = sizeMap[size];
  const resolvedSlug = resolveSlug(slug, name) || 'generic';
  const IconComponent = getCategoryIconComponent(resolvedSlug);

  const baseGradient = selected
    ? `linear-gradient(155deg, ${color}55 0%, ${color}22 55%, #0a0a14 100%)`
    : `linear-gradient(155deg, ${color}32 0%, ${color}14 55%, #0a0a14 100%)`;

  const spotlight = selected
    ? `radial-gradient(circle at 28% 22%, ${color}88 0%, ${color}22 35%, transparent 65%)`
    : `radial-gradient(circle at 28% 22%, ${color}55 0%, ${color}18 35%, transparent 60%)`;

  const rimShadow = [
    // Outer color-tinted lift — gives the tile altitude above the surface.
    selected
      ? `0 6px 22px -6px ${color}80, 0 1px 0 rgba(255,255,255,0.10)`
      : `0 4px 14px -6px ${color}55, 0 1px 0 rgba(255,255,255,0.06)`,
    // Inner rim: thin color ring for the gem edge.
    selected ? `inset 0 0 0 1.5px ${color}90` : `inset 0 0 0 1px ${color}40`,
    // Inner hairline: white-ish highlight just inside the rim, sells the polish.
    'inset 0 1px 0 rgba(255,255,255,0.18)',
    // Bottom-edge darken — depth.
    'inset 0 -8px 12px -10px rgba(0,0,0,0.6)',
  ].join(', ');

  return (
    <div className={cn('relative group', className)}>
      {/* Soft ambient aura — only when selected, so non-selected grids don't bleed into each other. */}
      {selected && (
        <div
          className="absolute -inset-2 rounded-[inherit] opacity-50 blur-lg pointer-events-none"
          style={{ background: color }}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden transition-all duration-200',
          s.container,
          s.radius,
          'group-hover:-translate-y-0.5',
        )}
        style={{ background: baseGradient, boxShadow: rimShadow }}
      >
        {/* Radial spotlight — a pool of color pouring from the top-left corner. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: spotlight }}
          aria-hidden
        />

        {/* Top-rim gleam — brighter than the baseline hairline, fades at the sides. */}
        <div
          className="absolute top-0 left-[12%] right-[12%] h-[1px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, rgba(255,255,255,0.6), ${color}, transparent)`,
            opacity: selected ? 0.9 : 0.55,
          }}
          aria-hidden
        />

        {/* Specular sheen — the glassy glint near the upper-left corner. */}
        <div
          className="absolute top-0 left-0 w-[55%] h-[42%] pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)',
            borderTopLeftRadius: 'inherit',
            opacity: selected ? 0.95 : 0.7,
          }}
          aria-hidden
        />

        {/* Icon — color tinted + drop-shadow in the same color for separation. */}
        <div
          className="relative z-10"
          style={{
            color,
            filter: `drop-shadow(0 1px 0 rgba(0,0,0,0.45)) drop-shadow(0 0 10px ${color}70)`,
          }}
        >
          <IconComponent size={s.iconSize} />
        </div>

        {/* Bottom curtain — gradient fade that grounds the tile. */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-[1px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            opacity: 0.25,
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
