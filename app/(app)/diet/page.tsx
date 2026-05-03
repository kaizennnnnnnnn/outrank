'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { CalorieRing } from '@/components/diet/CalorieRing';
import { AddMealSheet } from '@/components/diet/AddMealSheet';
import { subscribeMealsForDate, deleteMeal, summarizeDay } from '@/lib/diet';
import { recommendCalories, guessActivityLevel, guessDietGoal } from '@/lib/dietCalculator';
import type { MealEntry, MealType } from '@/types/diet';
import { cn } from '@/lib/utils';
import { PlusCircleIcon, FireIcon, SparklesIcon } from '@/components/ui/AppIcons';

/**
 * Diet tracker — first-class feature, NOT a 6th pillar. Shows today's
 * calorie + macro progress, the day's logged meals grouped by meal
 * type, and the add-meal sheet (AI parse / USDA search / barcode /
 * manual).
 *
 * The calorie + macro goals come from the user's profile if set
 * (calorieGoal, macroGoals). If not set, we compute defaults on the
 * fly from height/weight/age/sex + best-guess activity level.
 */

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snacks',
};

export default function DietPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Subscribe to today's meals (live).
  useEffect(() => {
    if (!user) return;
    return subscribeMealsForDate(user.uid, new Date(), setEntries);
  }, [user]);

  // Resolve calorie + macro goals — prefer stored user values; fall
  // back to a fresh calculation if the user hasn't gone through diet
  // onboarding yet.
  const goals = useMemo(() => {
    if (!user) return null;
    const u = user as unknown as Record<string, unknown>;
    const stored = u.calorieGoal as number | undefined;
    const macros = u.macroGoals as { protein: number; carbs: number; fat: number } | undefined;

    if (stored && macros) {
      return { kcal: stored, protein: macros.protein, carbs: macros.carbs, fat: macros.fat };
    }

    // Compute on the fly. Requires height + weight + age + sex.
    const height = u.height as { value: number; unit: 'cm' | 'in' } | undefined;
    const weight = u.weight as { value: number; unit: 'kg' | 'lbs' } | undefined;
    const age    = u.age as number | undefined;
    const sex    = u.sex as 'male' | 'female' | undefined;
    if (!height || !weight || !age || !sex) return null;

    const rec = recommendCalories({
      height,
      weight,
      age,
      sex,
      activityLevel: (u.activityLevel as ReturnType<typeof guessActivityLevel>) ?? guessActivityLevel(u.workoutDaysPerWeek as number | undefined),
      dietGoal:      (u.dietGoal      as ReturnType<typeof guessDietGoal>)      ?? guessDietGoal(u.goals as string[] | undefined),
    });

    return {
      kcal:    rec.calorieGoal,
      protein: rec.macroGoals.protein,
      carbs:   rec.macroGoals.carbs,
      fat:     rec.macroGoals.fat,
    };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const summary = goals ? summarizeDay(entries, goals) : null;
  const grouped = MEAL_TYPE_ORDER.map((mt) => ({
    mealType: mt,
    items:    entries.filter((e) => e.mealType === mt),
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">Today</p>
          <h1 className="font-heading font-bold text-3xl text-white mt-1">Diet</h1>
        </div>
      </div>

      {/* Goals missing */}
      {!goals && (
        <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-500/30 p-5 mb-6">
          <p className="font-bold text-amber-200 mb-1">Set your calorie goal</p>
          <p className="text-[13px] text-amber-100/80 leading-relaxed">
            We need your height, weight, age, and sex to calculate a calorie target.
            <Link href="/settings" className="text-amber-300 hover:underline ml-1 font-semibold">
              Open settings
            </Link>
          </p>
        </div>
      )}

      {/* Ring */}
      {summary && (
        <div className="rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.07] p-6 mb-6">
          <CalorieRing
            consumed={{
              kcal:    summary.totalKcal,
              protein: summary.totalProtein,
              carbs:   summary.totalCarbs,
              fat:     summary.totalFat,
            }}
            goal={{
              kcal:    summary.goalKcal,
              protein: summary.goalProtein,
              carbs:   summary.goalCarbs,
              fat:     summary.goalFat,
            }}
          />
        </div>
      )}

      {/* Meals grouped by type */}
      <div className="space-y-4">
        {grouped.map((g) => (
          <MealSection
            key={g.mealType}
            mealType={g.mealType}
            entries={g.items}
            onDelete={(id) => deleteMeal(user.uid, id)}
          />
        ))}
      </div>

      {entries.length === 0 && goals && (
        <div className="text-center py-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] mt-2">
          <SparklesIcon size={28} className="text-orange-400 mx-auto mb-3" />
          <p className="text-white font-bold">No meals logged yet today</p>
          <p className="text-[13px] text-slate-400 mt-1 max-w-xs mx-auto">
            Tap the + button to log a meal — type it out, search USDA, or scan a barcode.
          </p>
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 sm:bottom-8 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-600/40 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)' }}
        aria-label="Log a meal"
      >
        <PlusCircleIcon size={28} className="text-white" />
      </button>

      <AddMealSheet
        uid={user.uid}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onLogged={() => { /* live subscription updates the list */ }}
      />
    </div>
  );
}

// ─── Meal section ────────────────────────────────────────────────────

function MealSection({
  mealType,
  entries,
  onDelete,
}: {
  mealType: MealType;
  entries: MealEntry[];
  onDelete: (id: string) => void;
}) {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.totalKcal, 0);

  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden">
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-white/[0.05]">
        <h2 className="font-heading font-bold text-[14px] text-white">{MEAL_LABELS[mealType]}</h2>
        <span className="text-[11px] font-mono tabular-nums text-orange-300">{total} kcal</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {entries.map((e) => (
          <div key={e.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {e.items.map((it, i) => (
                <p key={i} className={cn(
                  'truncate',
                  i === 0 ? 'text-white font-bold text-sm' : 'text-slate-300 text-[12px] mt-0.5',
                )}>
                  <span className={i === 0 ? '' : 'text-slate-500'}>{i === 0 ? '' : '+ '}</span>
                  {it.name}{' '}
                  <span className="text-slate-500 font-normal">
                    ({it.qty} {it.unit})
                  </span>
                </p>
              ))}
              <p className="text-[11px] text-slate-500 mt-1">
                <FireIcon size={10} className="inline-block text-orange-400 -mt-[1px] mr-0.5" />
                {e.totalKcal} kcal · P {Math.round(e.totalProtein)}g · C {Math.round(e.totalCarbs)}g · F {Math.round(e.totalFat)}g
                <span className="text-slate-600 ml-1.5 uppercase tracking-wider text-[9px]">via {e.source}</span>
              </p>
            </div>
            <button
              onClick={() => onDelete(e.id)}
              className="text-slate-500 hover:text-red-400 text-lg leading-none px-1"
              aria-label="Delete entry"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
