'use client';

import { getNameEffect } from '@/constants/cosmetics';
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

  const animClass =
    e.animated === 'shimmer' ? 'animate-name-shimmer' :
    e.animated === 'pulse' ? 'animate-name-pulse' :
    e.animated === 'rainbow-shift' ? 'animate-name-rainbow' :
    '';

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
        // Animated effects enlarge the background to make the animation visible
        backgroundSize: e.animated ? '200% 100%' : undefined,
        filter: e.animated === 'pulse' ? 'drop-shadow(0 0 6px currentColor)' : undefined,
      }}
    >
      {name}
    </span>
  );
}
