import {
  doc,
  collection,
  setDoc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { logHabit } from './logHabit';
import { getProgram } from '@/constants/gymPrograms';
import { getExercise, EXERCISES } from '@/constants/exercises';
import type { OnboardingDraft } from '@/types/onboarding';
import {
  Program,
  ProgramDay,
  ProgramExercisePrescription,
  MuscleGroup,
  Equipment,
  Exercise,
  Workout,
  WorkoutExercise,
  UserGymState,
} from '@/types/gym';

/**
 * Gym helpers.
 *
 * Source of truth for the user's gym state lives on `users/{uid}.gym`
 * (UserGymState). Workouts are a subcollection at
 * `gymWorkouts/{uid}/items/{workoutId}` — owner-only read/write.
 *
 * Day index advances on workout completion (mod schedule.length) so a
 * skipped calendar day doesn't skip the prescribed session. The Daily
 * Recap link happens via `logHabit({ habitSlug: 'gym', value: 1 })` —
 * the gym pillar's recap entry is a thin pointer to the workout doc.
 */

export const GYM_WORKOUTS_COLLECTION = 'gymWorkouts';

/**
 * Pick a starter program based on the user's onboarding answers.
 *
 * Heuristic:
 * 1. exerciseLocation === 'bodyweight' OR no equipment → calisthenics rr-3
 * 2. experienceLevel === 'never' / 'beginner' → fb-3 (full body) regardless
 *    of days unless the user explicitly committed to 6 sessions/week
 * 3. workoutDaysPerWeek >= 6 → ppl-6
 * 4. workoutDaysPerWeek 4-5 → ul-4
 * 5. anything else → fb-3
 *
 * The function is total — it always returns a valid PROGRAM id.
 */
export function recommendProgram(profile: {
  experienceLevel?: 'never' | 'beginner' | 'intermediate' | 'advanced';
  exerciseLocation?: 'commercial' | 'small_gym' | 'garage' | 'home' | 'bodyweight';
  workoutDaysPerWeek?: number;
}): string {
  if (profile.exerciseLocation === 'bodyweight') return 'rr-3';

  const days = profile.workoutDaysPerWeek ?? 3;
  const isBeginner =
    profile.experienceLevel === 'never' || profile.experienceLevel === 'beginner';

  if (isBeginner && days < 6) return 'fb-3';
  if (days >= 6) return 'ppl-6';
  if (days >= 4) return 'ul-4';
  return 'fb-3';
}

// ─── Tailored program builder ─────────────────────────────────────
//
// Generates a Program tailored to the user's full onboarding draft:
// days/week + duration + equipment + struggles + goals + experience.
// Used at signup time so the user's first /gym visit shows a routine
// actually shaped by what they told us.

type SplitDay = 'full' | 'push' | 'pull' | 'legs' | 'upper' | 'lower';

const SPLIT_MUSCLES: Record<SplitDay, { name: string; muscles: MuscleGroup[]; primaryCount: number; isolationCount: number }> = {
  full:  { name: 'Full Body',  muscles: ['quads', 'chest', 'back', 'shoulders', 'core'],            primaryCount: 3, isolationCount: 2 },
  push:  { name: 'Push',       muscles: ['chest', 'shoulders', 'triceps'],                           primaryCount: 2, isolationCount: 3 },
  pull:  { name: 'Pull',       muscles: ['back', 'biceps'],                                          primaryCount: 2, isolationCount: 2 },
  legs:  { name: 'Legs',       muscles: ['quads', 'hamstrings', 'glutes', 'calves'],                 primaryCount: 2, isolationCount: 3 },
  upper: { name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],         primaryCount: 3, isolationCount: 3 },
  lower: { name: 'Lower Body', muscles: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],         primaryCount: 2, isolationCount: 3 },
};

/** Pick the split sequence for the user's days-per-week. */
function pickSplit(daysPerWeek: number, beginner: boolean): SplitDay[] {
  const days = Math.max(1, Math.min(6, daysPerWeek || 3));
  if (days <= 2)         return ['full', 'full'].slice(0, days) as SplitDay[];
  if (days === 3)        return beginner ? ['full', 'full', 'full'] : ['push', 'pull', 'legs'];
  if (days === 4)        return ['upper', 'lower', 'upper', 'lower'];
  if (days === 5)        return ['push', 'pull', 'legs', 'upper', 'lower'];
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
}

