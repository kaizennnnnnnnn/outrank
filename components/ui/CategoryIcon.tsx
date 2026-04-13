'use client';

import { cn } from '@/lib/utils';
import { getCategoryIconComponent } from './CategoryIcons';

interface CategoryIconProps {
  icon: string; // emoji fallback
  color: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  className?: string;
  slug?: string; // category slug for custom SVG lookup
}

const sizeMap = {
  sm: { container: 'w-9 h-9', iconSize: 16 },
  md: { container: 'w-12 h-12', iconSize: 22 },
  lg: { container: 'w-16 h-16', iconSize: 30 },
};

export function CategoryIcon({ icon, color, size = 'md', selected, className, slug }: CategoryIconProps) {
  const s = sizeMap[size];

  // Try to get custom SVG icon, fall back to emoji
  const IconComponent = slug ? getCategoryIconComponent(slug) : null;

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

        {/* Icon — custom SVG or emoji fallback */}
        <div className="relative z-10" style={{ color }}>
          {IconComponent ? (
            <IconComponent size={s.iconSize} />
          ) : (
            <span className={cn(size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl', 'drop-shadow-sm')}>
              {icon}
            </span>
          )}
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
