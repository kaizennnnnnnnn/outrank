// Habit Mastery — 10 tiers per-habit, gated on total logs. Shown on the
// profile as a shelf of medals and on habit-detail as the user's mastery rank.

export interface MasteryTier {
  tier: number;            // 1..10
  name: string;
  minLogs: number;
  color: string;
}

export const MASTERY_TIERS: MasteryTier[] = [
  { tier: 1,  name: 'Bronze',    minLogs: 5,    color: '#cd7f32' },
  { tier: 2,  name: 'Iron',      minLogs: 15,   color: '#78716c' },
  { tier: 3,  name: 'Silver',    minLogs: 30,   color: '#cbd5e1' },
  { tier: 4,  name: 'Gold',      minLogs: 60,   color: '#fbbf24' },
  { tier: 5,  name: 'Platinum',  minLogs: 100,  color: '#67e8f9' },
  { tier: 6,  name: 'Diamond',   minLogs: 175,  color: '#93c5fd' },
  { tier: 7,  name: 'Emerald',   minLogs: 275,  color: '#34d399' },
  { tier: 8,  name: 'Ruby',      minLogs: 400,  color: '#f87171' },
  { tier: 9,  name: 'Sapphire',  minLogs: 600,  color: '#818cf8' },
  { tier: 10, name: 'Obsidian',  minLogs: 1000, color: '#a855f7' },
];

/** Highest tier whose minLogs ≤ logs. Returns null before Bronze. */
export function getMasteryTier(logs: number): MasteryTier | null {
  let current: MasteryTier | null = null;
  for (const t of MASTERY_TIERS) {
    if (logs >= t.minLogs) current = t;
  }
  return current;
}

/** Next tier the user is working toward. Returns null at max. */
export function getNextMasteryTier(logs: number): MasteryTier | null {
  for (const t of MASTERY_TIERS) {
    if (logs < t.minLogs) return t;
  }
  return null;
}

/** 0..1 progress toward the next tier. */
export function getMasteryProgress(logs: number): number {
  const current = getMasteryTier(logs);
  const next = getNextMasteryTier(logs);
  if (!next) return 1;
  const lo = current?.minLogs ?? 0;
  return Math.max(0, Math.min(1, (logs - lo) / (next.minLogs - lo)));
}