/** Exercises whose equipment is in the user's available set. Empty
 *  set / 'commercial' / 'small_gym' allows everything. Bodyweight
 *  always passes. */
function passesEquipment(ex: Exercise, available: Set<Equipment>, openGym: boolean): boolean {
  if (ex.equipment === 'bodyweight') return true;
  if (openGym) return true;
  return available.has(ex.equipment);
}

/** Hardcoded exercise IDs to exclude when the user reported a
 *  joint-sensitivity struggle. Conservative — drops the heaviest /
 *  most aggravating moves and lets the builder pick safer subs. */
const STRUGGLE_EXCLUDE: Record<string, string[]> = {
  sensitive_back:      ['deadlift', 'romanian-deadlift', 'barbell-row', 'back-squat', 'front-squat'],
  sensitive_knees:     ['back-squat', 'front-squat', 'walking-lunge', 'bulgarian-split-sq', 'pistol-squat', 'pike-pushup'],
  sensitive_shoulders: ['overhead-press', 'bench-press', 'dip', 'pike-pushup', 'pullup', 'chinup'],
  sensitive_wrists:    ['bench-press', 'overhead-press', 'close-grip-bench', 'pushup', 'diamond-pushup', 'pike-pushup'],
};

/** Map ExerciseLocation onto an "open gym" flag (no equipment
 *  filter) plus a default equipment whitelist for home/garage. */
function resolveEquipment(draft: OnboardingDraft): { available: Set<Equipment>; openGym: boolean; bodyweightOnly: boolean } {
  const loc = draft.exerciseLocation;
  if (loc === 'bodyweight') {
    return { available: new Set(['bodyweight']), openGym: false, bodyweightOnly: true };
  }
  if (loc === 'commercial' || loc === 'small_gym') {
    return { available: new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']), openGym: true, bodyweightOnly: false };
  }
  // Home / garage / unspecified: respect the explicit equipment list
  // when present; otherwise default to dumbbells + bodyweight (the
  // most common home setup).
  const eq = (draft.equipment || []) as Equipment[];
  const set = new Set<Equipment>(eq.length > 0 ? eq : ['dumbbell', 'bodyweight']);
  set.add('bodyweight');
  return { available: set, openGym: false, bodyweightOnly: false };
}

/** Pick N exercises from a pool, prioritising compounds (multi-
 *  muscle) before isolation, and avoiding repeating exercise ids
 *  already chosen for the day. */
function pickFromPool(pool: Exercise[], count: number, alreadyPicked: Set<string>): Exercise[] {
  const picked: Exercise[] = [];
  // Sort compounds first by # of secondary muscles, then by name for
  // determinism.
  const sorted = [...pool].sort((a, b) => {
    const sa = a.secondaryMuscles?.length || 0;
    const sb = b.secondaryMuscles?.length || 0;
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name);
  });
  for (const ex of sorted) {
    if (picked.length >= count) break;
    if (alreadyPicked.has(ex.id)) continue;
    picked.push(ex);
    alreadyPicked.add(ex.id);
  }
  return picked;
}

/** Map duration (minutes) into a target exercise count per day. ~9
 *  minutes/exercise (warmup + 3-4 sets + rest + transition). */
function exercisesForDuration(minutes: number | undefined): number {
  const m = minutes ?? 60;
  if (m <= 30) return 4;
  if (m <= 45) return 5;
  if (m <= 60) return 6;
  if (m <= 75) return 7;
  if (m <= 90) return 8;
  return 9;
}

