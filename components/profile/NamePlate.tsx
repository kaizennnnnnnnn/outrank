'use client';

import { getNameEffect, NameAnimation } from '@/constants/cosmetics';
import { cn } from '@/lib/utils';

interface Props {
  name: string;
  effectId?: string | null;
  className?: string;
  /** Size — controls font size on top of className */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

/** Map NameAnimation → CSS class defined in globals.css. */
const animClassMap: Record<NameAnimation, string> = {
  shimmer:        'animate-name-shimmer',
  pulse:          'animate-name-pulse',
  'rainbow-shift': 'animate-name-rainbow',
  cosmic:         'animate-name-cosmic',
  glitch:         'animate-name-glitch',
  electric:       'animate-name-electric',
  inferno:        'animate-name-inferno',
  prismatic:      'animate-name-prismatic',
  holographic:    'animate-name-holographic',
  void:           'animate-name-void',
  mythic:         'animate-name-mythic',
  ember:          'animate-name-ember',
  ghost:          'animate-name-ghost',
  molten:         'animate-name-molten',
  aurora:         'animate-name-aurora',
};

// Animations that need the gradient to move laterally (oversize background).
const needsWideBackground = new Set<NameAnimation>([
  'shimmer', 'rainbow-shift', 'cosmic', 'inferno', 'holographic',
  'mythic', 'ember', 'molten', 'aurora',
]);

// Animations whose drop-shadow should track the current color (use text color
// fallback) rather than a fixed color in CSS. These look best when we let the
// fill color drive the shadow.
const usesCurrentColorShadow = new Set<NameAnimation>([
  'pulse', 'electric', 'prismatic', 'void', 'ghost', 'cosmic',
]);

/**
 * Username rendered with an equipped cosmetic name effect (gradient +
 * optional animation). Falls back to plain white if no effect set.
 */
export function NamePlate({ name, effectId, className, size = 'md' }: Props) {
  const e = getNameEffect(effectId);

  if (e.id === 'name_plain') {
    return <span className={cn(sizeClass[size], 'font-bold text-white', className)}>{name}</span>;
  }

  const gradient = e.colors.length === 1
    ? e.colors[0]
    : `linear-gradient(90deg, ${e.colors.join(', ')})`;

  const animClass = e.animated ? animClassMap[e.animated] : '';
  const wideBg = e.animated && needsWideBackground.has(e.animated);
  const shadow = e.animated && usesCurrentColorShadow.has(e.animated);

  // Glitch is special: it colors letters directly (no bg-clip) so its RGB-split
  // text-shadow is visible. Everything else uses the gradient fill.
  if (e.animated === 'glitch') {
    return (
      <span
        className={cn(sizeClass[size], 'font-bold inline-block', animClass, className)}
        style={{
          color: e.colors[1] || '#ffffff',
        }}
      >
        {name}
      </span>
    );
  }

  return (
    <span
      className={cn(
        sizeClass[size],
        'font-bold inline-block bg-clip-text text-transparent',
        animClass,
        className,
      )}
      style={{
        background: gradient,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        backgroundSize: wideBg ? '200% 100%' : undefined,
        filter: shadow ? 'drop-shadow(0 0 6px currentColor)' : undefined,
      }}
    >
      {name}
    </span>
  );
}
