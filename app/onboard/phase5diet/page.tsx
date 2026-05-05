'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { defaultUnits } from '@/lib/onboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { SpeechBubble } from '@/components/onboarding/SpeechBubble';
import { ScrollPicker } from '@/components/onboarding/ScrollPicker';
import {
  recommendCalories,
  guessActivityLevel,
  guessDietGoal,
  toKg,
} from '@/lib/dietCalculator';
import type { ActivityLevel, DietGoal } from '@/types/diet';
import type { Measurement } from '@/types/onboarding';
import { CheckCircleFullIcon, FireIcon } from '@/components/ui/AppIcons';
import { FoodIcon } from '@/components/ui/CategoryIcons';

/**
 * Phase 5-Diet — calorie goal setup. Sits between phase5 (workout
 * details) and phase6 (rank reveal). Three short steps + one reveal:
 *
 *   0. Diet goal — lose / maintain / gain
 *   1. Target weight (skipped if maintain)
 *   2. Activity level — sedentary / light / moderate / active / very_active
 *   3. Calorie reveal — computed from everything above + body stats
 *
 * Diet is shipping as a first-class feature, NOT a 6th pillar; this
 * onboarding phase produces the per-user calorieGoal + macroGoals
 * that the diet tracker reads from users/{uid} after signup.
 */

const TOTAL_STEPS = 4;

const GOAL_OPTIONS: { key: DietGoal; label: string; sub: string; mark: string }[] = [
  { key: 'lose',     label: 'Lose weight',  sub: 'Calorie deficit, slowly drop fat.',         mark: '↓' },
  { key: 'maintain', label: 'Maintain',     sub: 'Stay where I am, eat at maintenance.',     mark: '=' },
  { key: 'gain',     label: 'Gain muscle',  sub: 'Calorie surplus, build size with my lifting.', mark: '↑' },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; sub: string }[] = [
  { key: 'sedentary',   label: 'Sedentary',    sub: 'Desk job, almost no exercise.' },
  { key: 'light',       label: 'Light',        sub: 'Light exercise 1–3 days a week.' },
  { key: 'moderate',    label: 'Moderate',     sub: 'Real training 3–5 days a week.' },
  { key: 'active',      label: 'Active',       sub: 'Hard training 6–7 days a week.' },
  { key: 'very_active', label: 'Very active',  sub: 'Two-a-days, athlete or physical job.' },
];

