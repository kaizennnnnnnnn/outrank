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
  sm: { container: 'w-9 h-9', iconSize: 16 },
  md: { container: 'w-12 h-12', iconSize: 22 },
  lg: { container: 'w-16 h-16', iconSize: 30 },
};

export function CategoryIcon({ color, size = 'md', selected, className, slug, name }: CategoryIconProps) {
  const s = sizeMap[size];

  // Always render SVG. Resolve slug from display name if missing.
  const resolvedSlug = resolveSlug(slug, name) || 'generic';
  const IconComponent = getCategoryIconComponent(resolvedSlug);

  return (
    <div className={cn('relative group', className)}>
      {/* Outer glow on selected/hover */}
      {selected && (
        <div
          className="absolute -inset-1.5 rounded-2xl opacity-25 blur-lg transition-opacity"
          style={{ background: color }}
        />
      )}

      {/* Main container */}
      <div
        className={cn(
          'relative rounded-xl flex items-center justify-center overflow-hidden transition-all duration-200',
          s.container,
        )}
        style={{
          background: `linear-gradient(145deg, ${color}18 0%, ${color}08 50%, ${color}04 100%)`,
          boxShadow: selected
            ? `inset 0 0 0 1.5px ${color}50, 0 0 20px ${color}15`
            : `inset 0 0 0 1px ${color}15`,
        }}
      >
        {/* Top highlight line */}
        <div
          className="absolute top-0 left-[20%] right-[20%] h-[1px] opacity-30"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />

        {/* Inner radial glow */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background: `radial-gradient(circle at 35% 25%, ${color} 0%, transparent 55%)`,
          }}
        />

        {/* Icon — always SVG */}
        <div className="relative z-10" style={{ color }}>
          <IconComponent size={s.iconSize} />
        </div>

        {/* Bottom accent */}
        <div
          className="absolute bottom-0 left-[15%] right-[15%] h-[1px] opacity-15"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
      </div>
    </div>
  );
}
