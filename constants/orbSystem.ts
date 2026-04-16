// ============================================
// OUTRANK ORB SYSTEM — The Core Progression Engine
// ============================================

// --- ORB POWERS (unlocked per tier) ---
export interface OrbPower {
  id: string;
  name: string;
  description: string;
  tier: number;
}

export const ORB_POWERS: OrbPower[] = [
  { id: 'spark_shield', name: 'Spark Shield', description: '1 free streak freeze per week', tier: 1 },
  { id: 'insight', name: 'Insight', description: 'See any friend\'s habit completion for today', tier: 2 },
  { id: 'double_burn', name: 'Double Burn', description: 'Once per day, log a habit for 2x XP', tier: 3 },
  { id: 'rebirth', name: 'Rebirth', description: 'Restore a broken streak once per month', tier: 4 },
  { id: 'gravity', name: 'Gravity', description: 'Your logs give +2 bonus XP to friends who log the same habit within 24h', tier: 5 },
];

export function getOrbPower(tier: number): OrbPower | null {
  return ORB_POWERS.find(p => p.tier === tier) || null;
}

// --- ORB AURA (passive XP buffs) ---
export interface OrbAura {
  tier: number;
  name: string;
  xpMultiplier: number; // 1.0 = no buff, 1.1 = +10%
  bonusSlots: number;
  description: string;
}

export const ORB_AURAS: OrbAura[] = [
  { tier: 1, name: 'None', xpMultiplier: 1.0, bonusSlots: 0, description: 'No aura yet' },
  { tier: 2, name: 'Warm Aura', xpMultiplier: 1.05, bonusSlots: 0, description: '+5% XP on all logs' },
  { tier: 3, name: 'Burning Aura', xpMultiplier: 1.10, bonusSlots: 0, description: '+10% XP + streak freeze refills 2x/week' },
  { tier: 4, name: 'Radiant Aura', xpMultiplier: 1.15, bonusSlots: 1, description: '+15% XP + 1 bonus habit slot' },
  { tier: 5, name: 'Cosmic Aura', xpMultiplier: 1.20, bonusSlots: 2, description: '+20% XP + 2 bonus habit slots + name glows on leaderboards' },
];

export function getOrbAura(tier: number): OrbAura {
  return ORB_AURAS.find(a => a.tier === tier) || ORB_AURAS[0];
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
