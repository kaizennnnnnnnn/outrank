// Orb color customization options
// Each user can pick a base color and a pulse/wave color

export interface OrbColorSet {
  id: string;
  name: string;
  outer: string;
  mid: string;
  inner: string;
  core: string;
  glow: string;
}

export const ORB_BASE_COLORS: OrbColorSet[] = [
  {
    id: 'crimson',
    name: 'Crimson',
    outer: '#7f1d1d',
    mid: '#dc2626',
    inner: '#ef4444',
    core: '#fbbf24',
    glow: 'rgba(220,38,38,0.3)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    outer: '#1e3a5f',
    mid: '#2563eb',
    inner: '#3b82f6',
    core: '#93c5fd',
    glow: 'rgba(37,99,235,0.3)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    outer: '#064e3b',
    mid: '#059669',
    inner: '#10b981',
    core: '#6ee7b7',
    glow: 'rgba(16,185,129,0.3)',
  },
  {
    id: 'violet',
    name: 'Violet',
    outer: '#4c1d95',
    mid: '#7c3aed',
    inner: '#8b5cf6',
    core: '#c4b5fd',
    glow: 'rgba(124,58,237,0.3)',
  },
  {
    id: 'gold',
    name: 'Gold',
    outer: '#78350f',
    mid: '#d97706',
    inner: '#f59e0b',
    core: '#fde68a',
    glow: 'rgba(217,119,6,0.3)',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    outer: '#0c0a09',
    mid: '#27272a',
    inner: '#a78bfa',
    core: '#f0abfc',
    glow: 'rgba(139,92,246,0.35)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    outer: '#064e3b',
    mid: '#10b981',
    inner: '#a78bfa',
    core: '#fbcfe8',
    glow: 'rgba(16,185,129,0.45)',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    outer: '#1e1b4b',
    mid: '#7c3aed',
    inner: '#ec4899',
    core: '#fef3c7',
    glow: 'rgba(168,85,247,0.5)',
  },
  {
    id: 'prismatic',
    name: 'Prismatic',
    outer: '#831843',
    mid: '#9333ea',
    inner: '#14b8a6',
    core: '#ffffff',
    glow: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    outer: '#450a0a',
    mid: '#dc2626',
    inner: '#f59e0b',
    core: '#fef9c3',
    glow: 'rgba(239,68,68,0.55)',
  },
  // ---- Crazy mix colors ----
  {
    id: 'sunset',
    name: 'Sunset',
    outer: '#7c2d12', mid: '#ea580c', inner: '#f472b6', core: '#fef3c7',
    glow: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'northern',
    name: 'Northern Lights',
    outer: '#0b1324', mid: '#0891b2', inner: '#22c55e', core: '#a855f7',
    glow: 'rgba(34,197,94,0.5)',
  },
  {
    id: 'candy',
    name: 'Candy',
    outer: '#831843', mid: '#ec4899', inner: '#60a5fa', core: '#fef3c7',
    glow: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'toxic',
    name: 'Toxic',
    outer: '#1a2e05', mid: '#65a30d', inner: '#facc15', core: '#f7fee7',
    glow: 'rgba(132,204,22,0.6)',
  },
  {
    id: 'deepsea',
    name: 'Deep Sea',
    outer: '#0c1728', mid: '#0369a1', inner: '#22d3ee', core: '#ecfeff',
    glow: 'rgba(34,211,238,0.5)',
  },
  {
    id: 'bloodmoon',
    name: 'Blood Moon',
    outer: '#1c0a0a', mid: '#7f1d1d', inner: '#ef4444', core: '#fde68a',
    glow: 'rgba(239,68,68,0.6)',
  },
  // ---- MYTHIC (rarity beyond legendary) ----
  {
    id: 'rainbow',
    name: 'Rainbow',
    outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7',
    glow: 'rgba(168,85,247,0.7)',
  },
  {
    id: 'stargaze',
    name: 'Stargaze',
    outer: '#020617', mid: '#4c1d95', inner: '#ec4899', core: '#ffffff',
    glow: 'rgba(168,85,247,0.7)',
  },
  {
    id: 'eternal',
    name: 'Eternal',
    outer: '#000000', mid: '#f59e0b', inner: '#fbbf24', core: '#ffffff',
    glow: 'rgba(250,204,21,0.8)',
  },
];

