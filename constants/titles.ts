// Titles — equippable unlocks displayed next to the username across the app.

export type TitleRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: TitleRarity;
  /** Resolve from a user profile. Return true when the title is unlocked. */
  unlocked: (ctx: TitleContext) => boolean;
}

export interface TitleContext {
  totalXP: number;
  level: number;
  longestStreak: number;
  totalLogs: number;
  friendCount: number;
  duelWins: number;
  badgeCount: number;
  morningLogs: number;      // logs with hour < 10
  nightLogs: number;        // logs with hour >= 22
  perfectDays: number;      // days where every habit was logged
  orbTier: number;
  prestige: number;
}

export const TITLES: Title[] = [
  { id: 'rookie',      name: 'Rookie',         description: 'The starting title.',             rarity: 'common',    unlocked: () => true },
  { id: 'first_steps', name: 'First Steps',    description: 'Log your first habit.',           rarity: 'common',    unlocked: (c) => c.totalLogs >= 1 },
  { id: 'challenger',  name: 'The Challenger', description: 'Win your first duel.',            rarity: 'rare',      unlocked: (c) => c.duelWins >= 1 },
  { id: 'unbroken',    name: 'The Unbroken',   description: 'Hold a 90-day streak.',           rarity: 'legendary', unlocked: (c) => c.longestStreak >= 90 },
  { id: 'daybreaker',  name: 'Daybreaker',     description: 'Log 100 times before 10 AM.',     rarity: 'epic',      unlocked: (c) => c.morningLogs >= 100 },
  { id: 'nightowl',    name: 'Night Owl',      description: 'Log 100 times after 10 PM.',      rarity: 'epic',      unlocked: (c) => c.nightLogs >= 100 },
  { id: 'iron_will',   name: 'Iron Will',      description: '30-day streak on any habit.',     rarity: 'epic',      unlocked: (c) => c.longestStreak >= 30 },
  { id: 'centurion',   name: 'Centurion',      description: '100 total logs.',                 rarity: 'rare',      unlocked: (c) => c.totalLogs >= 100 },
  { id: 'veteran',     name: 'Veteran',        description: '1000 total logs.',                rarity: 'legendary', unlocked: (c) => c.totalLogs >= 1000 },
  { id: 'social',      name: 'The Social',     description: 'Have 10 friends.',                rarity: 'rare',      unlocked: (c) => c.friendCount >= 10 },
  { id: 'perfectionist', name: 'Perfectionist', description: '30 perfect days.',               rarity: 'legendary', unlocked: (c) => c.perfectDays >= 30 },
  { id: 'collector',   name: 'Collector',      description: 'Earn 20 badges.',                 rarity: 'epic',      unlocked: (c) => c.badgeCount >= 20 },
  { id: 'legend',      name: 'The Legend',     description: 'Reach level 50.',                 rarity: 'legendary', unlocked: (c) => c.level >= 50 },
  { id: 'dominator',   name: 'Dominator',      description: 'Win 25 duels.',                   rarity: 'legendary', unlocked: (c) => c.duelWins >= 25 },
  { id: 'transcendent', name: 'Transcendent',  description: 'Ascend your orb to tier 10.',     rarity: 'mythic',    unlocked: (c) => c.orbTier >= 10 },
  { id: 'reborn',      name: 'The Reborn',     description: 'Complete one prestige cycle.',    rarity: 'mythic',    unlocked: (c) => c.prestige >= 1 },
  { id: 'ascendant',   name: 'Ascendant',      description: 'Complete 5 prestige cycles.',     rarity: 'mythic',    unlocked: (c) => c.prestige >= 5 },
];

export function getUnlockedTitles(ctx: TitleContext): Title[] {
  return TITLES.filter((t) => t.unlocked(ctx));
}

export function getTitleById(id: string | undefined | null): Title | undefined {
  if (!id) return undefined;
  return TITLES.find((t) => t.id === id);
}

export const TITLE_RARITY_COLOR: Record<TitleRarity, string> = {
  common: '#94a3b8',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#f9a8d4',
};
