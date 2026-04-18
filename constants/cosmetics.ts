// Account cosmetics — PFP frames + username color/effects.
// Stored as ids in ownedCosmetics[] on the user doc and equipped via
// equippedFrame / equippedNameEffect fields. Everyone sees them when they
// load someone's profile or see their avatar in the feed.

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface PfpFrame {
  id: string;
  name: string;
  rarity: CosmeticRarity;
  /** Gradient stops for the outer ring. */
  colors: string[];
  /** Render mode — plain ring, double ring, spinning conic, etc. */
  style: 'ring' | 'double' | 'conic' | 'wreath' | 'halo';
  /** Animated (adds subtle spin / pulse). */
  animated?: boolean;
  description: string;
}

export interface NameEffect {
  id: string;
  name: string;
  rarity: CosmeticRarity;
  /** Colors for the gradient. */
  colors: string[];
  /** Optional animation mode. */
  animated?: 'shimmer' | 'pulse' | 'rainbow-shift';
  description: string;
}

export const PFP_FRAMES: PfpFrame[] = [
  { id: 'frame_none',        name: 'None',            rarity: 'common',    colors: [],                              style: 'ring',   description: 'No frame — clean.' },
  { id: 'frame_iron',        name: 'Iron Ring',       rarity: 'common',    colors: ['#78716c', '#57534e'],          style: 'ring',   description: 'Simple iron band.' },
  { id: 'frame_silver',      name: 'Silver Ring',     rarity: 'rare',      colors: ['#cbd5e1', '#94a3b8'],          style: 'ring',   description: 'Polished silver.' },
  { id: 'frame_gold',        name: 'Gold Ring',       rarity: 'rare',      colors: ['#fbbf24', '#d97706'],          style: 'ring',   description: 'Classic gold.' },
  { id: 'frame_emerald',     name: 'Emerald Double',  rarity: 'epic',      colors: ['#10b981', '#6ee7b7'],          style: 'double', description: 'Double band, emerald cut.' },
  { id: 'frame_ruby',        name: 'Ruby Double',     rarity: 'epic',      colors: ['#dc2626', '#f87171'],          style: 'double', description: 'Double band, crimson fire.' },
  { id: 'frame_sapphire',    name: 'Sapphire Halo',   rarity: 'epic',      colors: ['#1e40af', '#60a5fa'],          style: 'halo',   description: 'Deep blue halo.' },
  { id: 'frame_phoenix',     name: 'Phoenix Crown',   rarity: 'legendary', colors: ['#dc2626', '#f97316', '#fbbf24'], style: 'wreath', animated: true, description: 'Molten flame wreath.' },
  { id: 'frame_nebula',      name: 'Nebula Halo',     rarity: 'legendary', colors: ['#7c3aed', '#ec4899', '#22d3ee'], style: 'conic',  animated: true, description: 'Cosmic purple halo.' },
  { id: 'frame_ascension',   name: 'Ascension Wreath', rarity: 'mythic',   colors: ['#f9a8d4', '#ec4899', '#ffffff'], style: 'wreath', animated: true, description: 'Earned by ascending your orb.' },
  { id: 'frame_rainbow',     name: 'Rainbow Crown',   rarity: 'mythic',    colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], style: 'conic', animated: true, description: 'Full spectrum, always shifting.' },
  { id: 'frame_eternal',     name: 'Eternal Crown',   rarity: 'mythic',    colors: ['#000000', '#f59e0b', '#ffffff'], style: 'wreath', animated: true, description: 'Black and gold. Timeless.' },
];

export const NAME_EFFECTS: NameEffect[] = [
  { id: 'name_plain',      name: 'Plain',        rarity: 'common',    colors: ['#ffffff'],                            description: 'Default white.' },
  { id: 'name_ember',      name: 'Ember',        rarity: 'rare',      colors: ['#f97316', '#dc2626'],                  description: 'Orange → red burn.' },
  { id: 'name_ice',        name: 'Ice',          rarity: 'rare',      colors: ['#60a5fa', '#e0f2fe'],                  description: 'Cold cyan sheen.' },
  { id: 'name_emerald',    name: 'Emerald',      rarity: 'rare',      colors: ['#10b981', '#a7f3d0'],                  description: 'Cool green gradient.' },
  { id: 'name_gold',       name: 'Gold',         rarity: 'epic',      colors: ['#fbbf24', '#fef3c7', '#f59e0b'],       animated: 'shimmer', description: 'Shimmering molten gold.' },
  { id: 'name_plasma',     name: 'Plasma',       rarity: 'epic',      colors: ['#ec4899', '#7c3aed', '#22d3ee'],       animated: 'pulse', description: 'Purple plasma pulse.' },
  { id: 'name_phoenix',    name: 'Phoenix',      rarity: 'legendary', colors: ['#dc2626', '#f97316', '#fde047'],       animated: 'shimmer', description: 'Fire from within.' },
  { id: 'name_rainbow',    name: 'Rainbow',      rarity: 'mythic',    colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], animated: 'rainbow-shift', description: 'Every color, cycling.' },
  { id: 'name_ascendant',  name: 'Ascendant',    rarity: 'mythic',    colors: ['#f9a8d4', '#ec4899', '#ffffff'],       animated: 'shimmer', description: 'Earned by ascending your orb.' },
  { id: 'name_eternal',    name: 'Eternal',      rarity: 'mythic',    colors: ['#ffffff', '#fbbf24', '#000000', '#fbbf24', '#ffffff'], animated: 'shimmer', description: 'White, gold, and void.' },
];

export function getFrame(id: string | undefined | null): PfpFrame {
  return PFP_FRAMES.find((f) => f.id === id) || PFP_FRAMES[0];
}
export function getNameEffect(id: string | undefined | null): NameEffect {
  return NAME_EFFECTS.find((e) => e.id === id) || NAME_EFFECTS[0];
}

// Auto-unlock rules — given an earn context, return ids that should be
// inserted into ownedCosmetics on login / activity.
export interface EarnContext {
  orbAscensions: number;
  prestige: number;
  level: number;
}
export function autoUnlockedCosmetics(ctx: EarnContext): string[] {
  const out: string[] = [];
  if (ctx.orbAscensions >= 1) {
    out.push('frame_ascension', 'name_ascendant');
  }
  if (ctx.prestige >= 1) {
    out.push('frame_eternal', 'name_eternal');
  }
  if (ctx.level >= 50) {
    out.push('frame_phoenix', 'name_phoenix');
  }
  return out;
}
