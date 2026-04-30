/**
 * Onboarding draft persistence + derived values.
 *
 * The draft lives in localStorage during the funnel (the user has no
 * Firestore account yet). At signup time, we read the final draft and
 * write it to users/{uid}, then derive pillar goals from the answers
 * and seed the five pillars with those goals.
 *
 * Keep this file dependency-free of Firebase — that wiring belongs in
 * the signup step component, not here.
 */

import {
  DRAFT_SCHEMA_VERSION,
  DRAFT_STORAGE_KEY,
  OnboardingDraft,
} from '@/types/onboarding';

// ---------- Persistence ----------

export function readDraft(): OnboardingDraft {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OnboardingDraft;
    // Future schema migrations would branch on parsed.version here.
    if (parsed.version !== DRAFT_SCHEMA_VERSION) return {};
    return parsed;
  } catch {
    return {};
  }
}

export function writeDraft(draft: OnboardingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ ...draft, version: DRAFT_SCHEMA_VERSION }),
    );
  } catch {
    // Storage disabled / quota — funnel still works in-memory for the
    // session, just won't survive a refresh.
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- Derivations ----------

/**
 * Map the user's onboarding answers to per-pillar daily goals. Defaults
 * are conservative — the user can tweak from /habits later.
 *
 *   gym       — sessions per week (mapped to a daily count)
 *   steps     — daily step target
 *   water     — daily liters
 *   sleep     — daily hours
 *   no-social — daily focus / phone-free hours
 */
export function derivePillarGoals(draft: OnboardingDraft): {
  gym: number;
  steps: number;
  water: number;
  sleep: number;
  'no-social': number;
} {
  const exp = draft.experienceLevel ?? 'beginner';
  const wantsMuscle = !!draft.goals?.includes('build_muscle');
  const wantsFat = !!draft.goals?.includes('lose_fat');
  const wantsEnergy = !!draft.goals?.includes('energy');
  const wantsSleep = !!draft.goals?.includes('sleep_better');
  const wantsFocus = !!draft.goals?.includes('focus');

  // gym: 1 session/day on workout days, normalized as a daily flag
  const gym = 1;

  // steps: more aggressive if they want fat loss / energy
  let steps = 6000;
  if (wantsFat || wantsEnergy) steps = 8000;
  if (exp === 'advanced') steps = 10000;

  // water: 2L baseline; bump for advanced lifters / muscle goals
  let water = 2;
  if (wantsMuscle) water = 3;
  if (exp === 'advanced') water += 0.5;

  // sleep: 8h baseline; bump if they specifically want better sleep
  let sleep = 8;
  if (wantsSleep) sleep = 8.5;

  // no-social / focus: 2 hours of daily phone-free time, bumped if focus is a goal
  let noSocial = 2;
  if (wantsFocus) noSocial = 4;

  return { gym, steps, water, sleep, 'no-social': noSocial };
}

/**
 * Locale-aware default units. US/UK use imperial; everyone else metric.
 * Reading navigator.language is fine in browsers; on SSR we default to
 * metric (server can't know the user's locale before hydration).
 */
export function defaultUnits(): {
  weight: 'kg' | 'lbs';
  height: 'cm' | 'in';
} {
  if (typeof navigator === 'undefined') return { weight: 'kg', height: 'cm' };
  const lang = navigator.language?.toLowerCase() ?? '';
  const imperial = lang.startsWith('en-us') || lang.startsWith('en-gb');
  return imperial ? { weight: 'lbs', height: 'in' } : { weight: 'kg', height: 'cm' };
}
