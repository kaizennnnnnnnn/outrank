/**
 * Calorie + macro goal calculator. Pure math, no I/O — safe to use on
 * client and server.
 *
 * Formula: Mifflin-St Jeor BMR × activity multiplier (TDEE) ± deficit
 * or surplus driven by the user's diet goal. Industry standard, more
 * accurate than the older Harris-Benedict equation for modern body
 * compositions.
 *
 * Macro split is a simple gram-per-kg-bodyweight model, biased toward
 * preserving muscle on a deficit and supporting gains on a surplus.
 */

import {
  ActivityLevel,
  CalorieRecommendation,
  DietGoal,
  MacroTargets,
} from '@/types/diet';
import { Measurement, Sex } from '@/types/onboarding';

// ─── Unit converters ─────────────────────────────────────────────────

export function toKg(weight: Measurement<'kg' | 'lbs'>): number {
  return weight.unit === 'kg' ? weight.value : weight.value * 0.45359237;
}

export function toCm(height: Measurement<'cm' | 'in'>): number {
  return height.unit === 'cm' ? height.value : height.value * 2.54;
}

// ─── Mifflin-St Jeor ─────────────────────────────────────────────────

/** Basal metabolic rate (kcal at rest). */
export function calcBmr(args: {
  weightKg: number;
  heightCm: number;
  age:      number;
  sex:      Sex;
}): number {
  const base = 10 * args.weightKg + 6.25 * args.heightCm - 5 * args.age;
  return base + (args.sex === 'male' ? 5 : -161);
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

/** Total daily energy expenditure — kcal burned in a normal day. */
export function calcTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
}

// ─── Goal adjustment ─────────────────────────────────────────────────

/**
 * Return calorie target given TDEE and goal. We cap the deficit at
 * -25% of TDEE (~500 kcal/day for a 2000-TDEE user) to avoid the
 * crash-diet zone, and the surplus at +400 kcal which is roughly
 * what most lifting research recommends for a controlled bulk.
 */
function adjustForGoal(tdee: number, goal: DietGoal): number {
  if (goal === 'lose')    return Math.max(1200, Math.round(tdee - Math.min(500, tdee * 0.25)));
  if (goal === 'gain')    return Math.round(tdee + 350);
  return tdee;
}

// ─── Macro split ─────────────────────────────────────────────────────

/**
 * Protein: 2.0 g/kg on a cut, 1.8 g/kg maintaining, 1.7 g/kg on a
 *   bulk (more carb headroom for recovery + glycogen).
 * Fat: 25% of calories — sweet spot for hormone health.
 * Carbs: whatever's left over.
 */
function calcMacros(weightKg: number, kcal: number, goal: DietGoal): MacroTargets {
  const proteinPerKg =
    goal === 'lose' ? 2.0 :
    goal === 'gain' ? 1.7 :
    1.8;

  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG     = Math.round((kcal * 0.25) / 9);

  const proteinKcal = proteinG * 4;
  const fatKcal     = fatG * 9;
  const carbsKcal   = Math.max(0, kcal - proteinKcal - fatKcal);
  const carbsG      = Math.round(carbsKcal / 4);

  return { protein: proteinG, carbs: carbsG, fat: fatG };
}

// ─── Top-level entry ─────────────────────────────────────────────────

export interface CalorieInputs {
  weight:        Measurement<'kg' | 'lbs'>;
  height:        Measurement<'cm' | 'in'>;
  age:           number;
  sex:           Sex;
  activityLevel: ActivityLevel;
  dietGoal:      DietGoal;
}

export function recommendCalories(input: CalorieInputs): CalorieRecommendation {
  const weightKg = toKg(input.weight);
  const heightCm = toCm(input.height);
  const bmr  = Math.round(calcBmr({ weightKg, heightCm, age: input.age, sex: input.sex }));
  const tdee = calcTdee(bmr, input.activityLevel);
  const calorieGoal = adjustForGoal(tdee, input.dietGoal);
  const macroGoals  = calcMacros(weightKg, calorieGoal, input.dietGoal);

  return {
    bmr,
    tdee,
    calorieGoal,
    macroGoals,
    activityLevel: input.activityLevel,
    dietGoal:      input.dietGoal,
  };
}

// ─── Activity level guess from existing onboarding signals ───────────

/**
 * Map workoutDaysPerWeek (already collected in phase 5) to a sensible
 * default activity level so the user doesn't have to answer the same
 * question twice. They can override at the diet onboarding step.
 */
export function guessActivityLevel(workoutDaysPerWeek?: number): ActivityLevel {
  if (typeof workoutDaysPerWeek !== 'number') return 'light';
  if (workoutDaysPerWeek <= 1) return 'sedentary';
  if (workoutDaysPerWeek <= 3) return 'light';
  if (workoutDaysPerWeek <= 5) return 'moderate';
  if (workoutDaysPerWeek <= 6) return 'active';
  return 'very_active';
}

/**
 * Default diet goal from goals[]: build_muscle/intend → gain;
 * lose_fat → lose; otherwise maintain.
 */
export function guessDietGoal(goals?: string[]): DietGoal {
  if (!goals) return 'maintain';
  if (goals.includes('lose_fat')) return 'lose';
  if (goals.includes('build_muscle')) return 'gain';
  return 'maintain';
}
