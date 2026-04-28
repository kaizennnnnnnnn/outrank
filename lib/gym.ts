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
import { getExercise } from '@/constants/exercises';
import {
  ExercisePath,
  Program,
  ProgramDay,
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
 * no active program or the program has been removed.
 */
export function getTodaysDay(state: UserGymState | null): { program: Program; day: ProgramDay; dayIndex: number } | null {
  if (!state?.activeProgramId) return null;
  const program = getProgram(state.activeProgramId);
  if (!program) return null;
  const dayIndex = ((state.currentDayIndex || 0) % program.schedule.length + program.schedule.length) % program.schedule.length;
  return { program, day: program.schedule[dayIndex], dayIndex };
}

/**
 * Build an empty Workout doc shape from a program day. Snapshots names
 * and prescriptions so the workout reads without joining against the
 * canonical exercise list. Sets default to one row per prescribed set
 * (so the user can fill in reps/weight as they go).
 */
export function instantiateWorkout(programId: string, dayIndex: number): Omit<Workout, 'id'> {
  const program = getProgram(programId);
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
export async function startWorkout(userId: string, programId: string, dayIndex: number): Promise<string> {
  const draft = instantiateWorkout(programId, dayIndex);
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
  programPath: ExercisePath;
}) {
  const { userId, workoutId, workout, username, avatarUrl, programPath } = args;

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

  // Advance the program cycle. Read program length from constants so we
  // can wrap the index without re-reading state.
  const program = getProgram(workout.programId);
  const scheduleLen = program?.schedule.length || 1;
  await updateDoc(doc(db, 'users', userId), {
    'gym.lastWorkoutAt': Timestamp.now(),
    'gym.currentDayIndex': ((workout.dayIndex + 1) % scheduleLen),
    'gym.totalWorkouts': increment(1),
    'gym.path': programPath,
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
