// Account cosmetics — PFP frames + username color/effects.
// Stored as ids in ownedCosmetics[] on the user doc and equipped via
// equippedFrame / equippedNameEffect fields. Everyone sees them when they
// load someone's profile or see their avatar in the feed.

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** Animation mode for a name effect — maps 1:1 to a CSS class in globals.css. */
export type NameAnimation =
  | 'shimmer'
  | 'pulse'
  | 'rainbow-shift'
  // Premium tier — added in the big cosmetics expansion
  | 'cosmic'
  | 'glitch'
  | 'electric'
  | 'inferno'
  | 'prismatic'
  | 'holographic'
  | 'void'
  | 'mythic'
  | 'ember'
  | 'ghost'
  | 'molten'
  | 'aurora';

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
  animated?: NameAnimation;
  description: string;
}

// ---------------------------------------------------------------------------
// PFP FRAMES
//
// Counts: Common 3 · Rare 8 · Epic 8 · Legendary 8 · Mythic 8
// Higher rarities are always `animated: true` — FramedAvatar grades visual
// intensity off `rarity`, so Mythic frames get the most layers.
// ---------------------------------------------------------------------------
export const PFP_FRAMES: PfpFrame[] = [
  // ---- COMMON ----
  { id: 'frame_none',        name: 'None',            rarity: 'common',    colors: [],                              style: 'ring',   description: 'No frame — clean.' },
  { id: 'frame_iron',        name: 'Iron Ring',       rarity: 'common',    colors: ['#78716c', '#57534e'],          style: 'ring',   description: 'Simple iron band.' },
  { id: 'frame_stone',       name: 'Stone Ring',      rarity: 'common',    colors: ['#64748b', '#334155'],          style: 'ring',   description: 'Plain grey granite.' },

  // ---- RARE (color variety, no animation) ----
  { id: 'frame_silver',      name: 'Silver Ring',     rarity: 'rare',      colors: ['#cbd5e1', '#94a3b8'],          style: 'ring',   description: 'Polished silver.' },
  { id: 'frame_gold',        name: 'Gold Ring',       rarity: 'rare',      colors: ['#fbbf24', '#d97706'],          style: 'ring',   description: 'Classic gold.' },
  { id: 'frame_copper',      name: 'Copper Ring',     rarity: 'rare',      colors: ['#f97316', '#9a3412'],          style: 'ring',   description: 'Warm copper tone.' },
  { id: 'frame_jade',        name: 'Jade Ring',       rarity: 'rare',      colors: ['#34d399', '#047857'],          style: 'ring',   description: 'Polished jade.' },
  { id: 'frame_amber',       name: 'Amber Ring',      rarity: 'rare',      colors: ['#fcd34d', '#b45309'],          style: 'ring',   description: 'Honey-gold amber.' },
  { id: 'frame_azure',       name: 'Azure Ring',      rarity: 'rare',      colors: ['#60a5fa', '#1d4ed8'],          style: 'ring',   description: 'Electric azure.' },
  { id: 'frame_rose',        name: 'Rose Ring',       rarity: 'rare',      colors: ['#fb7185', '#9f1239'],          style: 'ring',   description: 'Rose quartz.' },
  { id: 'frame_onyx',        name: 'Onyx Ring',       rarity: 'rare',      colors: ['#1e293b', '#020617'],          style: 'ring',   description: 'Deep black onyx.' },

  // ---- EPIC (double / halo, subtle animation) ----
  { id: 'frame_emerald',     name: 'Emerald Double',  rarity: 'epic',      colors: ['#10b981', '#6ee7b7'],          style: 'double', animated: true, description: 'Double band, emerald cut.' },
  { id: 'frame_ruby',        name: 'Ruby Double',     rarity: 'epic',      colors: ['#dc2626', '#f87171'],          style: 'double', animated: true, description: 'Double band, crimson fire.' },
  { id: 'frame_sapphire',    name: 'Sapphire Halo',   rarity: 'epic',      colors: ['#1e40af', '#60a5fa'],          style: 'halo',   animated: true, description: 'Deep blue halo.' },
  { id: 'frame_amethyst',    name: 'Amethyst Halo',   rarity: 'epic',      colors: ['#7c3aed', '#c4b5fd'],          style: 'halo',   animated: true, description: 'Violet crystal halo.' },
  { id: 'frame_arctic',      name: 'Arctic Halo',     rarity: 'epic',      colors: ['#0891b2', '#cffafe'],          style: 'halo',   animated: true, description: 'Frozen mist halo.' },
  { id: 'frame_sunset',      name: 'Sunset Double',   rarity: 'epic',      colors: ['#f97316', '#f472b6'],          style: 'double', animated: true, description: 'Pink-orange horizon.' },
  { id: 'frame_obsidian',    name: 'Obsidian Double', rarity: 'epic',      colors: ['#0c0a09', '#a78bfa'],          style: 'double', animated: true, description: 'Volcanic glass with violet veins.' },
  { id: 'frame_citrus',      name: 'Citrus Double',   rarity: 'epic',      colors: ['#facc15', '#16a34a'],          style: 'double', animated: true, description: 'Bright zest double band.' },

  // ---- LEGENDARY (conic / wreath, animated) ----
  { id: 'frame_phoenix',     name: 'Phoenix Crown',   rarity: 'legendary', colors: ['#dc2626', '#f97316', '#fbbf24'], style: 'wreath', animated: true, description: 'Molten flame wreath.' },
  { id: 'frame_nebula',      name: 'Nebula Halo',     rarity: 'legendary', colors: ['#7c3aed', '#ec4899', '#22d3ee'], style: 'conic',  animated: true, description: 'Cosmic purple halo.' },
  { id: 'frame_aurora_leg',  name: 'Aurora Crown',    rarity: 'legendary', colors: ['#22d3ee', '#22c55e', '#a855f7'], style: 'conic',  animated: true, description: 'Dancing northern lights.' },
  { id: 'frame_inferno',     name: 'Inferno Wreath',  rarity: 'legendary', colors: ['#7f1d1d', '#dc2626', '#fde047'], style: 'wreath', animated: true, description: 'Furnace-hot ring of fire.' },
  { id: 'frame_solar',       name: 'Solar Crown',     rarity: 'legendary', colors: ['#f59e0b', '#fde047', '#ffffff'], style: 'conic',  animated: true, description: 'Corona of the sun.' },
  { id: 'frame_abyss',       name: 'Abyssal Halo',    rarity: 'legendary', colors: ['#0c1728', '#0369a1', '#22d3ee'], style: 'conic',  animated: true, description: 'Deep-sea bioluminescence.' },
  { id: 'frame_tide',        name: 'Tide Wreath',     rarity: 'legendary', colors: ['#0891b2', '#67e8f9', '#ffffff'], style: 'wreath', animated: true, description: 'Crashing ocean halo.' },
  { id: 'frame_royal',       name: 'Royal Halo',      rarity: 'legendary', colors: ['#4c1d95', '#fbbf24', '#f9a8d4'], style: 'halo',   animated: true, description: 'King of kings.' },

  // ---- MYTHIC (maximum layers — conic + wreath, always animated) ----
  { id: 'frame_ascension',   name: 'Ascension Wreath', rarity: 'mythic',   colors: ['#f9a8d4', '#ec4899', '#ffffff'], style: 'wreath', animated: true, description: 'Earned by ascending your orb.' },
  { id: 'frame_rainbow',     name: 'Rainbow Crown',   rarity: 'mythic',    colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], style: 'conic', animated: true, description: 'Full spectrum, always shifting.' },
  { id: 'frame_eternal',     name: 'Eternal Crown',   rarity: 'mythic',    colors: ['#000000', '#f59e0b', '#ffffff'], style: 'wreath', animated: true, description: 'Black and gold. Timeless.' },
  { id: 'frame_cosmic',      name: 'Cosmic Singularity', rarity: 'mythic', colors: ['#020617', '#7c3aed', '#ec4899', '#22d3ee', '#fbbf24'], style: 'conic', animated: true, description: 'A star at the center of a storm.' },
  { id: 'frame_prismatic',   name: 'Prismatic Halo',  rarity: 'mythic',    colors: ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc'], style: 'conic', animated: true, description: 'Light refracted into impossible colors.' },
  { id: 'frame_stargaze',    name: 'Stargaze Wreath', rarity: 'mythic',    colors: ['#020617', '#4c1d95', '#ec4899', '#ffffff'], style: 'wreath', animated: true, description: 'Every star you ever dreamed of.' },
  { id: 'frame_celestial',   name: 'Celestial Crown', rarity: 'mythic',    colors: ['#fde047', '#ffffff', '#a78bfa', '#ffffff'], style: 'wreath', animated: true, description: 'Worn by the constellations.' },
  { id: 'frame_void',        name: 'Void Halo',       rarity: 'mythic',    colors: ['#000000', '#4c1d95', '#ec4899', '#f5d0fe'], style: 'conic',  animated: true, description: 'A ring carved from pure darkness.' },
];

