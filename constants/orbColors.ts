// Orb color customization — base (body), pulse (wave), and ring (orbit) axes.
// Each palette declares 4 stops (outer → core) plus a glow rgba. Colors are
// pulled by renderers: SoulOrb canvas, MiniOrb CSS, OrbColorPreview swatch.
//
// Rarities aren't stored here (the shop defines them), but the rough tiering
// is: Common = plain solid; Rare = clean single-hue; Epic = duotone mix;
// Legendary = multi-stop dramatic; Mythic = impossible / animated-friendly.

export interface OrbColorSet {
  id: string;
  name: string;
  outer: string;
  mid: string;
  inner: string;
  core: string;
  glow: string;
}

// ---------------------------------------------------------------------------
// BASE COLORS — the orb body
// ---------------------------------------------------------------------------
export const ORB_BASE_COLORS: OrbColorSet[] = [
  // ---- COMMON (single-hue solid) ----
  { id: 'crimson',   name: 'Crimson',   outer: '#7f1d1d', mid: '#dc2626', inner: '#ef4444', core: '#fbbf24', glow: 'rgba(220,38,38,0.3)' },

  // ---- RARE (clean spectrum — cover every color family) ----
  { id: 'ember',     name: 'Ember',     outer: '#7c2d12', mid: '#ea580c', inner: '#fb923c', core: '#fed7aa', glow: 'rgba(234,88,12,0.3)' },
  { id: 'amber',     name: 'Amber',     outer: '#713f12', mid: '#ca8a04', inner: '#eab308', core: '#fef08a', glow: 'rgba(234,179,8,0.3)' },
  { id: 'ocean',     name: 'Ocean',     outer: '#1e3a5f', mid: '#2563eb', inner: '#3b82f6', core: '#93c5fd', glow: 'rgba(37,99,235,0.3)' },
  { id: 'sky',       name: 'Sky',       outer: '#075985', mid: '#0284c7', inner: '#38bdf8', core: '#e0f2fe', glow: 'rgba(56,189,248,0.3)' },
  { id: 'emerald',   name: 'Emerald',   outer: '#064e3b', mid: '#059669', inner: '#10b981', core: '#6ee7b7', glow: 'rgba(16,185,129,0.3)' },
  { id: 'pear',      name: 'Pear',      outer: '#365314', mid: '#65a30d', inner: '#a3e635', core: '#ecfccb', glow: 'rgba(101,163,13,0.3)' },
  { id: 'grape',     name: 'Grape',     outer: '#581c87', mid: '#9333ea', inner: '#c084fc', core: '#f3e8ff', glow: 'rgba(147,51,234,0.3)' },
  { id: 'lavender',  name: 'Lavender',  outer: '#6b21a8', mid: '#a855f7', inner: '#d8b4fe', core: '#faf5ff', glow: 'rgba(168,85,247,0.3)' },
  { id: 'rose',      name: 'Rose',      outer: '#9f1239', mid: '#e11d48', inner: '#fb7185', core: '#ffe4e6', glow: 'rgba(225,29,72,0.3)' },
  { id: 'coral',     name: 'Coral',     outer: '#9a3412', mid: '#ea580c', inner: '#fb7185', core: '#fecdd3', glow: 'rgba(251,113,133,0.3)' },
  { id: 'teal',      name: 'Teal',      outer: '#134e4a', mid: '#0d9488', inner: '#2dd4bf', core: '#ccfbf1', glow: 'rgba(20,184,166,0.3)' },
  { id: 'slate',     name: 'Slate',     outer: '#1e293b', mid: '#475569', inner: '#94a3b8', core: '#e2e8f0', glow: 'rgba(100,116,139,0.3)' },
  { id: 'snow',      name: 'Snow',      outer: '#64748b', mid: '#cbd5e1', inner: '#f1f5f9', core: '#ffffff', glow: 'rgba(226,232,240,0.4)' },
  { id: 'midnight',  name: 'Midnight',  outer: '#020617', mid: '#1e293b', inner: '#334155', core: '#94a3b8', glow: 'rgba(51,65,85,0.4)' },

  // ---- EPIC (duotone mix, richer gradients) ----
  { id: 'violet',    name: 'Violet',    outer: '#4c1d95', mid: '#7c3aed', inner: '#8b5cf6', core: '#c4b5fd', glow: 'rgba(124,58,237,0.3)' },
  { id: 'gold',      name: 'Gold',      outer: '#78350f', mid: '#d97706', inner: '#f59e0b', core: '#fde68a', glow: 'rgba(217,119,6,0.3)' },
  { id: 'obsidian',  name: 'Obsidian',  outer: '#0c0a09', mid: '#27272a', inner: '#a78bfa', core: '#f0abfc', glow: 'rgba(139,92,246,0.35)' },
  { id: 'sunset',    name: 'Sunset',    outer: '#7c2d12', mid: '#ea580c', inner: '#f472b6', core: '#fef3c7', glow: 'rgba(236,72,153,0.55)' },
  { id: 'candy',     name: 'Candy',     outer: '#831843', mid: '#ec4899', inner: '#60a5fa', core: '#fef3c7', glow: 'rgba(236,72,153,0.55)' },
  { id: 'toxic',     name: 'Toxic',     outer: '#1a2e05', mid: '#65a30d', inner: '#facc15', core: '#f7fee7', glow: 'rgba(132,204,22,0.6)' },
  { id: 'deepsea',   name: 'Deep Sea',  outer: '#0c1728', mid: '#0369a1', inner: '#22d3ee', core: '#ecfeff', glow: 'rgba(34,211,238,0.5)' },
  { id: 'ruby_core', name: 'Ruby Core', outer: '#1c0a0a', mid: '#b91c1c', inner: '#f87171', core: '#fef3c7', glow: 'rgba(239,68,68,0.45)' },
  { id: 'jade',      name: 'Jade',      outer: '#064e3b', mid: '#047857', inner: '#34d399', core: '#f0fdf4', glow: 'rgba(52,211,153,0.45)' },
  { id: 'twilight',  name: 'Twilight',  outer: '#1e1b4b', mid: '#4338ca', inner: '#c084fc', core: '#fbcfe8', glow: 'rgba(67,56,202,0.5)' },

  // ---- LEGENDARY (3+ stop dramatic) ----
  { id: 'phoenix',   name: 'Phoenix',   outer: '#450a0a', mid: '#dc2626', inner: '#f59e0b', core: '#fef9c3', glow: 'rgba(239,68,68,0.55)' },
  { id: 'aurora',    name: 'Aurora',    outer: '#064e3b', mid: '#10b981', inner: '#a78bfa', core: '#fbcfe8', glow: 'rgba(16,185,129,0.45)' },
  { id: 'nebula',    name: 'Nebula',    outer: '#1e1b4b', mid: '#7c3aed', inner: '#ec4899', core: '#fef3c7', glow: 'rgba(168,85,247,0.5)' },
  { id: 'prismatic', name: 'Prismatic', outer: '#831843', mid: '#9333ea', inner: '#14b8a6', core: '#ffffff', glow: 'rgba(236,72,153,0.55)' },
  { id: 'northern',  name: 'Northern Lights', outer: '#0b1324', mid: '#0891b2', inner: '#22c55e', core: '#a855f7', glow: 'rgba(34,197,94,0.5)' },
  { id: 'bloodmoon', name: 'Blood Moon', outer: '#1c0a0a', mid: '#7f1d1d', inner: '#ef4444', core: '#fde68a', glow: 'rgba(239,68,68,0.6)' },
  { id: 'galactic',  name: 'Galactic',  outer: '#020617', mid: '#3730a3', inner: '#a855f7', core: '#fef3c7', glow: 'rgba(109,40,217,0.6)' },
  { id: 'abyssal',   name: 'Abyssal',   outer: '#020617', mid: '#0f172a', inner: '#22d3ee', core: '#a5f3fc', glow: 'rgba(34,211,238,0.55)' },
  { id: 'zenith',    name: 'Zenith',    outer: '#7c2d12', mid: '#f59e0b', inner: '#fde047', core: '#ffffff', glow: 'rgba(253,224,71,0.65)' },
  { id: 'mirage',    name: 'Mirage',    outer: '#b45309', mid: '#ec4899', inner: '#22d3ee', core: '#fef3c7', glow: 'rgba(236,72,153,0.5)' },

  // ---- MYTHIC ----
  { id: 'rainbow',   name: 'Rainbow',   outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7', glow: 'rgba(168,85,247,0.7)' },
  { id: 'stargaze',  name: 'Stargaze',  outer: '#020617', mid: '#4c1d95', inner: '#ec4899', core: '#ffffff', glow: 'rgba(168,85,247,0.7)' },
  { id: 'eternal',   name: 'Eternal',   outer: '#000000', mid: '#f59e0b', inner: '#fbbf24', core: '#ffffff', glow: 'rgba(250,204,21,0.8)' },
  { id: 'quasar',    name: 'Quasar',    outer: '#020617', mid: '#ec4899', inner: '#fde047', core: '#ffffff', glow: 'rgba(236,72,153,0.8)' },
  { id: 'nova',      name: 'Nova',      outer: '#7f1d1d', mid: '#ea580c', inner: '#fde047', core: '#ffffff', glow: 'rgba(253,224,71,0.85)' },
  { id: 'celestial', name: 'Celestial', outer: '#0c0a09', mid: '#a855f7', inner: '#22d3ee', core: '#ffffff', glow: 'rgba(168,85,247,0.8)' },
  { id: 'singularity', name: 'Singularity', outer: '#000000', mid: '#4c1d95', inner: '#f9a8d4', core: '#f5d0fe', glow: 'rgba(168,85,247,0.85)' },
];

// ---------------------------------------------------------------------------
// PULSE COLORS — the wave rippling out from center
// ---------------------------------------------------------------------------
export const ORB_PULSE_COLORS: OrbColorSet[] = [
  // ---- COMMON ----
  { id: 'fire',      name: 'Fire',      outer: '#92400e', mid: '#f97316', inner: '#fb923c', core: '#fef3c7', glow: 'rgba(249,115,22,0.4)' },

  // ---- RARE ----
  { id: 'ice',       name: 'Ice',       outer: '#164e63', mid: '#06b6d4', inner: '#22d3ee', core: '#e0f2fe', glow: 'rgba(6,182,212,0.4)' },
  { id: 'lightning', name: 'Lightning', outer: '#713f12', mid: '#eab308', inner: '#facc15', core: '#fefce8', glow: 'rgba(234,179,8,0.4)' },
  { id: 'mint',      name: 'Mint',      outer: '#134e4a', mid: '#14b8a6', inner: '#5eead4', core: '#f0fdfa', glow: 'rgba(20,184,166,0.4)' },
  { id: 'crimson_p', name: 'Crimson',   outer: '#7f1d1d', mid: '#dc2626', inner: '#f87171', core: '#fecaca', glow: 'rgba(220,38,38,0.45)' },
  { id: 'azure',     name: 'Azure',     outer: '#1e40af', mid: '#3b82f6', inner: '#93c5fd', core: '#dbeafe', glow: 'rgba(59,130,246,0.45)' },
  { id: 'bubblegum', name: 'Bubblegum', outer: '#831843', mid: '#ec4899', inner: '#f9a8d4', core: '#fce7f3', glow: 'rgba(236,72,153,0.45)' },
  { id: 'grove',     name: 'Grove',     outer: '#14532d', mid: '#16a34a', inner: '#86efac', core: '#f0fdf4', glow: 'rgba(22,163,74,0.4)' },
  { id: 'dusk',      name: 'Dusk',      outer: '#3b0764', mid: '#7e22ce', inner: '#d8b4fe', core: '#f5f3ff', glow: 'rgba(126,34,206,0.4)' },
  { id: 'saffron_p', name: 'Saffron',   outer: '#713f12', mid: '#ca8a04', inner: '#fde047', core: '#fefce8', glow: 'rgba(234,179,8,0.4)' },
  { id: 'charcoal',  name: 'Charcoal',  outer: '#0f172a', mid: '#334155', inner: '#94a3b8', core: '#e2e8f0', glow: 'rgba(100,116,139,0.35)' },

  // ---- EPIC ----
  { id: 'shadow',    name: 'Shadow',    outer: '#1c1917', mid: '#44403c', inner: '#78716c', core: '#d6d3d1', glow: 'rgba(120,113,108,0.3)' },
  { id: 'plasma',    name: 'Plasma',    outer: '#701a75', mid: '#c026d3', inner: '#d946ef', core: '#f5d0fe', glow: 'rgba(192,38,211,0.4)' },
  { id: 'pulse_sunset', name: 'Sunset Pulse', outer: '#831843', mid: '#f97316', inner: '#fb7185', core: '#fef3c7', glow: 'rgba(251,113,133,0.6)' },
  { id: 'pulse_toxic',  name: 'Toxic Pulse',  outer: '#14532d', mid: '#84cc16', inner: '#facc15', core: '#fefce8', glow: 'rgba(132,204,22,0.6)' },
  { id: 'pulse_candy',  name: 'Candy Pulse',  outer: '#701a75', mid: '#e879f9', inner: '#60a5fa', core: '#fef3c7', glow: 'rgba(232,121,249,0.55)' },
  { id: 'pulse_neon',   name: 'Neon Pulse',   outer: '#052e16', mid: '#22c55e', inner: '#67e8f9', core: '#ffffff', glow: 'rgba(34,197,94,0.6)' },
  { id: 'pulse_arctic', name: 'Arctic Pulse', outer: '#083344', mid: '#0e7490', inner: '#67e8f9', core: '#ecfeff', glow: 'rgba(14,116,144,0.5)' },
  { id: 'pulse_royal',  name: 'Royal Pulse',  outer: '#312e81', mid: '#6366f1', inner: '#c7d2fe', core: '#eef2ff', glow: 'rgba(99,102,241,0.45)' },

  // ---- LEGENDARY ----
  { id: 'solar',     name: 'Solar',     outer: '#7c2d12', mid: '#f59e0b', inner: '#fde047', core: '#ffffff', glow: 'rgba(250,204,21,0.55)' },
  { id: 'void',      name: 'Void',      outer: '#020617', mid: '#3730a3', inner: '#7e22ce', core: '#e9d5ff', glow: 'rgba(88,28,135,0.55)' },
  { id: 'mystic',    name: 'Mystic',    outer: '#14532d', mid: '#059669', inner: '#8b5cf6', core: '#f5f3ff', glow: 'rgba(5,150,105,0.5)' },
  { id: 'inferno',   name: 'Inferno',   outer: '#450a0a', mid: '#b91c1c', inner: '#f97316', core: '#fef2f2', glow: 'rgba(185,28,28,0.6)' },
  { id: 'cosmic',    name: 'Cosmic',    outer: '#1e3a8a', mid: '#4f46e5', inner: '#ec4899', core: '#fefce8', glow: 'rgba(79,70,229,0.55)' },
  { id: 'abyss_p',   name: 'Abyss',     outer: '#020617', mid: '#0e7490', inner: '#67e8f9', core: '#ffffff', glow: 'rgba(14,116,144,0.6)' },
  { id: 'seraph',    name: 'Seraph',    outer: '#7c2d12', mid: '#fbbf24', inner: '#fef3c7', core: '#ffffff', glow: 'rgba(253,224,71,0.65)' },
  { id: 'nebula_p',  name: 'Nebula Pulse', outer: '#4c1d95', mid: '#ec4899', inner: '#22d3ee', core: '#ffffff', glow: 'rgba(168,85,247,0.6)' },

  // ---- MYTHIC ----
  { id: 'pulse_rainbow',  name: 'Rainbow Pulse',  outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7', glow: 'rgba(236,72,153,0.65)' },
  { id: 'pulse_stargaze', name: 'Stargaze Pulse', outer: '#1e1b4b', mid: '#7c3aed', inner: '#ec4899', core: '#ffffff', glow: 'rgba(168,85,247,0.7)' },
  { id: 'pulse_eternal',  name: 'Eternal Pulse',  outer: '#000000', mid: '#b45309', inner: '#fbbf24', core: '#ffffff', glow: 'rgba(251,191,36,0.75)' },
  { id: 'pulse_quasar',   name: 'Quasar Pulse',   outer: '#020617', mid: '#ec4899', inner: '#fde047', core: '#ffffff', glow: 'rgba(236,72,153,0.8)' },
  { id: 'pulse_cosmic',   name: 'Cosmic Pulse',   outer: '#020617', mid: '#a855f7', inner: '#22d3ee', core: '#ffffff', glow: 'rgba(168,85,247,0.75)' },
  { id: 'pulse_nova',     name: 'Nova Pulse',     outer: '#7f1d1d', mid: '#ea580c', inner: '#fde047', core: '#ffffff', glow: 'rgba(253,224,71,0.85)' },
];

export function getOrbBaseColor(id: string): OrbColorSet {
  return ORB_BASE_COLORS.find(c => c.id === id) || ORB_BASE_COLORS[0];
}

export function getOrbPulseColor(id: string): OrbColorSet {
  return ORB_PULSE_COLORS.find(c => c.id === id) || ORB_PULSE_COLORS[0];
}

// ---------------------------------------------------------------------------
// RING COLORS — the tilted bands orbiting the orb
// ---------------------------------------------------------------------------
export const ORB_RING_COLORS: OrbColorSet[] = [
  // ---- COMMON ----
  { id: 'ring_default', name: 'Default', outer: '#dc2626', mid: '#f59e0b', inner: '#fbbf24', core: '#ffffff', glow: 'rgba(245,158,11,0.3)' },

  // ---- RARE ----
  { id: 'ring_silver',   name: 'Silver',   outer: '#475569', mid: '#94a3b8', inner: '#cbd5e1', core: '#f8fafc', glow: 'rgba(148,163,184,0.3)' },
  { id: 'ring_emerald',  name: 'Emerald',  outer: '#064e3b', mid: '#059669', inner: '#10b981', core: '#d1fae5', glow: 'rgba(16,185,129,0.4)' },
  { id: 'ring_sapphire', name: 'Sapphire', outer: '#1e3a8a', mid: '#2563eb', inner: '#60a5fa', core: '#dbeafe', glow: 'rgba(37,99,235,0.4)' },
  { id: 'ring_ember',    name: 'Ember',    outer: '#7c2d12', mid: '#ea580c', inner: '#fb923c', core: '#fed7aa', glow: 'rgba(234,88,12,0.4)' },
  { id: 'ring_amber',    name: 'Amber',    outer: '#713f12', mid: '#ca8a04', inner: '#eab308', core: '#fef08a', glow: 'rgba(234,179,8,0.4)' },
  { id: 'ring_rose',     name: 'Rose',     outer: '#881337', mid: '#e11d48', inner: '#fb7185', core: '#ffe4e6', glow: 'rgba(225,29,72,0.4)' },
  { id: 'ring_amethyst', name: 'Amethyst', outer: '#6b21a8', mid: '#a855f7', inner: '#d8b4fe', core: '#faf5ff', glow: 'rgba(168,85,247,0.4)' },
  { id: 'ring_mint',     name: 'Mint',     outer: '#134e4a', mid: '#14b8a6', inner: '#5eead4', core: '#f0fdfa', glow: 'rgba(20,184,166,0.4)' },
  { id: 'ring_slate',    name: 'Slate',    outer: '#1e293b', mid: '#475569', inner: '#94a3b8', core: '#e2e8f0', glow: 'rgba(100,116,139,0.35)' },

  // ---- EPIC ----
  { id: 'ring_royal',   name: 'Royal',   outer: '#4c1d95', mid: '#7c3aed', inner: '#a78bfa', core: '#ede9fe', glow: 'rgba(124,58,237,0.4)' },
  { id: 'ring_neon',    name: 'Neon',    outer: '#065f46', mid: '#22c55e', inner: '#a3e635', core: '#fefce8', glow: 'rgba(34,197,94,0.55)' },
  { id: 'ring_ghost',   name: 'Ghost',   outer: '#020617', mid: '#1e293b', inner: '#64748b', core: '#f1f5f9', glow: 'rgba(100,116,139,0.35)' },
  { id: 'ring_copper',  name: 'Copper',  outer: '#7c2d12', mid: '#c2410c', inner: '#fb923c', core: '#fed7aa', glow: 'rgba(194,65,12,0.45)' },
  { id: 'ring_obsidian', name: 'Obsidian', outer: '#0c0a09', mid: '#27272a', inner: '#a78bfa', core: '#f0abfc', glow: 'rgba(139,92,246,0.4)' },
  { id: 'ring_twilight', name: 'Twilight', outer: '#1e1b4b', mid: '#4338ca', inner: '#c084fc', core: '#fbcfe8', glow: 'rgba(67,56,202,0.45)' },

  // ---- LEGENDARY ----
  { id: 'ring_sunset',  name: 'Sunset',  outer: '#7c2d12', mid: '#ea580c', inner: '#f472b6', core: '#fef3c7', glow: 'rgba(236,72,153,0.5)' },
  { id: 'ring_aurora',  name: 'Aurora',  outer: '#14532d', mid: '#059669', inner: '#8b5cf6', core: '#fbcfe8', glow: 'rgba(139,92,246,0.55)' },
  { id: 'ring_molten',  name: 'Molten',  outer: '#450a0a', mid: '#dc2626', inner: '#f97316', core: '#fef9c3', glow: 'rgba(220,38,38,0.6)' },
  { id: 'ring_candy',   name: 'Candy',   outer: '#831843', mid: '#ec4899', inner: '#60a5fa', core: '#fef3c7', glow: 'rgba(236,72,153,0.55)' },
  { id: 'ring_toxic',   name: 'Toxic',   outer: '#1a2e05', mid: '#65a30d', inner: '#facc15', core: '#f7fee7', glow: 'rgba(132,204,22,0.6)' },
  { id: 'ring_abyss',   name: 'Abyss',   outer: '#020617', mid: '#0e7490', inner: '#67e8f9', core: '#ffffff', glow: 'rgba(14,116,144,0.55)' },
  { id: 'ring_phoenix', name: 'Phoenix', outer: '#450a0a', mid: '#dc2626', inner: '#fde047', core: '#ffffff', glow: 'rgba(239,68,68,0.6)' },

  // ---- MYTHIC ----
  { id: 'ring_rainbow',   name: 'Rainbow',   outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
  { id: 'ring_void',      name: 'Void',      outer: '#000000', mid: '#4c1d95', inner: '#ec4899', core: '#f5d0fe', glow: 'rgba(236,72,153,0.65)' },
  { id: 'ring_supernova', name: 'Supernova', outer: '#7f1d1d', mid: '#ea580c', inner: '#fde047', core: '#ffffff', glow: 'rgba(253,224,71,0.75)' },
  { id: 'ring_cosmic',    name: 'Cosmic',    outer: '#020617', mid: '#a855f7', inner: '#22d3ee', core: '#ffffff', glow: 'rgba(168,85,247,0.8)' },
  { id: 'ring_celestial', name: 'Celestial', outer: '#0c0a09', mid: '#fde047', inner: '#ffffff', core: '#fef3c7', glow: 'rgba(253,224,71,0.85)' },
  { id: 'ring_eternal',   name: 'Eternal',   outer: '#000000', mid: '#b45309', inner: '#fbbf24', core: '#ffffff', glow: 'rgba(251,191,36,0.8)' },
];

export function getOrbRingColor(id: string): OrbColorSet {
  return ORB_RING_COLORS.find(c => c.id === id) || ORB_RING_COLORS[0];
}

// Marker used by the renderer: rainbow variants cycle hue each frame.
export function isRainbowColor(id: string | undefined): boolean {
  return !!id && id.includes('rainbow');
}
