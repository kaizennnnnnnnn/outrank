// Soul Orb Evolution Tiers — 10 total
// Each tier is visually distinct and dramatically more powerful than the last.
// Tiers 6-10 introduce new mechanics: cosmic scale, multi-core, rainbow shifts.

export interface OrbTier {
  tier: number;
  name: string;
  particles: number;
  rings: number;
  ringParticles: number;
  radius: number;
  arcChance: number;
  pulseChance: number;
  maxArcs: number;
  connectionDist: number;
  glowIntensity: number;
  colors: {
    outer: string;
    mid: string;
    inner: string;
    core: string;
    glow: string;
  };
  description: string;
  /** From tier 6+: rainbow hue shift over time. 0 = no shift. */
  hueShift?: number;
  /** From tier 7+: extra orbiting satellite particles. */
  satellites?: number;
}

export const ORB_TIERS: OrbTier[] = [
  {
    tier: 1,
    name: 'Ember',
    particles: 120,
    rings: 0,
    ringParticles: 0,
    radius: 0.22,
    arcChance: 0.005,
    pulseChance: 0.01,
    maxArcs: 1,
    connectionDist: 15,
    glowIntensity: 0.3,
    colors: {
      outer: '#44403c',
      mid: '#78716c',
      inner: '#a8a29e',
      core: '#d6d3d1',
      glow: 'rgba(120,113,108,0.15)',
    },
    description: 'A faint spark. Keep logging to awaken it.',
  },
  {
    tier: 2,
    name: 'Flame',
    particles: 220,
    rings: 1,
    ringParticles: 40,
    radius: 0.25,
    arcChance: 0.015,
    pulseChance: 0.02,
    maxArcs: 2,
    connectionDist: 22,
    glowIntensity: 0.5,
    colors: {
      outer: '#92400e',
      mid: '#d97706',
      inner: '#f59e0b',
      core: '#fbbf24',
      glow: 'rgba(217,119,6,0.2)',
    },
    description: 'Warmth stirs within. The flame grows.',
  },
  {
    tier: 3,
    name: 'Inferno',
    particles: 350,
    rings: 2,
    ringParticles: 55,
    radius: 0.28,
    arcChance: 0.025,
    pulseChance: 0.035,
    maxArcs: 4,
    connectionDist: 28,
    glowIntensity: 0.7,
    colors: {
      outer: '#7f1d1d',
      mid: '#dc2626',
      inner: '#ef4444',
      core: '#fbbf24',
      glow: 'rgba(220,38,38,0.25)',
    },
    description: 'Burning with purpose. Unstoppable.',
  },
  {
    tier: 4,
    name: 'Phoenix',
    particles: 500,
    rings: 3,
    ringParticles: 70,
    radius: 0.31,
    arcChance: 0.04,
    pulseChance: 0.05,
    maxArcs: 6,
    connectionDist: 35,
    glowIntensity: 0.85,
    colors: {
      outer: '#991b1b',
      mid: '#dc2626',
      inner: '#f97316',
      core: '#fbbf24',
      glow: 'rgba(220,38,38,0.35)',
    },
    description: 'Reborn from the ashes. Legendary.',
  },
  {
    tier: 5,
    name: 'Supernova',
    particles: 700,
    rings: 4,
    ringParticles: 85,
    radius: 0.34,
    arcChance: 0.06,
    pulseChance: 0.07,
    maxArcs: 10,
    connectionDist: 40,
    glowIntensity: 1.0,
    colors: {
      outer: '#7f1d1d',
      mid: '#dc2626',
      inner: '#ef4444',
      core: '#ffffff',
      glow: 'rgba(239,68,68,0.45)',
    },
    description: 'A cosmic force. The universe watches.',
  },
  {
    tier: 6,
    name: 'Galactic',
    particles: 950,
    rings: 5,
    ringParticles: 100,
    radius: 0.37,
    arcChance: 0.075,
    pulseChance: 0.09,
    maxArcs: 14,
    connectionDist: 46,
    glowIntensity: 1.15,
    colors: {
      outer: '#312e81',
      mid: '#6366f1',
      inner: '#a855f7',
      core: '#fef08a',
      glow: 'rgba(99,102,241,0.5)',
    },
    description: 'A spiral of worlds. You bend gravity itself.',
    hueShift: 0.02,
    satellites: 3,
  },
  {
    tier: 7,
    name: 'Nebula',
    particles: 1200,
    rings: 6,
    ringParticles: 115,
    radius: 0.39,
    arcChance: 0.09,
    pulseChance: 0.11,
    maxArcs: 18,
    connectionDist: 52,
    glowIntensity: 1.3,
    colors: {
      outer: '#581c87',
      mid: '#9333ea',
      inner: '#ec4899',
      core: '#fde68a',
      glow: 'rgba(192,38,211,0.5)',
    },
    description: 'Birthplace of stars. Every log forges new matter.',
    hueShift: 0.04,
    satellites: 5,
  },
  {
    tier: 8,
    name: 'Singularity',
    particles: 1500,
    rings: 7,
    ringParticles: 130,
    radius: 0.41,
    arcChance: 0.11,
    pulseChance: 0.13,
    maxArcs: 24,
    connectionDist: 58,
    glowIntensity: 1.45,
    colors: {
      outer: '#0c0a09',
      mid: '#1e1b4b',
      inner: '#7c3aed',
      core: '#f0abfc',
      glow: 'rgba(109,40,217,0.6)',
    },
    description: 'Where time slows. Inescapable discipline.',
    hueShift: 0.05,
    satellites: 7,
  },
  {
    tier: 9,
    name: 'Primordial',
    particles: 1800,
    rings: 8,
    ringParticles: 145,
    radius: 0.43,
    arcChance: 0.14,
    pulseChance: 0.16,
    maxArcs: 30,
    connectionDist: 64,
    glowIntensity: 1.6,
    colors: {
      outer: '#14532d',
      mid: '#059669',
      inner: '#22d3ee',
      core: '#fef08a',
      glow: 'rgba(34,211,238,0.6)',
    },
    description: 'The first light. You precede the stars.',
    hueShift: 0.08,
    satellites: 10,
  },
  {
    tier: 10,
    name: 'Transcendent',
    particles: 2200,
    rings: 9,
    ringParticles: 160,
    radius: 0.45,
    arcChance: 0.18,
    pulseChance: 0.2,
    maxArcs: 40,
    connectionDist: 72,
    glowIntensity: 1.8,
    colors: {
      outer: '#7f1d1d',
      mid: '#dc2626',
      inner: '#f59e0b',
      core: '#ffffff',
      glow: 'rgba(239,68,68,0.7)',
    },
    description: 'Beyond mortal limits. You are the benchmark.',
    hueShift: 0.12,
    satellites: 14,
  },
];

export function getOrbTier(tier: number): OrbTier {
  return ORB_TIERS[Math.min(Math.max(tier - 1, 0), ORB_TIERS.length - 1)];
}

export const MAX_ORB_TIER = ORB_TIERS.length;
