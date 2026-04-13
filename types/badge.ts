import { Timestamp } from 'firebase/firestore';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  xpReward: number;
  condition: string;
  category?: string;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: Timestamp;
}

export const RARITY_COLORS: Record<BadgeRarity, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};