export default function OnboardPhase5DietPage() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  // Pre-fill defaults from earlier signals so the user only confirms.
  useEffect(() => {
    if (!hydrated) return;
    const patch: Record<string, unknown> = {};
    if (!draft.dietGoal)      patch.dietGoal      = guessDietGoal(draft.goals);
    if (!draft.activityLevel) patch.activityLevel = guessActivityLevel(draft.workoutDaysPerWeek);
    if (Object.keys(patch).length) update(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const isMaintain = draft.dietGoal === 'maintain';

  const next = () => {
    // Skip the target-weight step entirely for maintain.
    if (step === 0 && isMaintain) {
      setStep(2);
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase6');
  };
  const back = () => {
    if (step === 2 && isMaintain) {
      setStep(0);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase5');
  };

  if (!hydrated) {
    return (
      <div
        className="dir-b min-h-screen flex items-center justify-center"
        style={{ background: 'var(--b-paper)' }}
      >
        <PhoenixMascot size={100} paused />
      </div>
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={back}
      showBack
      footer={renderFooter(step, draft, next)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col flex-1"
        >
          {step === 0 && (
            <DietGoalStep
              value={draft.dietGoal}
              onChange={(dietGoal) => update({ dietGoal })}
            />
          )}
          {step === 1 && !isMaintain && (
            <TargetWeightStep
              draft={draft}
              update={update}
            />
          )}
          {step === 2 && (
            <ActivityLevelStep
              value={draft.activityLevel}
              onChange={(activityLevel) => update({ activityLevel })}
            />
          )}
          {step === 3 && <CalorieRevealStep draft={draft} />}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function renderFooter(
  step: number,
  draft: ReturnType<typeof useOnboardingDraft>['draft'],
  next: () => void,
) {
  const canProceed =
    (step === 0 && !!draft.dietGoal) ||
    (step === 1 && !!draft.targetWeight && draft.targetWeight.value > 0) ||
    (step === 2 && !!draft.activityLevel) ||
    (step === 3);

  return (
    <motion.button
      whileTap={{ scale: canProceed ? 0.98 : 1 }}
      onClick={canProceed ? next : undefined}
      disabled={!canProceed}
      className="font-body"
      style={{
        width: '100%',
        padding: '14px 16px',
        background: canProceed ? 'var(--b-ink)' : 'transparent',
        color: canProceed ? 'var(--b-paper)' : 'var(--b-ink-40)',
        border: '1px solid var(--b-ink)',
        cursor: canProceed ? 'pointer' : 'not-allowed',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: canProceed ? 1 : 0.4,
      }}
    >
      Continue →
    </motion.button>
  );
}

// ─── Mascot row (uses react={1} so phoenix nods on each step mount) ─

function MascotRow({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 mt-4 mb-6">
      <div className="flex-shrink-0">
        <PhoenixMascot size={90} react={1} />
      </div>
      <SpeechBubble className="flex-1 mb-2">{message}</SpeechBubble>
    </div>
  );
}

// ─── Unit toggle (matches phase3) ───────────────────────────────────

function UnitToggle<U extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: U; label: string }[];
  value: U;
  onChange: (v: U) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--b-ink)',
        background: 'var(--b-paper)',
      }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="font-body"
            style={{
              padding: '8px 22px',
              background: active ? 'var(--b-ink)' : 'transparent',
              color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--b-ink)' : 'none',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 0: Diet goal ───────────────────────────────────────────────

function DietGoalStep({
  value,
  onChange,
}: {
  value?: DietGoal;
  onChange: (v: DietGoal) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="One more thing — what's your goal with food?" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {GOAL_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 14px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--b-ink)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--b-rule)',
                  color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
                  fontSize: 20,
                  fontWeight: 700,
                  fontStyle: 'italic',
                }}
                className="font-display"
              >
                {opt.mark}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="font-display"
                  style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    margin: 0,
                  }}
                >
                  {opt.label}
                </p>
                <p
                  className="font-body"
                  style={{
                    fontSize: 12,
                    color: 'var(--b-ink-60)',
                    marginTop: 2,
                    marginBottom: 0,
                  }}
                >
                  {opt.sub}
                </p>
              </div>
              {active && (
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                  <CheckCircleFullIcon size={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Target weight ──────────────────────────────────────────

function TargetWeightStep({
  draft,
  update,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  update: ReturnType<typeof useOnboardingDraft>['update'];
}) {
  const unit: 'kg' | 'lbs' = draft.targetWeight?.unit ?? draft.weight?.unit ?? defaultUnits().weight;
  // Default starting value: current weight ± a sensible nudge based on goal
  const currentValue = draft.weight?.value ?? (unit === 'kg' ? 70 : 154);
  const seed = draft.dietGoal === 'lose' ? Math.round(currentValue - 5)
             : draft.dietGoal === 'gain' ? Math.round(currentValue + 5)
             : Math.round(currentValue);
  const value = draft.targetWeight?.value ?? seed;

  const min = unit === 'kg' ? 35  : 75;
  const max = unit === 'kg' ? 200 : 440;

  const onChange = (v: number) => {
    update({ targetWeight: { value: v, unit } as Measurement<'kg' | 'lbs'> });
  };
  const setUnit = (u: 'kg' | 'lbs') => {
    if (u === unit) return;
    // Convert when toggling so the displayed number doesn't jump arbitrarily
    const converted = u === 'kg'
      ? Math.round(value * 0.45359237)
      : Math.round(value / 0.45359237);
    update({ targetWeight: { value: converted, unit: u } });
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow
        message={
          draft.dietGoal === 'lose'
            ? "Where do you want to land? Pick your target weight."
            : "What's your target weight?"
        }
      />

      {/* Unit toggle */}
      <div className="flex justify-center mt-2 mb-6">
        <UnitToggle
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lbs', label: 'lbs' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>

      {/* Big readout */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p
          className="font-display tabular-nums"
          style={{
            fontSize: 64,
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--b-ink)',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {value}
          <span
            className="font-display"
            style={{
              color: 'var(--b-accent)',
              fontSize: 22,
              marginLeft: 8,
              fontStyle: 'italic',
              fontWeight: 500,
              verticalAlign: 'baseline',
            }}
          >
            {unit}
          </span>
        </p>
        {draft.weight && (
          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: 'var(--b-ink-60)',
              marginTop: 8,
            }}
          >
            Currently{' '}
            <span style={{ color: 'var(--b-ink)', fontFamily: 'monospace' }}>
              {draft.weight.value}{draft.weight.unit}
            </span>
          </p>
        )}
      </div>

      <ScrollPicker
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={1}
        majorEvery={5}
      />
    </div>
  );
}

// ─── Step 2: Activity level ─────────────────────────────────────────

function ActivityLevelStep({
  value,
  onChange,
}: {
  value?: ActivityLevel;
  onChange: (v: ActivityLevel) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How active are you on a normal week?" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {ACTIVITY_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 14px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--b-ink)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  className="font-display"
                  style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    margin: 0,
                  }}
                >
                  {opt.label}
                </p>
                <p
                  className="font-body"
                  style={{
                    fontSize: 12,
                    color: 'var(--b-ink-60)',
                    marginTop: 2,
                    marginBottom: 0,
                  }}
                >
                  {opt.sub}
                </p>
              </div>
              {active && (
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                  <CheckCircleFullIcon size={18} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Calorie reveal ─────────────────────────────────────────

function CalorieRevealStep({
  draft,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
}) {
  const rec = useMemo(() => {
    if (!draft.height || !draft.weight || !draft.age || !draft.sex || !draft.activityLevel || !draft.dietGoal) {
      return null;
    }
    return recommendCalories({
      height:        draft.height,
      weight:        draft.weight,
      age:           draft.age,
      sex:           draft.sex,
      activityLevel: draft.activityLevel,
      dietGoal:      draft.dietGoal,
    });
  }, [draft]);

  // Estimated weeks to target — only shown for lose/gain
  const estWeeks = useMemo(() => {
    if (!rec || !draft.targetWeight || !draft.weight || draft.dietGoal === 'maintain') return null;
    const currentKg = toKg(draft.weight);
    const targetKg  = toKg(draft.targetWeight);
    const deltaKg   = Math.abs(currentKg - targetKg);
    if (deltaKg < 0.5) return 0;
    // ~7700 kcal per kg of body fat. Daily delta = TDEE - calorieGoal.
    const dailyDelta = Math.abs(rec.tdee - rec.calorieGoal);
    if (dailyDelta < 50) return null;
    const days  = (deltaKg * 7700) / dailyDelta;
    return Math.round(days / 7);
  }, [rec, draft]);

  if (!rec) {
    return (
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <PhoenixMascot size={130} paused />
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            color: 'var(--b-ink)',
            marginTop: 24,
          }}
        >
          Hmm —
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: 13,
            color: 'var(--b-ink-60)',
            marginTop: 12,
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          We&apos;re missing some of your stats. Go back and double-check your height, weight, age, and activity level.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 text-center">
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 16 }}
      >
        Your daily calorie target
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 28,
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 1.05,
          color: 'var(--b-ink)',
          margin: '8px 0 0',
        }}
      >
        Eat to{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>
          {draft.dietGoal === 'lose' ? 'lose'
            : draft.dietGoal === 'gain' ? 'build'
            : 'stay'}
        </em>.
      </h2>

      {/* Big calorie readout */}
      <div
        style={{
          margin: '24px auto 0',
          maxWidth: 320,
          width: '100%',
          padding: '18px 20px',
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
            <FireIcon size={14} />
          </span>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            Daily target
          </div>
        </div>
        <p
          className="font-display tabular-nums"
          style={{
            fontSize: 48,
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--b-ink)',
            lineHeight: 1,
            margin: 0,
          }}
        >
          {rec.calorieGoal.toLocaleString()}
        </p>
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 6,
            marginBottom: 0,
          }}
        >
          kcal · TDEE {rec.tdee.toLocaleString()}
        </p>
      </div>

      {/* Macros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          margin: '16px auto 0',
          maxWidth: 320,
          width: '100%',
        }}
      >
        {[
          { name: 'Protein', val: rec.macroGoals.protein },
          { name: 'Carbs',   val: rec.macroGoals.carbs },
          { name: 'Fat',     val: rec.macroGoals.fat },
        ].map((m) => (
          <div
            key={m.name}
            style={{
              border: '1px solid var(--b-rule)',
              padding: '10px 6px',
              textAlign: 'center',
            }}
          >
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
            >
              {m.name}
            </div>
            <p
              className="font-display tabular-nums"
              style={{
                fontSize: 20,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {m.val}
              <span
                className="font-body"
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-60)',
                  marginLeft: 2,
                  fontStyle: 'normal',
                }}
              >
                g
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* ETA */}
      {estWeeks !== null && estWeeks > 0 && (
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--b-ink-60)',
            marginTop: 20,
            lineHeight: 1.6,
            maxWidth: 360,
            marginInline: 'auto',
          }}
        >
          At this rate you&apos;ll reach{' '}
          <span style={{ color: 'var(--b-ink)', fontWeight: 600 }}>
            {draft.targetWeight!.value}{draft.targetWeight!.unit}
          </span>{' '}
          in roughly{' '}
          <em style={{ color: 'var(--b-accent)', fontStyle: 'italic', fontWeight: 600 }}>
            {estWeeks} week{estWeeks === 1 ? '' : 's'}
          </em>
          .
        </p>
      )}

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 24,
        }}
      >
        <div
          style={{
            margin: '0 auto',
            maxWidth: 440,
            width: '100%',
            border: '1px solid var(--b-rule)',
            borderTop: '2px solid var(--b-ink)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              color: 'var(--b-accent)',
              display: 'inline-flex',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <FoodIcon size={20} />
          </span>
          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: 'var(--b-ink-60)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Outrank&apos;s diet tracker will help you hit this every day — type what you ate, AI counts the calories. Find it on your dashboard after signup.
          </p>
        </div>
      </div>
    </div>
  );
}