/** Pick rep range + set count based on goals + experience. */
function prescriptionFor(
  ex: Exercise,
  isPrimary: boolean,
  goals: Set<string>,
  beginner: boolean,
): { sets: number; repsMin: number; repsMax: number } {
  // Compounds get heavier work: 4 sets for non-beginners, 3 for
  // beginners. Isolation sticks to 3 sets.
  const sets = isPrimary && !beginner ? 4 : 3;

  // Bodyweight holds (l-sit, plank) keep their hold-as-reps style
  // unchanged from the static catalogue.
  if (ex.id === 'plank' || ex.id === 'l-sit') {
    return { sets: 3, repsMin: 30, repsMax: 60 };
  }

  // Goal bias.
  let repsMin = 8;
  let repsMax = 12;
  if (goals.has('lose_fat')) {
    repsMin = 12;
    repsMax = 15;
  } else if (isPrimary) {
    // Strength bias for compounds when the goal isn't fat loss.
    repsMin = 5;
    repsMax = 8;
  }
  return { sets, repsMin, repsMax };
}

/** Compose the day name, biased to what the user likely calls it. */
function dayLabel(splitDay: SplitDay, idx: number, total: number): string {
  const base = SPLIT_MUSCLES[splitDay].name;
  // For repeated splits (PPL twice in 6-day), suffix A/B so they
  // read as distinct sessions.
  const repeatIdx = total > 3 && (splitDay === 'push' || splitDay === 'pull' || splitDay === 'legs')
    ? (idx >= 3 ? 'B' : 'A')
    : null;
  return repeatIdx ? `${base} ${repeatIdx}` : base;
}

export interface TailoredProgramResult {
  program: Program;
  /** Reasons / signals that drove the build, surfaced to the user
   *  so they understand WHY this routine. */
  reasons: string[];
}

/**
 * Build a Program tailored to the full onboarding draft. Considers:
 *  - workoutDaysPerWeek -> split selection
 *  - workoutDuration    -> exercise count per day
 *  - equipment / location -> exercise pool filter
 *  - struggles          -> exercise exclusions for sensitive joints
 *  - goals              -> rep ranges (lose_fat = higher reps)
 *  - experienceLevel    -> set counts (beginner = 3, intermediate+
 *                         = 4 for compounds)
 *  - lastMuscles        -> bumps day order so recently-worked muscles
 *                         get rest first
 */
