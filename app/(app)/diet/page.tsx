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
import { Masthead } from '@/components/editorial/Masthead';
import { BPlusGlyph } from '@/components/editorial/BGlyphs';

/**
 * Diet — editorial Direction B v2 conversion. "Today's Plate" front
 * page: calorie ring + macros at the top, meals grouped by type
 * (Breakfast / Lunch / Dinner / Snacks) as numbered editorial rows
 * below. Floating + button opens the AddMealSheet, unchanged.
 *
 * Calorie + macro goals come from the user's stored profile values
 * if set (calorieGoal, macroGoals — written at signup time by phase
 * 5-diet onboarding). If those are missing, recompute on the fly
 * from height/weight/age/sex + best-guess activity level.
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

  useEffect(() => {
    if (!user) return;
    return subscribeMealsForDate(user.uid, new Date(), setEntries);
  }, [user]);

  const goals = useMemo(() => {
    if (!user) return null;
    const u = user as unknown as Record<string, unknown>;
    const stored = u.calorieGoal as number | undefined;
    const macros = u.macroGoals as { protein: number; carbs: number; fat: number } | undefined;
    if (stored && macros) {
      return { kcal: stored, protein: macros.protein, carbs: macros.carbs, fat: macros.fat };
    }
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
      <div className="dir-b max-w-2xl mx-auto space-y-6 px-4 py-6">
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
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: '2-digit', month: 'short',
  });

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Plate" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Today
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>The Plate.</em>
          </h1>
          <div
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            {dateLabel}
            {summary && (
              <>
                {' · '}
                <span className="tabular" style={{ color: 'var(--b-ink)' }}>
                  {summary.totalKcal} / {summary.goalKcal} kcal
                </span>
              </>
            )}
          </div>

          {/* Goals missing — editorial info row instead of amber card */}
          {!goals && (
            <div
              style={{
                marginTop: 18,
                borderTop: '2px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-ink)',
                padding: '14px 0',
              }}
            >
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-accent)' }}
              >
                Set your calorie goal
              </div>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 6, lineHeight: 1.5 }}
              >
                We need your height, weight, age, and sex to calculate a calorie target.{' '}
                <Link
                  href="/settings"
                  className="font-body"
                  style={{ color: 'var(--b-accent)', fontWeight: 600, textDecoration: 'underline' }}
                >
                  Open settings
                </Link>
              </p>
            </div>
          )}

          {/* Calorie ring + macros */}
          {summary && (
            <div
              style={{
                marginTop: 18,
                borderTop: '1px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-ink)',
                padding: '24px 0',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
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

          {/* Empty state */}
          {entries.length === 0 && goals && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                A blank plate.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto' }}
              >
                Tap the + button to log a meal — type it out, search USDA, or scan a barcode.
              </p>
            </div>
          )}

          {/* Meals grouped by type */}
          {grouped.map((g, i) => (
            <MealSection
              key={g.mealType}
              mealType={g.mealType}
              sectionIndex={i + 1}
              entries={g.items}
              onDelete={(id) => deleteMeal(user.uid, id)}
            />
          ))}
        </div>
      </div>

      {/* Floating add button — kept the brand-red gradient as a visual
          anchor; everything else is editorial. */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-24 sm:bottom-8 right-5 z-30"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--b-accent), #f97316)',
          boxShadow: '0 8px 22px -4px rgba(220,38,38,0.55)',
          color: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        aria-label="Log a meal"
      >
        <BPlusGlyph size={24} strokeWidth={2} />
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

// ─── Meal section ───────────────────────────────────────────────────

function MealSection({
  mealType,
  sectionIndex,
  entries,
  onDelete,
}: {
  mealType:     MealType;
  sectionIndex: number;
  entries:      MealEntry[];
  onDelete:     (id: string) => void;
}) {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.totalKcal, 0);

  return (
    <section style={{ marginTop: 22 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--b-ink)',
          paddingBottom: 4,
        }}
      >
        <span
          className="font-display"
          style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500 }}
        >
          {MEAL_LABELS[mealType]}
        </span>
        <span
          className="font-mono tabular"
          style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
        >
          § {String(sectionIndex).padStart(2, '0')} · {total} kcal
        </span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {entries.map((e, i) => (
          <li
            key={e.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr 18px',
              gap: 10,
              padding: '12px 0',
              borderBottom: '1px solid var(--b-rule)',
              alignItems: 'flex-start',
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 2 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ minWidth: 0 }}>
              {e.items.map((it, ii) => (
                <p
                  key={ii}
                  className={ii === 0 ? 'font-display' : 'font-body'}
                  style={{
                    margin: 0,
                    fontSize: ii === 0 ? 16 : 11,
                    fontWeight: ii === 0 ? 500 : 400,
                    color: ii === 0 ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    marginTop: ii === 0 ? 0 : 1,
                    lineHeight: ii === 0 ? 1.2 : 1.4,
                  }}
                >
                  {ii === 0 ? '' : '+ '}
                  {it.name}{' '}
                  <span
                    className="tabular"
                    style={{ color: 'var(--b-ink-40)', fontWeight: 400, fontFamily: 'var(--font-inter)' }}
                  >
                    ({it.qty} {it.unit})
                  </span>
                </p>
              ))}
              <p
                className="font-body tabular"
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-60)',
                  marginTop: 4,
                  letterSpacing: '0.04em',
                }}
              >
                {e.totalKcal} kcal · P {Math.round(e.totalProtein)}g · C {Math.round(e.totalCarbs)}g · F {Math.round(e.totalFat)}g
                <span
                  className="font-mono"
                  style={{
                    marginLeft: 8,
                    color: 'var(--b-ink-40)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: 9,
                  }}
                >
                  via {e.source}
                </span>
              </p>
            </div>
            <button
              onClick={() => onDelete(e.id)}
              aria-label="Delete entry"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--b-ink-40)',
                fontSize: 18,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
