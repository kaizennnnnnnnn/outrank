// Soul Orb Evolution Tiers
// Each tier is visually distinct and dramatically more powerful

export interface OrbTier {
  tier: number;
  name: string;
  particles: number;
  rings: number;
  ringParticles: number;
  radius: number;      // as fraction of canvas size
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
];

export function getOrbTier(tier: number): OrbTier {
  return ORB_TIERS[Math.min(Math.max(tier - 1, 0), ORB_TIERS.length - 1)];
}
