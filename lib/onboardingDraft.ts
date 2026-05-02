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

// ---------- Initial pillar ranks (preview) ----------

export type PillarLetter = 'F' | 'D' | 'C' | 'C+' | 'B' | 'B+' | 'A' | 'A+';

/** 8-tier rank index → letter grade. Mirrors phase 6's 8 ranks. */
const LETTER_BY_INDEX: PillarLetter[] = ['F', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+'];

/** Strength thresholds per exercise — kept in sync with phase 6's EXERCISES table. */
const STRENGTH_THRESHOLDS: Record<string, number[]> = {
  pushups:  [0, 6, 16, 31, 51, 76, 101, 151],
  pullups:  [0, 2, 6, 11, 16, 21, 26, 36],
  situps:   [0, 10, 25, 40, 60, 80, 110, 150],
  bench:    [0, 30, 50, 70, 90, 110, 130, 160],
  squat:    [0, 40, 70, 100, 130, 160, 190, 230],
  deadlift: [0, 50, 90, 130, 170, 200, 230, 270],
};

function letterFromIndex(idx: number): PillarLetter {
  const clamped = Math.max(0, Math.min(LETTER_BY_INDEX.length - 1, idx));
  return LETTER_BY_INDEX[clamped];
}

function letterFromScore(score: number): PillarLetter {
  // score is a 0..1 estimate; map to the 8-tier ladder so the
  // explainer feels consistent with phase 6's strength rank.
  const idx = Math.round(score * (LETTER_BY_INDEX.length - 1));
  return letterFromIndex(idx);
}

export interface PillarRanks {
  strength:  PillarLetter;
  sleep:     PillarLetter;
  hydration: PillarLetter;
  focus:     PillarLetter;
  steps:     PillarLetter;
  /** Pillar names that landed at F or D — used to drive the "weak" highlight. */
  weak:      Array<'strength' | 'sleep' | 'hydration' | 'focus' | 'steps'>;
}

/**
 * Estimate an initial rank for each of the 5 pillars from the
 * onboarding draft. These are previews — the user hasn't logged
 * anything yet, but their answers (struggles, goals, statements,
 * experience level, best lift) give us enough signal to show a
 * believable starting state on the ranking explainer.
 *
 * Strength uses the actual best lift the user just entered in phase 6.
 * The rest are heuristics from struggles/statements/goals.
 */
export function derivePillarRanks(draft: OnboardingDraft): PillarRanks {
  const struggles = new Set(draft.struggles ?? []);
  const statements = new Set(draft.statementsRelating ?? []);
  const goals = new Set(draft.goals ?? []);
  const exp = draft.experienceLevel ?? 'beginner';
  const energy = draft.energyLevels ?? 'medium';

  // --- Strength: from real best lift ---
  let strength: PillarLetter = 'C';
  const lift = draft.bestLifts?.[0];
  if (lift) {
    const thresholds = STRENGTH_THRESHOLDS[lift.exercise];
    if (thresholds) {
      // For weight lifts, compare against absolute weight; for reps
      // lifts, compare against reps. Same logic as phase 6.
      const value = lift.weight ?? lift.reps;
      let rankIdx = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (value >= thresholds[i]) rankIdx = i;
      }
      strength = letterFromIndex(rankIdx);
    }
  } else {
    // No lift entered — fall back to experience level.
    if (exp === 'never')        strength = 'F';
    else if (exp === 'beginner')     strength = 'D';
    else if (exp === 'intermediate') strength = 'C+';
    else if (exp === 'advanced')     strength = 'B+';
  }

  // --- Sleep: troubled signals → low; sleep_better goal → at least keep it middling ---
  let sleepScore = 0.55;
  if (struggles.has('trouble_sleeping'))   sleepScore -= 0.30;
  if (statements.has('inconsistent_sleep')) sleepScore -= 0.20;
  if (energy === 'low')                     sleepScore -= 0.15;
  if (energy === 'high')                    sleepScore += 0.10;
  if (goals.has('sleep_better'))            sleepScore -= 0.05; // they want it because it's lacking
  const sleep = letterFromScore(clamp(sleepScore));

  // --- Hydration: forget_water is the strong signal ---
  let waterScore = 0.65;
  if (struggles.has('forget_water'))        waterScore -= 0.40;
  if (goals.has('build_muscle'))            waterScore += 0.05;
  const hydration = letterFromScore(clamp(waterScore));

  // --- Focus: phone addiction + distractibility + screen time ---
  let focusScore = 0.55;
  if (struggles.has('phone_addiction'))     focusScore -= 0.35;
  if (statements.has('distracted_easily'))  focusScore -= 0.20;
  if (struggles.has('stress_anxiety'))      focusScore -= 0.10;
  if (goals.has('focus'))                   focusScore -= 0.05;
  if (goals.has('discipline'))              focusScore += 0.05;
  const focus = letterFromScore(clamp(focusScore));

  // --- Steps: NEAT activity. No direct signal, so use proxies:
  //     - Low morning motivation / energy crashes → less movement.
  //     - Workout days/week is a movement proxy. ---
  let stepsScore = 0.55;
  if (struggles.has('low_morning_motivation')) stepsScore -= 0.10;
  if (struggles.has('energy_crashes'))         stepsScore -= 0.10;
  if (typeof draft.workoutDaysPerWeek === 'number') {
    if (draft.workoutDaysPerWeek >= 5) stepsScore += 0.20;
    else if (draft.workoutDaysPerWeek >= 3) stepsScore += 0.10;
  }
  if (goals.has('lose_fat') || goals.has('energy')) stepsScore += 0.05;
  const steps = letterFromScore(clamp(stepsScore));

  const ranks: PillarRanks = {
    strength,
    sleep,
    hydration,
    focus,
    steps,
    weak: [],
  };

  // Mark anything F/D as weak — this is what the UI highlights.
  (['strength', 'sleep', 'hydration', 'focus', 'steps'] as const).forEach((k) => {
    if (ranks[k] === 'F' || ranks[k] === 'D') ranks.weak.push(k);
  });

  return ranks;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
