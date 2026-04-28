/**
 * The five core pillars that drive the published Daily Recap.
 *
 * Custom habits coexist with pillars (soft path) — they log normally and
 * count toward personal stats but **never appear in the published recap**.
 * Only pillar logs flow into a friend's feed. Soft-deprecates the wide-open
 * category list without breaking existing users.
 *
 * Slugs match the existing CATEGORIES entries so colors, icons, units, and
 * goal configs stay shared. To "promote" a category to pillar status here
 * is just adding its slug to PILLAR_SLUGS — no data migration needed.
 */

export type PillarSlug = 'gym' | 'steps' | 'water' | 'sleep' | 'no-social';

/**
 * `manual`       — user enters values themselves (gym, water).
 * `tracker`      — pulled from a connected health integration when wired
 *                  (steps, sleep). Manual entry stays as a fallback but
 *                  marks the log unverified.
 * `native-block` — provided by a native shell (HealthKit / FamilyControls
 *                  for iOS, AccessibilityService for Android). Phase 6.
 *                  In a pure PWA build this stays manual until the native
 *                  shell is added.
 */
export type PillarSource = 'manual' | 'tracker' | 'native-block';

export interface Pillar {
  slug: PillarSlug;
  /** Pillar-context display name; can differ from CATEGORIES.name. */
  name: string;
  /** Tight contexts (nav chips, recap tile headers). */
  shortName: string;
  /** Marketing one-liner shown on placeholder rows + setup screens. */
  blurb: string;
  defaultGoal: number;
  source: PillarSource;
  /** Reserved for future per-pillar privacy opt-out. v1: all true. */
  appearsInRecap: boolean;
}

export const PILLARS: Pillar[] = [
  {
    slug: 'gym',
    name: 'Gym',
    shortName: 'Gym',
    blurb: 'Lift, calisthenics, or hybrid — track sets, reps, and PRs.',
    defaultGoal: 1,
    source: 'manual',
    appearsInRecap: true,
  },
  {
    slug: 'steps',
    name: 'Daily Steps',
    shortName: 'Steps',
    blurb: 'Synced from your tracker for verified counts.',
    defaultGoal: 8000,
    source: 'tracker',
    appearsInRecap: true,
  },
  {
    slug: 'water',
    name: 'Water',
    shortName: 'Water',
    blurb: 'Hit your hydration goal with smart reminders.',
    defaultGoal: 3,
    source: 'manual',
    appearsInRecap: true,
  },
  {
    slug: 'sleep',
    name: 'Sleep',
    shortName: 'Sleep',
    blurb: 'Wind-down reminders and integrated sleep tracking.',
    defaultGoal: 8,
    source: 'tracker',
    appearsInRecap: true,
  },
  {
    slug: 'no-social',
    name: 'Focus',
    shortName: 'Focus',
    blurb: 'Block distracting apps during your focus window.',
    defaultGoal: 1,
    source: 'native-block',
    appearsInRecap: true,
  },
];

export const PILLAR_SLUGS: ReadonlySet<string> = new Set(PILLARS.map((p) => p.slug));

export function isPillarSlug(slug: string): boolean {
  return PILLAR_SLUGS.has(slug);
}

export function getPillar(slug: string): Pillar | undefined {
  return PILLARS.find((p) => p.slug === slug);
}

/** Order pillars in the canonical UI order. Stable for the dashboard list. */
export function pillarOrder(slug: string): number {
  const idx = PILLARS.findIndex((p) => p.slug === slug);
  return idx === -1 ? 999 : idx;
}
