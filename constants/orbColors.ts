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
];

export function getOrbBaseColor(id: string): OrbColorSet {
  return ORB_BASE_COLORS.find(c => c.id === id) || ORB_BASE_COLORS[0];
}

export function getOrbPulseColor(id: string): OrbColorSet {
  return ORB_PULSE_COLORS.find(c => c.id === id) || ORB_PULSE_COLORS[0];
}