export function buildTailoredProgram(draft: OnboardingDraft): TailoredProgramResult {
  const reasons: string[] = [];
  const beginner = draft.experienceLevel === 'never' || draft.experienceLevel === 'beginner';
  const days = Math.max(1, Math.min(6, draft.workoutDaysPerWeek ?? 3));
  const duration = draft.workoutDuration ?? 60;
  const goals = new Set<string>(draft.goals || []);
  const struggles = (draft.struggles || []) as Array<keyof typeof STRUGGLE_EXCLUDE>;
  const { available, openGym, bodyweightOnly } = resolveEquipment(draft);

  // Build exclusion set from all reported struggles
  const excluded = new Set<string>();
  for (const s of struggles) {
    if (STRUGGLE_EXCLUDE[s]) {
      for (const id of STRUGGLE_EXCLUDE[s]) excluded.add(id);
    }
  }

  // Pre-filter the master catalogue once.
  const usable = EXERCISES.filter((ex) => {
    if (excluded.has(ex.id)) return false;
    if (bodyweightOnly && ex.path !== 'calisthenics') return false;
    return passesEquipment(ex, available, openGym);
  });

  const targetCount = exercisesForDuration(duration);
  const split = pickSplit(days, beginner);

  // Re-order split so days targeting recently-worked muscles get
  // pushed later — gives those muscles more recovery on the first
  // cycle.
  const lastWorked = new Set<string>(draft.lastMuscles || []);
  const muscleToHumanKey: Record<MuscleGroup, string> = {
    chest: 'chest', back: 'back', shoulders: 'shoulders', biceps: 'arms',
    triceps: 'arms', quads: 'legs', hamstrings: 'legs', glutes: 'legs',
    calves: 'legs', core: 'abs', forearms: 'arms', 'full-body': 'full-body',
  };
  const dayHitsRecent = (s: SplitDay): boolean =>
    SPLIT_MUSCLES[s].muscles.some((m) => lastWorked.has(muscleToHumanKey[m]));
  if (lastWorked.size > 0) {
    split.sort((a, b) => Number(dayHitsRecent(a)) - Number(dayHitsRecent(b)));
  }

  const schedule: ProgramDay[] = split.map((s, idx) => {
    const def = SPLIT_MUSCLES[s];
    const alreadyPicked = new Set<string>();
    const exercises: ProgramExercisePrescription[] = [];

    // Primary lifts: one per muscle group up to primaryCount.
    for (const muscle of def.muscles.slice(0, def.primaryCount)) {
      const pool = usable.filter((ex) => ex.primaryMuscle === muscle && (ex.secondaryMuscles?.length || 0) >= 1);
      const fallbackPool = usable.filter((ex) => ex.primaryMuscle === muscle);
      const picks = pickFromPool(pool.length > 0 ? pool : fallbackPool, 1, alreadyPicked);
      for (const ex of picks) {
        const presc = prescriptionFor(ex, true, goals, beginner);
        exercises.push({ exerciseId: ex.id, ...presc });
      }
    }

    // Isolation / accessory work: fill up to targetCount, walking
    // through the day's muscles in a round-robin so we don't load
    // up on one group.
    const remaining = Math.max(0, targetCount - exercises.length);
    let isoBudget = remaining;
    let cursor = 0;
    while (isoBudget > 0) {
      const muscle = def.muscles[cursor % def.muscles.length];
      const pool = usable.filter((ex) => ex.primaryMuscle === muscle);
      const picks = pickFromPool(pool, 1, alreadyPicked);
      if (picks.length === 0) {
        // No exercises left for this muscle — try a different one
        // before giving up.
        cursor += 1;
        if (cursor > def.muscles.length * 2) break;
        continue;
      }
      const ex = picks[0];
      const presc = prescriptionFor(ex, false, goals, beginner);
      exercises.push({ exerciseId: ex.id, ...presc });
      isoBudget -= 1;
      cursor += 1;
    }

    return {
      name: dayLabel(s, idx, split.length),
      exercises,
    };
  });

  // Build reasons list — surfaced to UI so the user sees why this
  // routine was chosen.
  reasons.push(`${days} day${days === 1 ? '' : 's'} per week per your schedule`);
  reasons.push(`~${duration} min per session`);
  if (bodyweightOnly) reasons.push('Bodyweight-only — no equipment needed');
  else if (!openGym && available.size > 1) reasons.push(`Uses your equipment: ${Array.from(available).filter((e) => e !== 'bodyweight').join(', ')}`);
  if (struggles.length > 0) reasons.push(`Avoiding moves that aggravate: ${struggles.map((s) => s.replace('sensitive_', '')).join(', ')}`);
  if (goals.has('lose_fat')) reasons.push('Higher rep ranges for fat loss');
  else if (goals.has('build_muscle')) reasons.push('Hypertrophy rep ranges (8–12)');
  if (beginner) reasons.push('Beginner-friendly — 3 sets across the board');
  if (lastWorked.size > 0) reasons.push(`Cycle reordered to rest your last-worked muscles first`);

  const audienceParts: string[] = [];
  audienceParts.push(`${days} day${days === 1 ? '' : 's'}/week`);
  audienceParts.push(`~${duration} min`);
  if (bodyweightOnly) audienceParts.push('bodyweight');
  if (beginner) audienceParts.push('beginner');

  const program: Program = {
    id: 'custom',
    name: 'Your Routine',
    shortName: 'Yours',
    daysPerWeek: split.length,
    path: bodyweightOnly ? 'calisthenics' : 'lift',
    description: 'Built from your onboarding answers — duration, equipment, goals, and any joints you flagged.',
    audience: audienceParts.join(' · '),
    schedule,
  };

  return { program, reasons };
}

/**
 * Persist the user's chosen program + path. Resets dayIndex to 0 so
 * the first workout starts at the program's first day. Workout
 * history is kept across program changes — switching programs is
 * cheap.
 */
export async function selectProgram(userId: string, programId: string): Promise<void> {
  const program = getProgram(programId);
  if (!program) throw new Error(`Unknown program: ${programId}`);
  await updateDoc(doc(db, 'users', userId), {
    'gym.activeProgramId': programId,
    'gym.currentDayIndex': 0,
    'gym.path': program.path,
  });
}

