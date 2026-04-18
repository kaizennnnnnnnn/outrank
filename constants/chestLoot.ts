// Daily chest loot table — one roll per day when the user opens their chest.
// Each roll picks a rarity (weighted) then picks one reward within that rarity.
// Day streak biases toward better rarities (soft pity), and the day-7 chest
// guarantees Epic or Legendary.

export type ChestRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ChestReward {
  id: string;
  label: string;
  detail: string;
  rarity: ChestRarity;
  /** Multi-currency payout — any of these fields may be set. */
  fragments?: number;
  evolutions?: number;
  xp?: number;
  /** Award an XP boost token (24h 2× XP). */
  xpBoost?: boolean;
  /** Award a streak freeze token. */
  streakFreeze?: boolean;
}

export interface RarityConfig {
  rarity: ChestRarity;
  name: string;
  color: string;
  glow: string;
  label: string;
}

export const RARITY_CONFIG: Record<ChestRarity, RarityConfig> = {
  common:    { rarity: 'common',    name: 'Common',    color: '#94a3b8', glow: 'rgba(148,163,184,0.45)', label: 'A standard drop.' },
  uncommon:  { rarity: 'uncommon',  name: 'Uncommon',  color: '#22c55e', glow: 'rgba(34,197,94,0.55)',  label: 'Better than usual.' },
  rare:      { rarity: 'rare',      name: 'Rare',      color: '#3b82f6', glow: 'rgba(59,130,246,0.6)',  label: 'A genuine find.' },
  epic:      { rarity: 'epic',      name: 'Epic',      color: '#a855f7', glow: 'rgba(168,85,247,0.7)',  label: 'Worth celebrating.' },
  legendary: { rarity: 'legendary', name: 'Legendary', color: '#fbbf24', glow: 'rgba(251,191,36,0.8)',  label: 'One-in-a-hundred.' },
};

// Base rarity weights — higher = more likely. Normalized to 1.0 at roll time.
const BASE_WEIGHTS: Record<ChestRarity, number> = {
  common:    50,
  uncommon:  30,
  rare:      15,
  epic:      4,
  legendary: 1,
};

// Reward pool grouped by rarity. Each rarity picks one reward uniformly.
export const LOOT_POOL: Record<ChestRarity, ChestReward[]> = {
  common: [
    { id: 'frag_10',  label: '+10 Fragments',   detail: 'A small pile of shards.',         rarity: 'common', fragments: 10 },
    { id: 'frag_15',  label: '+15 Fragments',   detail: 'A small pile of shards.',         rarity: 'common', fragments: 15 },
    { id: 'xp_25',    label: '+25 XP',          detail: 'A nudge on your level bar.',       rarity: 'common', xp: 25 },
  ],
  uncommon: [
    { id: 'frag_30',  label: '+30 Fragments',   detail: 'A decent payout.',                 rarity: 'uncommon', fragments: 30 },
    { id: 'frag_50',  label: '+50 Fragments',   detail: 'A decent payout.',                 rarity: 'uncommon', fragments: 50 },
    { id: 'xp_75',    label: '+75 XP',          detail: 'A solid bump.',                    rarity: 'uncommon', xp: 75 },
    { id: 'freeze_1', label: 'Streak Freeze',   detail: 'One free miss — keep your streak.', rarity: 'uncommon', streakFreeze: true },
  ],
  rare: [
    { id: 'frag_120', label: '+120 Fragments',  detail: 'A rare haul.',                      rarity: 'rare', fragments: 120 },
    { id: 'frag_150', label: '+150 Fragments',  detail: 'A rare haul.',                      rarity: 'rare', fragments: 150 },
    { id: 'evo_1',    label: '+1 Evolution',    detail: 'Rank your orb up one tier.',        rarity: 'rare', evolutions: 1 },
    { id: 'boost',    label: '2× XP for 24h',   detail: 'Double XP for the next day.',       rarity: 'rare', xpBoost: true },
  ],
  epic: [
    { id: 'frag_300', label: '+300 Fragments',  detail: 'An epic payout.',                    rarity: 'epic', fragments: 300 },
    { id: 'evo_2',    label: '+2 Evolutions',   detail: 'Two orb ranks in one drop.',          rarity: 'epic', evolutions: 2 },
    { id: 'bundle',   label: '+150 Frag · +1 Evo', detail: 'Mixed epic bundle.',               rarity: 'epic', fragments: 150, evolutions: 1 },
  ],
  legendary: [
    { id: 'legend',   label: '+600 Frag · +2 Evo · 2× XP', detail: 'Legendary haul. One in a hundred.', rarity: 'legendary', fragments: 600, evolutions: 2, xpBoost: true },
    { id: 'mythic',   label: '+1000 Fragments',             detail: 'A mountain of shards.',            rarity: 'legendary', fragments: 1000 },
    { id: 'ascend',   label: '+3 Evolutions · +200 Frag',   detail: 'Max orb climb in one drop.',        rarity: 'legendary', evolutions: 3, fragments: 200 },
  ],
};

/**
 * Roll a chest reward.
 *
 * Streak bias: every 3 days of streak, shift a little weight from common toward
 * uncommon+rare+epic. Day 7 (the weekly chest) guarantees at least Epic.
 */
export function rollChestReward(streakDay: number, seed: number = Math.random()): ChestReward {
  const weights: Record<ChestRarity, number> = { ...BASE_WEIGHTS };

  // Streak pity: up to +20% uncommon, +10% rare, +5% epic for long streaks
  const bias = Math.min(1, streakDay / 30);
  weights.common -= 25 * bias;
  weights.uncommon += 15 * bias;
  weights.rare += 7 * bias;
  weights.epic += 2 * bias;
  weights.legendary += 1 * bias;

  // Day-7 guarantee: Epic or Legendary only
  const isWeekly = streakDay > 0 && streakDay % 7 === 0;

  let rarity: ChestRarity;
  if (isWeekly) {
    rarity = seed < 0.8 ? 'epic' : 'legendary';
  } else {
    const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0);
    let r = seed * total;
    rarity = 'common';
    for (const key of ['legendary', 'epic', 'rare', 'uncommon', 'common'] as ChestRarity[]) {
      const w = Math.max(0, weights[key]);
      if (r < w) { rarity = key; break; }
      r -= w;
    }
  }

  const pool = LOOT_POOL[rarity];
  const pick = pool[Math.floor((seed * 1000) % pool.length)];
  return pick;
}
