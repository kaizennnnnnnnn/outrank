import { Timestamp } from 'firebase/firestore';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'full-body';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

/**
 * Two paths that almost never overlap in programming. Lift programs
 * prescribe weight + rep ranges; calisthenics programs prescribe rep
 * progressions or hold seconds. Keeping them as a top-level discriminator
 * lets the picker show the right programs for the right path.
 */
export type ExercisePath = 'lift' | 'calisthenics';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: Equipment;
  path: ExercisePath;
  /** Single-line form cue. Surfaced beside the set logger. */
  cue?: string;
  /** Default rest period in seconds — seeds the post-set timer. */
  defaultRestSec: number;
}

export interface ProgramExercisePrescription {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Optional flavor — "AMRAP last set", "warm up to working weight". */
  note?: string;
}

export interface ProgramDay {
  /** Display name — "Push Day", "Upper Body", "Workout A". */
  name: string;
  exercises: ProgramExercisePrescription[];
}

export interface Program {
  id: string;
  name: string;        // full name for cards
  shortName: string;   // tight contexts
  daysPerWeek: number;
  path: ExercisePath;
  description: string;
  /** "Beginner-friendly", "Intermediate", "Advanced" + audience cue. */
  audience: string;
  /**
   * Days are cycled in order — `currentDayIndex` advances by one each
   * completed workout, modulo schedule.length. Skipping a calendar
   * day doesn't skip the workout. More forgiving than weekday pinning.
   */
  schedule: ProgramDay[];
}

/** Per-set record inside a workout. */
export interface SetLog {
  reps: number;
  /** Weight in user's preferred unit (kg or lb — stored as the raw number). */
  weight: number;
  /** Marked done by the user. Pre-completion sets stay on the workout. */
  completed: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  /** Snapshots at workout start so the workout doc renders without
   *  joining against the canonical exercise list. */
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  /** Prescribed by the program, denormalized so deviations are visible. */
  prescribedSets: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  /** What actually happened. */
  sets: SetLog[];
}

export interface Workout {
  id?: string;
  programId: string;
  programName: string;
  dayIndex: number;
  dayName: string;
  exercises: WorkoutExercise[];
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  /** Sum(reps * weight) across completed sets. Computed on completion. */
  totalVolume?: number;
  /** Number of completed sets across all exercises. */
  totalSets?: number;
}

/**
 * Per-user gym state. Stored as a field on the user doc so it loads
 * with `useAuth`'s subscription — avoids a separate listener for the
 * dashboard's gym pillar row.
 */
export interface UserGymState {
  activeProgramId: string | null;
  /** Index into program.schedule for "today's workout." */
  currentDayIndex: number;
  /** Last-completion timestamp, used by the row + history surfaces. */
  lastWorkoutAt: Timestamp | null;
  /** Total workouts ever completed by this user. */
  totalWorkouts: number;
  /** Path chosen at picker time — "lift" or "calisthenics". */
  path: ExercisePath | null;
}