/**
 * Persist a user-built custom program AND set it as the active
 * program. The Program is stashed at users/{uid}.customProgram (one
 * per user) and the active program id is set to the literal string
 * 'custom'. Lookup helpers (resolveProgram, getTodaysDay) read the
 * program off the user doc when the id is 'custom'.
 */
export async function selectCustomProgram(userId: string, program: Program): Promise<void> {
  // Force the id to 'custom' regardless of what the caller passed so
  // the activeProgramId discriminator stays predictable.
  const stamped: Program = { ...program, id: 'custom' };
  await updateDoc(doc(db, 'users', userId), {
    customProgram: stamped,
    'gym.activeProgramId': 'custom',
    'gym.currentDayIndex': 0,
    'gym.path': stamped.path,
  });
}

/**
 * Resolve a program id against either the static catalog or the
 * user's custom program (when id === 'custom'). Returns undefined if
 * neither matches.
 */
export function resolveProgram(programId: string | null | undefined, customProgram?: Program | null): Program | undefined {
  if (!programId) return undefined;
  if (programId === 'custom') return customProgram || undefined;
  return getProgram(programId);
}

/**
 * Clear the active program. The page re-renders into the picker on
 * next snapshot — used by the "Switch program" affordance.
 */
export async function clearActiveProgram(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    'gym.activeProgramId': null,
  });
}

/**
 * The day that should be performed next. Returns null if the user has
 * no active program or the program has been removed. Pass the user's
 * customProgram so id='custom' can resolve.
 */
export function getTodaysDay(
  state: UserGymState | null,
  customProgram?: Program | null,
): { program: Program; day: ProgramDay; dayIndex: number } | null {
  if (!state?.activeProgramId) return null;
  const program = resolveProgram(state.activeProgramId, customProgram);
  if (!program) return null;
  if (program.schedule.length === 0) return null;
  const dayIndex = ((state.currentDayIndex || 0) % program.schedule.length + program.schedule.length) % program.schedule.length;
  return { program, day: program.schedule[dayIndex], dayIndex };
}

/**
 * Build an empty Workout doc shape from a program day. Snapshots names
 * and prescriptions so the workout reads without joining against the
 * canonical exercise list. Sets default to one row per prescribed set
 * (so the user can fill in reps/weight as they go).
 */
export function instantiateWorkout(
  programId: string,
  dayIndex: number,
  customProgram?: Program | null,
): Omit<Workout, 'id'> {
  const program = resolveProgram(programId, customProgram);
  if (!program) throw new Error(`Unknown program: ${programId}`);
  const day = program.schedule[dayIndex];
  if (!day) throw new Error(`Day ${dayIndex} not in ${programId}`);

  const exercises: WorkoutExercise[] = day.exercises.map((p) => {
    const ex = getExercise(p.exerciseId);
    return {
      exerciseId: p.exerciseId,
      exerciseName: ex?.name || p.exerciseId,
      primaryMuscle: ex?.primaryMuscle || 'full-body',
      prescribedSets: p.sets,
      prescribedRepsMin: p.repsMin,
      prescribedRepsMax: p.repsMax,
      sets: Array.from({ length: p.sets }, () => ({
        reps: 0,
        weight: 0,
        completed: false,
      })),
    };
  });

  return {
    programId,
    programName: program.name,
    dayIndex,
    dayName: day.name,
    exercises,
    startedAt: Timestamp.now(),
    completedAt: null,
  };
}

/**
 * Create a fresh workout doc and return its id. The caller routes to
 * the active-session page using this id.
 */
export async function startWorkout(
  userId: string,
  programId: string,
  dayIndex: number,
  customProgram?: Program | null,
): Promise<string> {
  const draft = instantiateWorkout(programId, dayIndex, customProgram);
  const ref = await addDoc(collection(db, `${GYM_WORKOUTS_COLLECTION}/${userId}/items`), draft);
  return ref.id;
}

/**
 * Persist set updates mid-workout. Uses setDoc(merge:true) so the page
 * can call this opportunistically after each set without composing a
 * full update path.
 */
export async function updateWorkoutSets(
  userId: string,
  workoutId: string,
  exercises: WorkoutExercise[],
): Promise<void> {
  await setDoc(
    doc(db, `${GYM_WORKOUTS_COLLECTION}/${userId}/items/${workoutId}`),
    { exercises },
    { merge: true },
  );
}

