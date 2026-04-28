import { Timestamp, setDocument } from './firestore';
import { CATEGORIES } from '@/constants/categories';
import { PILLARS, Pillar } from '@/constants/pillars';

interface SeedOptions {
  /** Override the pillar's default goal — used by onboarding's
   *  goal-customization step. Falls back to pillar.defaultGoal. */
  goal?: number;
}

/**
 * Idempotently create the userHabit doc for a pillar. Used:
 *   - In onboarding: seed all five pillars after username step.
 *   - On the dashboard: tap a placeholder pillar row to set it up
 *     without leaving the page.
 *
 * Uses setDocument with merge:false because we only want to create the
 * doc if missing — caller should check existence first if they want to
 * preserve user-customized goals.
 */
export async function seedPillar(userId: string, pillar: Pillar, options?: SeedOptions): Promise<void> {
  const cat = CATEGORIES.find((c) => c.slug === pillar.slug);
  if (!cat) {
    // Defensive: if a pillar's slug ever stops mapping to a category,
    // this surfaces loudly rather than writing a half-broken habit.
    throw new Error(`No CATEGORIES entry for pillar slug "${pillar.slug}"`);
  }
  await setDocument(
    `habits/${userId}/userHabits`,
    pillar.slug,
    {
      categoryId: pillar.slug,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categorySlug: pillar.slug,
      goal: options?.goal ?? pillar.defaultGoal,
      goalPeriod: 'daily',
      isPublic: true,
      currentStreak: 0,
      longestStreak: 0,
      totalLogs: 0,
      lastLogDate: null,
      createdAt: Timestamp.now(),
      color: cat.color,
      unit: cat.unit,
    },
    false,
  );
}

/**
 * Bulk seed every pillar — used by onboarding. Optional `goalOverrides`
 * map keyed by pillar slug lets the caller surface goals from the
 * onboarding wizard; missing entries fall back to each pillar's
 * defaultGoal.
 */
export async function seedAllPillars(
  userId: string,
  goalOverrides?: Record<string, number>,
): Promise<void> {
  await Promise.all(PILLARS.map((p) => seedPillar(userId, p, { goal: goalOverrides?.[p.slug] })));
}
