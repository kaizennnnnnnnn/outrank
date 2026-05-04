/**
 * Orb evolution loot — fired when the user spends an evolution charge.
 *
 * The orb is now always at max tier visually; "evolving" no longer
 * bumps a tier. Instead it rolls one drop from a weighted rarity
 * table. All passive XP buffs / per-tier powers are gone — the only
 * way to gain orb-driven rewards is through these loot pulls.
 *
 * Pure logic only — no Firestore writes here. The caller spends the
 * charge + applies the reward in one transaction.
 */

import { ChestRarity, RARITY_CONFIG } from '@/constants/chestLoot';
import { PFP_FRAMES, NAME_EFFECTS, type PfpFrame, type NameEffect } from '@/constants/cosmetics';

type Cosmetic = PfpFrame | NameEffect;
const ALL_COSMETICS: Cosmetic[] = [...PFP_FRAMES, ...NAME_EFFECTS];

export type OrbLootRarity = ChestRarity;

export interface OrbLoot {
  rarity:    OrbLootRarity;
  /** Human label shown in the result modal. */
  label:     string;
  /** One-line flavor text. */
  detail:    string;
  /** Reward payload — caller writes these to users/{uid}. */
  fragments?:      number;
  xp?:             number;
  /** Push the awakening bar up by this many points (clamped to 100). */
  awakening?:      number;
  /** Cosmetic ID to grant (added to ownedCosmetics). */
  cosmeticId?:     string;
  /** Cosmetic display name (denormalized for the result modal). */
  cosmeticName?:   string;
}

// ─── Rarity weights ──────────────────────────────────────────────────

/** 60 / 25 / 12 / 3 split. Sum to 100. Adjust here if balance shifts. */
const RARITY_WEIGHTS: Record<Exclude<OrbLootRarity, 'uncommon'>, number> = {
  common:    60,
  rare:      25,
  epic:      12,
  legendary: 3,
};

function rollRarity(rng = Math.random()): OrbLootRarity {
  const r = rng * 100;
  if (r < RARITY_WEIGHTS.legendary) return 'legendary';
  if (r < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic) return 'epic';
  if (r < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) return 'rare';
  return 'common';
}

// ─── Drop pools ──────────────────────────────────────────────────────

function rollCommon(): OrbLoot {
  // Either fragments OR a small XP injection. Slight bias toward
  // fragments since they're the universal currency.
  if (Math.random() < 0.65) {
    const fragments = 40 + Math.floor(Math.random() * 41); // 40..80
    return {
      rarity: 'common',
      label: `${fragments} Fragments`,
      detail: 'Useful currency. Spend in the shop.',
      fragments,
    };
  }
  const xp = 30 + Math.floor(Math.random() * 31); // 30..60
  return {
    rarity: 'common',
    label: `${xp} XP`,
    detail: 'Instant XP injection.',
    xp,
  };
}

function rollRare(): OrbLoot {
  const fragments = 100 + Math.floor(Math.random() * 101); // 100..200
  const xp        = 80  + Math.floor(Math.random() * 71);  // 80..150
  return {
    rarity: 'rare',
    label: `${fragments} Fragments + ${xp} XP`,
    detail: 'A solid pull — fragments, XP, and a small awakening boost.',
    fragments,
    xp,
    awakening: 5,
  };
}

function rollEpic(ownedCosmetics: string[]): OrbLoot {
  // 50/50: cosmetic upgrade or a chunky 300-fragment payout.
  // Cosmetic pull pulls from rare/epic frames the user doesn't own
  // yet; if there's nothing to give, fall back to fragments.
  if (Math.random() < 0.5) {
    const eligible = ALL_COSMETICS.filter(
      (c) =>
        (c.rarity === 'rare' || c.rarity === 'epic') &&
        !ownedCosmetics.includes(c.id),
    );
    if (eligible.length > 0) {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      return {
        rarity: 'epic',
        label: pick.name,
        detail: pick.description,
        cosmeticId:   pick.id,
        cosmeticName: pick.name,
        // Sweetener so the pull never feels purely cosmetic
        fragments: 50,
      };
    }
  }
  return {
    rarity: 'epic',
    label: '300 Fragments',
    detail: 'A heavy fragment haul.',
    fragments: 300,
  };
}

function rollLegendary(ownedCosmetics: string[]): OrbLoot {
  // Always tries to grant a legendary frame the user doesn't own;
  // if they own them all, fall back to a 1500-fragment jackpot.
  const eligible = ALL_COSMETICS.filter(
    (c) =>
      (c.rarity === 'legendary' || c.rarity === 'mythic') &&
      c.id.startsWith('frame_') &&
      !ownedCosmetics.includes(c.id),
  );
  if (eligible.length > 0) {
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    return {
      rarity: 'legendary',
      label: pick.name,
      detail: pick.description,
      cosmeticId:   pick.id,
      cosmeticName: pick.name,
      fragments: 200,   // bonus on top — legendary should always feel huge
      awakening: 15,
    };
  }
  return {
    rarity: 'legendary',
    label: '1500 Fragments',
    detail: 'Jackpot — your collection is already complete.',
    fragments: 1500,
    awakening: 15,
  };
}

// ─── Top-level entry ─────────────────────────────────────────────────

export function rollOrbLoot(ownedCosmetics: string[] = []): OrbLoot {
  const rarity = rollRarity();
  switch (rarity) {
    case 'common':    return rollCommon();
    case 'rare':      return rollRare();
    case 'epic':      return rollEpic(ownedCosmetics);
    case 'legendary': return rollLegendary(ownedCosmetics);
    default:          return rollCommon(); // unreachable; uncommon excluded
  }
}

/** UI helper — get the rarity color/glow palette for display. */
export function lootColors(rarity: OrbLootRarity) {
  return RARITY_CONFIG[rarity];
}
