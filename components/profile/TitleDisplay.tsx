'use client';

import { getLevelForXP } from '@/constants/levels';

const titleColors: Record<string, string> = {
  Rookie: '#94a3b8',
  Grinder: '#94a3b8',
  Contender: '#3b82f6',
  Rival: '#3b82f6',
  Warrior: '#3b82f6',
  Veteran: '#3b82f6',
  Champion: '#2563eb',
  Elite: '#2563eb',
  Master: '#ec4899',
  Grandmaster: '#ec4899',
  Legend: '#f59e0b',
  Mythic: '#f59e0b',
  Immortal: '#ef4444',
  Ascended: '#ef4444',
  Transcendent: '#06b6d4',
  'The GOAT': '#f59e0b',
};

interface TitleDisplayProps {
  totalXP: number;
  size?: 'sm' | 'md';
}

export function TitleDisplay({ totalXP, size = 'md' }: TitleDisplayProps) {
  const level = getLevelForXP(totalXP);
  const color = titleColors[level.title] || '#94a3b8';

  return (
    <span
      className={`font-heading font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
      style={{ color }}
    >
      {level.title}
    </span>
  );
}
