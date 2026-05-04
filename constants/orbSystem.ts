// ============================================
// OUTRANK ORB SYSTEM — The Core Progression Engine
// ============================================

// --- ORB POWERS / AURAS — DEPRECATED ---
// The orb is now fully evolved (max tier) for every user as a visual
// state only. There are no automatic XP buffs, bonus slots, or per-
// tier powers anymore. All power comes from loot pulls on the orb
// command center (lib/orbLoot.ts).
//
// These types + getters are kept as no-op stubs so any caller still
// referencing them (mostly OrbHistory.tsx display code, gated on
// truthy / xpMultiplier > 1) silently renders nothing.

export interface OrbPower {
  id: string;
  name: string;
  description: string;
  tier: number;
}

export const ORB_POWERS: OrbPower[] = [];

export function getOrbPower(_tier: number): OrbPower | null {
  return null;
}

export interface OrbAura {
  tier: number;
  name: string;
  xpMultiplier: number;
  bonusSlots: number;
  description: string;
}

const NO_AURA: OrbAura = {
  tier: 0,
  name: 'None',
  xpMultiplier: 1.0,
  bonusSlots: 0,
  description: 'Orb power comes from evolution loot, not tier.',
};

export const ORB_AURAS: OrbAura[] = [NO_AURA];

export function getOrbAura(_tier: number): OrbAura {
  return NO_AURA;
}

// --- ORB ENERGY (daily fill/drain) ---
// Energy: 0-100. Fills when you log, drains when you don't.
// At 0 energy, orb goes dormant (lose tier power).
export const ORB_ENERGY = {
  MAX: 100,
  PER_LOG: 15,         // +15 energy per habit logged
  DAILY_DRAIN: 20,     // -20 energy per day if you don't log
  STREAK_BONUS: 5,     // +5 bonus per active streak day
  DORMANT_THRESHOLD: 0, // below this = dormant
};

// --- ORB DECAY ---
// Miss consecutive days → lose tiers
export const ORB_DECAY = {
  DAYS_TO_DIM: 1,       // Day 1 missed: orb dims
  DAYS_TO_LOSE_EFFECTS: 2, // Day 2: lose rings and arcs visually
  DAYS_TO_DEEVOLVE: 3,  // Day 3: de-evolve one tier
};

// --- FRAGMENTS (currency) ---
export interface FragmentSource {
  id: string;
  name: string;
  amount: number;
  description: string;
}

export const FRAGMENT_SOURCES: FragmentSource[] = [
  { id: 'daily_complete', name: 'Daily Completion', amount: 5, description: 'Log all your habits for the day' },
  { id: 'duel_win', name: 'Duel Victory', amount: 15, description: 'Win a 1v1 duel' },
  { id: 'weekly_first', name: 'Weekly #1', amount: 50, description: 'Finish #1 on the Orb Leaderboard' },
  { id: 'weekly_top3', name: 'Weekly Top 3', amount: 25, description: 'Finish top 3 on the Orb Leaderboard' },
  { id: 'evolution', name: 'Evolution', amount: 30, description: 'Evolve your orb to the next tier' },
  { id: 'streak_7', name: '7-Day Streak', amount: 10, description: 'Maintain a 7-day streak' },
  { id: 'streak_30', name: '30-Day Streak', amount: 25, description: 'Maintain a 30-day streak' },
  { id: 'gift', name: 'Gift Received', amount: 5, description: 'Receive a fragment gift from a friend' },
];

// --- DUEL PRIZES ---
export interface DuelPrize {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'fragments' | 'orb_color' | 'instant_evolve' | 'xp_boost' | 'badge';
  value: number | string; // number for fragments/xp, string for color/badge id
}

export const DUEL_PRIZES: DuelPrize[] = [
  { id: 'frag_10', name: '10 Fragments', description: 'A handful of orb fragments', rarity: 'common', type: 'fragments', value: 10 },
  { id: 'frag_25', name: '25 Fragments', description: 'A solid fragment reward', rarity: 'rare', type: 'fragments', value: 25 },
  { id: 'xp_50', name: '50 Bonus XP', description: 'Instant XP injection', rarity: 'common', type: 'xp_boost', value: 50 },
  { id: 'xp_100', name: '100 Bonus XP', description: 'Major XP boost', rarity: 'rare', type: 'xp_boost', value: 100 },
  { id: 'color_aurora', name: 'Aurora Orb', description: 'Unlock the Aurora base color for your orb', rarity: 'epic', type: 'orb_color', value: 'aurora' },
  { id: 'color_void', name: 'Void Orb', description: 'Unlock the Void base color — pure darkness', rarity: 'epic', type: 'orb_color', value: 'void' },
  { id: 'instant_evolve', name: 'Instant Evolution', description: 'Instantly evolve your orb to the next tier', rarity: 'legendary', type: 'instant_evolve', value: 1 },
  { id: 'badge_duel_master', name: 'Duel Master', description: 'Exclusive badge for duel champions', rarity: 'legendary', type: 'badge', value: 'duel_master' },
];

// Weighted prize selection — common prizes more likely
export function rollDuelPrize(): DuelPrize {
  const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
  const roll = Math.random() * 100;
  let rarity: DuelPrize['rarity'];
  if (roll < weights.legendary) rarity = 'legendary';
  else if (roll < weights.legendary + weights.epic) rarity = 'epic';
  else if (roll < weights.legendary + weights.epic + weights.rare) rarity = 'rare';
  else rarity = 'common';

  const pool = DUEL_PRIZES.filter(p => p.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// --- ORB HISTORY EVENTS ---
export type OrbEventType =
  | 'evolution'
  | 'deevolution'
  | 'power_unlocked'
  | 'duel_won'
  | 'duel_lost'
  | 'weekly_first'
  | 'fragment_earned'
  | 'prize_won'
  | 'dormant'
  | 'awakened'
  | 'color_unlocked';

export interface OrbHistoryEvent {
  type: OrbEventType;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// --- WEEKLY DISCIPLINE SCORE ---
// Used for Orb Leaderboard — combines multiple factors
export function calculateDisciplineScore(
  habitsLoggedToday: number,
  totalHabits: number,
  currentStreaks: number,
  orbTier: number,
  orbEnergy: number,
): number {
  const completionRate = totalHabits > 0 ? habitsLoggedToday / totalHabits : 0;
  const streakBonus = currentStreaks * 2;
  const tierBonus = orbTier * 10;
  const energyBonus = orbEnergy * 0.1;

  return Math.round(completionRate * 50 + streakBonus + tierBonus + energyBonus);
}