export const ORB_PULSE_COLORS: OrbColorSet[] = [
  {
    id: 'fire',
    name: 'Fire',
    outer: '#92400e',
    mid: '#f97316',
    inner: '#fb923c',
    core: '#fef3c7',
    glow: 'rgba(249,115,22,0.4)',
  },
  {
    id: 'ice',
    name: 'Ice',
    outer: '#164e63',
    mid: '#06b6d4',
    inner: '#22d3ee',
    core: '#e0f2fe',
    glow: 'rgba(6,182,212,0.4)',
  },
  {
    id: 'lightning',
    name: 'Lightning',
    outer: '#713f12',
    mid: '#eab308',
    inner: '#facc15',
    core: '#fefce8',
    glow: 'rgba(234,179,8,0.4)',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    outer: '#1c1917',
    mid: '#44403c',
    inner: '#78716c',
    core: '#d6d3d1',
    glow: 'rgba(120,113,108,0.3)',
  },
  {
    id: 'plasma',
    name: 'Plasma',
    outer: '#701a75',
    mid: '#c026d3',
    inner: '#d946ef',
    core: '#f5d0fe',
    glow: 'rgba(192,38,211,0.4)',
  },
  {
    id: 'solar',
    name: 'Solar',
    outer: '#7c2d12',
    mid: '#f59e0b',
    inner: '#fde047',
    core: '#ffffff',
    glow: 'rgba(250,204,21,0.55)',
  },
  {
    id: 'void',
    name: 'Void',
    outer: '#020617',
    mid: '#3730a3',
    inner: '#7e22ce',
    core: '#e9d5ff',
    glow: 'rgba(88,28,135,0.55)',
  },
  {
    id: 'mystic',
    name: 'Mystic',
    outer: '#14532d',
    mid: '#059669',
    inner: '#8b5cf6',
    core: '#f5f3ff',
    glow: 'rgba(5,150,105,0.5)',
  },
  {
    id: 'inferno',
    name: 'Inferno',
    outer: '#450a0a',
    mid: '#b91c1c',
    inner: '#f97316',
    core: '#fef2f2',
    glow: 'rgba(185,28,28,0.6)',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    outer: '#1e3a8a',
    mid: '#4f46e5',
    inner: '#ec4899',
    core: '#fefce8',
    glow: 'rgba(79,70,229,0.55)',
  },
  // ---- More pulse mixes ----
  {
    id: 'pulse_sunset',
    name: 'Sunset Pulse',
    outer: '#831843', mid: '#f97316', inner: '#fb7185', core: '#fef3c7',
    glow: 'rgba(251,113,133,0.6)',
  },
  {
    id: 'pulse_toxic',
    name: 'Toxic Pulse',
    outer: '#14532d', mid: '#84cc16', inner: '#facc15', core: '#fefce8',
    glow: 'rgba(132,204,22,0.6)',
  },
  {
    id: 'pulse_candy',
    name: 'Candy Pulse',
    outer: '#701a75', mid: '#e879f9', inner: '#60a5fa', core: '#fef3c7',
    glow: 'rgba(232,121,249,0.55)',
  },
  {
    id: 'pulse_neon',
    name: 'Neon Pulse',
    outer: '#052e16', mid: '#22c55e', inner: '#67e8f9', core: '#ffffff',
    glow: 'rgba(34,197,94,0.6)',
  },
  // ---- MYTHIC pulse ----
  {
    id: 'pulse_rainbow',
    name: 'Rainbow Pulse',
    outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7',
    glow: 'rgba(236,72,153,0.65)',
  },
  {
    id: 'pulse_stargaze',
    name: 'Stargaze Pulse',
    outer: '#1e1b4b', mid: '#7c3aed', inner: '#ec4899', core: '#ffffff',
    glow: 'rgba(168,85,247,0.7)',
  },
  {
    id: 'pulse_eternal',
    name: 'Eternal Pulse',
    outer: '#000000', mid: '#b45309', inner: '#fbbf24', core: '#ffffff',
    glow: 'rgba(251,191,36,0.75)',
  },
];