/**
 * Mark the workout complete: stamp completedAt, compute volume + total
 * sets, advance the user's currentDayIndex, and fire a gym habit log
 * so the workout flows into today's draft Recap.
 *
 * Returns the gym log result (xpEarned, etc.) so the page can show
 * the standard +XP burst.
 */
export async function completeWorkout(args: {
  userId: string;
  workoutId: string;
  workout: Workout;
  username: string;
  avatarUrl: string;
  customProgram?: Program | null;
}) {
  const { userId, workoutId, workout, username, avatarUrl, customProgram } = args;

  // Compute aggregates from completed sets only.
  let totalVolume = 0;
  let totalSets = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      if (s.completed) {
        totalSets += 1;
        totalVolume += (s.reps || 0) * (s.weight || 0);
      }
    }
  }

  await updateDoc(doc(db, `${GYM_WORKOUTS_COLLECTION}/${userId}/items/${workoutId}`), {
    completedAt: Timestamp.now(),
    totalVolume,
    totalSets,
  });

  // Advance the program cycle. Resolve the program against the
  // static catalog OR the user's custom program (when programId is
  // 'custom') so cycles work for both.
  const program = resolveProgram(workout.programId, customProgram);
  const scheduleLen = program?.schedule.length || 1;
  const path = program?.path || 'lift';
  await updateDoc(doc(db, 'users', userId), {
    'gym.lastWorkoutAt': Timestamp.now(),
    'gym.currentDayIndex': ((workout.dayIndex + 1) % scheduleLen),
    'gym.totalWorkouts': increment(1),
    'gym.path': path,
  });

  // Fire the gym habit log — flows into the draft Recap via the standard
  // path so completing a workout fires the recap flight just like any
  // other log.
  const result = await logHabit({
    userId,
    habitSlug: 'gym',
    categoryId: 'gym',
    value: 1,
    note: `${workout.programName} · ${workout.dayName} · ${totalSets} sets · ${Math.round(totalVolume)} vol`,
    proofImageUrl: '',
    username,
    avatarUrl,
  });

  return { result, totalVolume, totalSets };
}

/**
 * Most recent set the user did for a given exercise, scanning their
 * last ~10 workouts. Used by the set logger to display the
 * "last time" comparison next to the input fields.
 *
 * Tradeoff: in-memory scan vs a per-exercise index. With <10 reads per
 * exercise lookup this is fast enough for v1 and avoids an extra
 * composite index.
 */
export async function getLastSetForExercise(
  userId: string,
  exerciseId: string,
): Promise<{ reps: number; weight: number } | null> {
  const recentSnap = await getDocs(
    query(
      collection(db, `${GYM_WORKOUTS_COLLECTION}/${userId}/items`),
      orderBy('startedAt', 'desc'),
      limit(10),
    ),
  );
  for (const w of recentSnap.docs) {
    const data = w.data() as Workout;
    const ex = data.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    // Last completed set for this exercise — pick the heaviest if tied.
    const completed = ex.sets.filter((s) => s.completed);
    if (completed.length === 0) continue;
    const top = completed.reduce(
      (best, s) =>
        s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best,
      completed[0],
    );
    return { reps: top.reps, weight: top.weight };
  }
  return null;
}

/**
 * Read the user's gym state directly from the user doc. Helpers can use
 * this when they don't want to subscribe via `useAuth` (e.g. inside
 * server-style flows). For UI, prefer the hook in `hooks/useGymState`.
 */
export function readGymStateFromUser(userDoc: Record<string, unknown> | null | undefined): UserGymState | null {
  if (!userDoc) return null;
  const gym = userDoc.gym as Partial<UserGymState> | undefined;
  if (!gym) return null;
  return {
    activeProgramId: gym.activeProgramId ?? null,
    currentDayIndex: gym.currentDayIndex ?? 0,
    lastWorkoutAt: gym.lastWorkoutAt ?? null,
    totalWorkouts: gym.totalWorkouts ?? 0,
    path: gym.path ?? null,
  };
}
