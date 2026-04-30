/**
 * Outrank onboarding draft — captured progressively through the
 * pre-auth funnel and persisted to localStorage. At signup time we
 * write the whole thing to users/{uid} and derive pillar goals from it.
 *
 * Every field is optional because the user can drop off at any step.
 * The wizard only requires non-null where it matters (e.g. name on
 * signup). Don't add validation logic here — that lives in step
 * components.
 */

export type ExperienceLevel = 'never' | 'beginner' | 'intermediate' | 'advanced';

export type GoalKey =
  | 'build_muscle'
  | 'lose_fat'
  | 'energy'
  | 'sleep_better'
  | 'discipline'
  | 'focus'
  | 'consistency';

export type HearAboutKey =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'friend'
  | 'app_store'
  | 'reddit'
  | 'other';

export type Sex = 'male' | 'female';

export type StruggleKey =
  // Body
  | 'sensitive_back'
  | 'sensitive_knees'
  | 'sensitive_shoulders'
  | 'sensitive_wrists'
  // Habits — parallel struggles for our other 4 pillars
  | 'trouble_sleeping'
  | 'phone_addiction'
  | 'forget_water'
  | 'energy_crashes'
  | 'stress_anxiety'
  | 'low_morning_motivation';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type ImprovementCadence = 'daily' | 'weekly' | 'sometimes' | 'rarely';

export type StatementKey =
  | 'follow_same_routine'
  | 'dont_push_limits'
  | 'progress_invisible'
  | 'inconsistent_sleep'
  | 'distracted_easily'
  | 'cant_stick_with_anything';

export type ExerciseLocation =
  | 'commercial'
  | 'small_gym'
  | 'garage'
  | 'home'
  | 'bodyweight';

export type MuscleKey =
  | 'chest'
  | 'arms'
  | 'abs'
  | 'legs'
  | 'shoulders'
  | 'back';

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type Tier = 'free' | 'pro';

export interface BestLift {
  exercise: string;
  reps: number;
  weight?: number;      // kg, optional for bodyweight lifts
  unit?: 'kg' | 'lbs';
}

export interface Measurement<U extends string> {
  value: number;
  unit: U;
}

export interface OnboardingDraft {
  // Identity
  name?: string;
  experienceLevel?: ExperienceLevel;
  goals?: GoalKey[];
  hearAbout?: HearAboutKey;

  // Body
  sex?: Sex;
  height?: Measurement<'cm' | 'in'>;
  weight?: Measurement<'kg' | 'lbs'>;
  age?: number;

  // Personalization
  improvementCadence?: ImprovementCadence;
  struggles?: StruggleKey[];
  energyLevels?: EnergyLevel;
  statementsRelating?: StatementKey[];

  // Workout details
  hasPlan?: boolean;
  exerciseLocation?: ExerciseLocation;
  equipment?: string[];
  lastMuscles?: MuscleKey[];
  workoutDuration?: number;            // minutes
  workoutDaysPerWeek?: number;         // when "by count" mode
  workoutDays?: DayKey[];              // when "specific days" mode
  workoutReminderTime?: string;        // 'HH:MM' 24h

  // Side habits — extra non-pillar habits the user wants to track
  // (added per user request: a step lets you put some side habits)
  sideHabits?: string[];

  // First rank
  bestLifts?: BestLift[];

  // Plan
  tier?: Tier;
  trialReminderDays?: 2 | 3;

  // Metadata
  startedAt?: number;          // Date.now() — when the funnel started
  completedAt?: number;
  version?: 1;                 // schema version for future migrations
}

export const DRAFT_STORAGE_KEY = 'outrank.onboarding.draft';
export const DRAFT_SCHEMA_VERSION = 1 as const;