export function getOrbBaseColor(id: string): OrbColorSet {
  return ORB_BASE_COLORS.find(c => c.id === id) || ORB_BASE_COLORS[0];
}

export function getOrbPulseColor(id: string): OrbColorSet {
  return ORB_PULSE_COLORS.find(c => c.id === id) || ORB_PULSE_COLORS[0];
}

// Ring colors — the spinning rings around the orb. Added as a third cosmetic
// axis independent from base/pulse.
export const ORB_RING_COLORS: OrbColorSet[] = [
  {
    id: 'ring_default',
    name: 'Default',
    outer: '#dc2626', mid: '#f59e0b', inner: '#fbbf24', core: '#ffffff',
    glow: 'rgba(245,158,11,0.3)',
  },
  {
    id: 'ring_silver',
    name: 'Silver',
    outer: '#475569', mid: '#94a3b8', inner: '#cbd5e1', core: '#f8fafc',
    glow: 'rgba(148,163,184,0.3)',
  },
  {
    id: 'ring_emerald',
    name: 'Emerald',
    outer: '#064e3b', mid: '#059669', inner: '#10b981', core: '#d1fae5',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    id: 'ring_sapphire',
    name: 'Sapphire',
    outer: '#1e3a8a', mid: '#2563eb', inner: '#60a5fa', core: '#dbeafe',
    glow: 'rgba(37,99,235,0.4)',
  },
  {
    id: 'ring_royal',
    name: 'Royal',
    outer: '#4c1d95', mid: '#7c3aed', inner: '#a78bfa', core: '#ede9fe',
    glow: 'rgba(124,58,237,0.4)',
  },
  {
    id: 'ring_rose',
    name: 'Rose',
    outer: '#881337', mid: '#e11d48', inner: '#fb7185', core: '#ffe4e6',
    glow: 'rgba(225,29,72,0.4)',
  },
  {
    id: 'ring_neon',
    name: 'Neon',
    outer: '#065f46', mid: '#22c55e', inner: '#a3e635', core: '#fefce8',
    glow: 'rgba(34,197,94,0.55)',
  },
  {
    id: 'ring_sunset',
    name: 'Sunset',
    outer: '#7c2d12', mid: '#ea580c', inner: '#f472b6', core: '#fef3c7',
    glow: 'rgba(236,72,153,0.5)',
  },
  {
    id: 'ring_aurora',
    name: 'Aurora',
    outer: '#14532d', mid: '#059669', inner: '#8b5cf6', core: '#fbcfe8',
    glow: 'rgba(139,92,246,0.55)',
  },
  {
    id: 'ring_molten',
    name: 'Molten',
    outer: '#450a0a', mid: '#dc2626', inner: '#f97316', core: '#fef9c3',
    glow: 'rgba(220,38,38,0.6)',
  },
  {
    id: 'ring_ghost',
    name: 'Ghost',
    outer: '#020617', mid: '#1e293b', inner: '#64748b', core: '#f1f5f9',
    glow: 'rgba(100,116,139,0.35)',
  },
  {
    id: 'ring_candy',
    name: 'Candy',
    outer: '#831843', mid: '#ec4899', inner: '#60a5fa', core: '#fef3c7',
    glow: 'rgba(236,72,153,0.55)',
  },
  {
    id: 'ring_toxic',
    name: 'Toxic',
    outer: '#1a2e05', mid: '#65a30d', inner: '#facc15', core: '#f7fee7',
    glow: 'rgba(132,204,22,0.6)',
  },
  // RAINBOW marker — renderer cycles hue over time when this is equipped
  {
    id: 'ring_rainbow',
    name: 'Rainbow',
    outer: '#dc2626', mid: '#eab308', inner: '#22c55e', core: '#a855f7',
    glow: 'rgba(168,85,247,0.6)',
  },
];

export function getOrbRingColor(id: string): OrbColorSet {
  return ORB_RING_COLORS.find(c => c.id === id) || ORB_RING_COLORS[0];
}

// Marker used by the renderer: rainbow variants cycle hue each frame.
export function isRainbowColor(id: string | undefined): boolean {
  return !!id && id.includes('rainbow');
}
