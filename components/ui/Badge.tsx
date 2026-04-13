'use client';

import { cn } from '@/lib/utils';
import { BadgeRarity, RARITY_COLORS } from '@/types/badge';

interface BadgeChipProps {
  name: string;
  icon: string;
  rarity: BadgeRarity;
  size?: 'sm' | 'md';
  className?: string;
}

export function BadgeChip({ name, icon, rarity, size = 'md', className }: BadgeChipProps) {
  const color = RARITY_COLORS[rarity];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm',
        rarity === 'legendary' && 'animate-pulse',
        className
      )}
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
        color,
      }}
    >
      <span>{icon}</span>
      <span className="font-semibold">{name}</span>
    </div>
  );
}