// ---------------------------------------------------------------------------
// NAME EFFECTS
//
// Counts: Common 1 · Rare 9 · Epic 7 · Legendary 7 · Mythic 9
// Higher rarities get crazier animations (cosmic, glitch, prismatic,
// holographic, mythic). Rare only gets static gradients. Epic gets subtle
// pulse/shimmer. Legendary gets dramatic (electric, inferno, aurora, molten).
// Mythic gets the prismatic/glitch/holographic class.
// ---------------------------------------------------------------------------
export const NAME_EFFECTS: NameEffect[] = [
  // ---- COMMON ----
  { id: 'name_plain',      name: 'Plain',        rarity: 'common',    colors: ['#ffffff'],                            description: 'Default white.' },

  // ---- RARE (static gradient — solid color vocab) ----
  { id: 'name_ember',      name: 'Ember',        rarity: 'rare',      colors: ['#f97316', '#dc2626'],                  description: 'Orange → red burn.' },
  { id: 'name_ice',        name: 'Ice',          rarity: 'rare',      colors: ['#60a5fa', '#e0f2fe'],                  description: 'Cold cyan sheen.' },
  { id: 'name_emerald',    name: 'Emerald',      rarity: 'rare',      colors: ['#10b981', '#a7f3d0'],                  description: 'Cool green gradient.' },
  { id: 'name_saffron',    name: 'Saffron',      rarity: 'rare',      colors: ['#f59e0b', '#fef3c7'],                  description: 'Warm yellow gold.' },
  { id: 'name_amethyst',   name: 'Amethyst',     rarity: 'rare',      colors: ['#a855f7', '#e9d5ff'],                  description: 'Violet crystal.' },
  { id: 'name_sakura',     name: 'Sakura',       rarity: 'rare',      colors: ['#ec4899', '#fce7f3'],                  description: 'Blossom pink.' },
  { id: 'name_lime',       name: 'Lime',         rarity: 'rare',      colors: ['#84cc16', '#ecfccb'],                  description: 'Fresh lime.' },
  { id: 'name_copper',     name: 'Copper',       rarity: 'rare',      colors: ['#ea580c', '#fbbf24'],                  description: 'Warm metal gradient.' },
  { id: 'name_slate',      name: 'Slate',        rarity: 'rare',      colors: ['#64748b', '#e2e8f0'],                  description: 'Cold steel.' },

  // ---- EPIC (subtle anim: shimmer / pulse / ghost / ember) ----
  { id: 'name_gold',       name: 'Gold',         rarity: 'epic',      colors: ['#fbbf24', '#fef3c7', '#f59e0b'],       animated: 'shimmer',    description: 'Shimmering molten gold.' },
  { id: 'name_plasma',     name: 'Plasma',       rarity: 'epic',      colors: ['#ec4899', '#7c3aed', '#22d3ee'],       animated: 'pulse',      description: 'Purple plasma pulse.' },
  { id: 'name_ghost',      name: 'Ghost',        rarity: 'epic',      colors: ['#cbd5e1', '#64748b', '#e2e8f0'],       animated: 'ghost',      description: 'Fades in and out of sight.' },
  { id: 'name_rose_gold',  name: 'Rose Gold',    rarity: 'epic',      colors: ['#f9a8d4', '#fbbf24', '#f9a8d4'],       animated: 'shimmer',    description: 'Pink-gold luster.' },
  { id: 'name_arctic',     name: 'Arctic',       rarity: 'epic',      colors: ['#22d3ee', '#cffafe', '#0891b2'],       animated: 'pulse',      description: 'Frozen core pulse.' },
  { id: 'name_ember_glow', name: 'Ember Glow',   rarity: 'epic',      colors: ['#f97316', '#fbbf24', '#dc2626'],       animated: 'ember',      description: 'Breathing embers.' },
  { id: 'name_toxic',      name: 'Toxic',        rarity: 'epic',      colors: ['#84cc16', '#facc15', '#65a30d'],       animated: 'pulse',      description: 'Chemical glow.' },

  // ---- LEGENDARY (dramatic anim: inferno / electric / aurora / molten) ----
  { id: 'name_phoenix',    name: 'Phoenix',      rarity: 'legendary', colors: ['#dc2626', '#f97316', '#fde047'],       animated: 'inferno',    description: 'Fire from within.' },
  { id: 'name_electric',   name: 'Electric',     rarity: 'legendary', colors: ['#facc15', '#ffffff', '#60a5fa'],       animated: 'electric',   description: 'Lightning-wrapped letters.' },
  { id: 'name_molten',     name: 'Molten',       rarity: 'legendary', colors: ['#7f1d1d', '#dc2626', '#f97316', '#fbbf24'], animated: 'molten', description: 'Flowing lava.' },
  { id: 'name_aurora',     name: 'Aurora',       rarity: 'legendary', colors: ['#22c55e', '#22d3ee', '#a855f7', '#ec4899'], animated: 'aurora', description: 'Dancing light ribbons.' },
  { id: 'name_solar',      name: 'Solar Flare',  rarity: 'legendary', colors: ['#fde047', '#f97316', '#dc2626'],       animated: 'electric',   description: 'Corona bursts.' },
  { id: 'name_tide',       name: 'Tide',         rarity: 'legendary', colors: ['#0369a1', '#22d3ee', '#ffffff'],       animated: 'molten',     description: 'Flowing deep ocean.' },
  { id: 'name_nebula_leg', name: 'Nebula',       rarity: 'legendary', colors: ['#7c3aed', '#ec4899', '#22d3ee'],       animated: 'aurora',     description: 'Interstellar dust cloud.' },

  // ---- MYTHIC (top tier: cosmic / prismatic / holographic / glitch / void / mythic) ----
  { id: 'name_rainbow',    name: 'Rainbow',      rarity: 'mythic',    colors: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'], animated: 'rainbow-shift', description: 'Every color, cycling.' },
  { id: 'name_ascendant',  name: 'Ascendant',    rarity: 'mythic',    colors: ['#f9a8d4', '#ec4899', '#ffffff'],       animated: 'mythic',     description: 'Earned by ascending your orb.' },
  { id: 'name_eternal',    name: 'Eternal',      rarity: 'mythic',    colors: ['#ffffff', '#fbbf24', '#000000', '#fbbf24', '#ffffff'], animated: 'mythic', description: 'White, gold, and void.' },
  { id: 'name_cosmic',     name: 'Cosmic',       rarity: 'mythic',    colors: ['#020617', '#7c3aed', '#ec4899', '#22d3ee', '#fbbf24'], animated: 'cosmic', description: 'Starfield wrapped around letters.' },
  { id: 'name_void',       name: 'Void',         rarity: 'mythic',    colors: ['#a855f7', '#4c1d95', '#f5d0fe'],       animated: 'void',       description: 'Pulled toward the event horizon.' },
  { id: 'name_prismatic',  name: 'Prismatic',    rarity: 'mythic',    colors: ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc'], animated: 'prismatic', description: 'Light refracted through impossible geometry.' },
  { id: 'name_holographic', name: 'Holographic', rarity: 'mythic',    colors: ['#22d3ee', '#c084fc', '#f472b6', '#fbbf24', '#22d3ee'], animated: 'holographic', description: 'Shifts with the angle of observation.' },
  { id: 'name_glitch',     name: 'Glitch',       rarity: 'mythic',    colors: ['#ff00cc', '#ffffff', '#00e0ff'],       animated: 'glitch',     description: 'Reality.exe has stopped working.' },
  { id: 'name_mythic_rad', name: 'Radiance',     rarity: 'mythic',    colors: ['#fef3c7', '#fbbf24', '#ec4899', '#a855f7', '#fef3c7'], animated: 'mythic', description: 'Light that cannot be contained.' },
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
