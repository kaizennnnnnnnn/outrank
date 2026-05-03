/**
 * Diet tracker types — first-class feature, NOT a 6th pillar.
 *
 * The pillars (strength/sleep/water/focus/steps) measure consistent
 * daily targets. Diet is messier (calories + macros + meal-by-meal
 * accuracy depends on user input quality), so it gets its own
 * dedicated tracker that informs the existing pillars rather than
 * being one.
 *
 * Storage:
 *   users/{uid}.calorieGoal, .macroGoals, .activityLevel, .dietGoal,
 *     .targetWeight  (the calculator's output, set once at onboarding
 *     + recomputed when stats change)
 *   dietLogs/{uid}/entries/{id}  (one doc per meal logged)
 *   dietQuotas/{uid}             (rate-limit counter for the Claude
 *     API endpoint — server-side only, written by the Cloud Function)
 */

import { Timestamp } from 'firebase/firestore';

// ─── Goals + calculator inputs ───────────────────────────────────────

/** Activity multiplier band for Mifflin-St Jeor TDEE calc. */
export type ActivityLevel =
  | 'sedentary'   // 1.2  — desk job, no workouts
  | 'light'       // 1.375 — 1-3x/week light
  | 'moderate'    // 1.55  — 3-5x/week moderate
  | 'active'      // 1.725 — 6-7x/week intense
  | 'very_active'; // 1.9  — 2x/day, athlete

/** What the user wants the calorie goal to drive toward. */
export type DietGoal = 'lose' | 'maintain' | 'gain';

export interface MacroTargets {
  /** grams */
  protein: number;
  carbs:   number;
  fat:     number;
}

/** Output of the calculator — written to users/{uid} as flat fields. */
export interface CalorieRecommendation {
  bmr:           number;        // basal metabolic rate, kcal
  tdee:          number;        // total daily energy expenditure, kcal
  calorieGoal:   number;        // kcal target driven by dietGoal
  macroGoals:    MacroTargets;  // grams
  activityLevel: ActivityLevel;
  dietGoal:      DietGoal;
}

// ─── Meal log entries ────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Where the entry came from — affects how much we trust the numbers. */
export type EntrySource =
  | 'ai'      // freeform text → Claude API parse
  | 'usda'    // USDA FoodData Central pick
  | 'barcode' // Open Food Facts barcode lookup
  | 'manual'; // user typed everything by hand

/** One food item inside a meal entry. */
export interface FoodItem {
  name:     string;        // human label (e.g. "scrambled eggs")
  qty:      number;        // numeric quantity (e.g. 2)
  unit:     string;        // unit string (e.g. "large", "g", "cup")
  kcal:     number;
  protein?: number;        // grams
  carbs?:   number;
  fat?:     number;
}

export interface MealEntry {
  id:           string;
  userId:       string;
  mealType:     MealType;
  items:        FoodItem[];
  totalKcal:    number;
  totalProtein: number;
  totalCarbs:   number;
  totalFat:     number;
  source:       EntrySource;
  /** Original freeform text if source === 'ai'. Useful for re-parsing
   *  if our prompt improves later. */
  rawText?:     string;
  createdAt:    Timestamp;  // when written
  loggedAt:     Timestamp;  // user-attributed timestamp (for "logged at 8am")
}

// ─── Daily summary (derived, not stored) ─────────────────────────────

export interface DietDailySummary {
  date:         string;        // YYYY-MM-DD in user's tz
  totalKcal:    number;
  totalProtein: number;
  totalCarbs:   number;
  totalFat:     number;
  goalKcal:     number;        // snapshot of users.calorieGoal at view time
  goalProtein:  number;
  goalCarbs:    number;
  goalFat:      number;
  entryCount:   number;
}

// ─── AI parse result wire format ─────────────────────────────────────

/** Shape returned by the parseFoodWithClaude callable. Matches the
 *  JSON schema we instruct Claude to emit. The client should validate
 *  this before persisting since LLMs occasionally drift. */
export interface ParseFoodResult {
  items:        FoodItem[];
  totalKcal:    number;
  totalProtein: number;
  totalCarbs:   number;
  totalFat:     number;
}

/** Quota response — surfaced to the client so it can show "X AI logs
 *  left today" and gracefully fall back to USDA search when 0. */
export interface ParseFoodQuota {
  remaining: number;
  limit:     number;
  resetsAt:  number;  // epoch ms
}
