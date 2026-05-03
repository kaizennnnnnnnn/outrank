'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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

const GOAL_OPTIONS: { key: DietGoal; label: string; sub: string; tone: string; emoji: string }[] = [
  { key: 'lose',     label: 'Lose weight',  sub: 'Calorie deficit, slowly drop fat.',         tone: '#3b82f6', emoji: '↓' },
  { key: 'maintain', label: 'Maintain',     sub: 'Stay where I am, eat at maintenance.',     tone: '#22c55e', emoji: '=' },
  { key: 'gain',     label: 'Gain muscle',  sub: 'Calorie surplus, build size with my lifting.', tone: '#ef4444', emoji: '↑' },
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
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center">
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

  const label = step === 3 ? 'CONTINUE' : 'CONTINUE';

  return (
    <motion.button
      whileTap={{ scale: canProceed ? 0.98 : 1 }}
      onClick={canProceed ? next : undefined}
      disabled={!canProceed}
      className={cn(
        'w-full py-4 rounded-full font-bold text-base text-white transition-all shadow-lg',
        canProceed
          ? 'shadow-red-600/30 hover:brightness-110'
          : 'shadow-none opacity-40 cursor-not-allowed',
      )}
      style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
    >
      {label}
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
      <div className="space-y-2.5 mt-2">
        {GOAL_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-4 py-4 transition-all flex items-center gap-3',
                active
                  ? 'shadow-[0_0_22px_-8px] border-orange-400'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
              style={
                active
                  ? {
                      background: `linear-gradient(135deg, ${opt.tone}1a, #10101a 70%)`,
                      // shadow color matches the tone
                      ['--tw-shadow-color' as string]: `${opt.tone}80`,
                    }
                  : undefined
              }
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center font-heading font-black text-2xl shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${opt.tone}33, ${opt.tone}11)`,
                  border: `1.5px solid ${opt.tone}66`,
                  color: opt.tone,
                }}
              >
                {opt.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-bold text-base text-white">{opt.label}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">{opt.sub}</p>
              </div>
              {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
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
      <div className="flex justify-center mb-6 mt-2">
        <div className="inline-flex p-1 rounded-full bg-[#10101a] border border-white/8">
          {(['kg', 'lbs'] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={cn(
                'px-5 py-1.5 rounded-full text-sm font-bold transition-all',
                unit === u
                  ? 'bg-orange-500 text-white shadow-[0_0_18px_-4px_rgba(249,115,22,0.7)]'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Big readout */}
      <div className="text-center mb-4">
        <p className="font-heading font-bold text-white tabular-nums leading-none" style={{ fontSize: 64 }}>
          {value}
          <span className="text-orange-400 text-2xl ml-2 align-baseline">{unit}</span>
        </p>
        {draft.weight && (
          <p className="text-[12px] text-slate-500 mt-2">
            Currently <span className="text-slate-300 font-mono">{draft.weight.value}{draft.weight.unit}</span>
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
      <div className="space-y-2 mt-2">
        {ACTIVITY_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-4 py-3.5 transition-all flex items-center justify-between gap-3',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>{opt.label}</p>
                <p className={cn('text-[12px] mt-0.5', active ? 'text-orange-200/80' : 'text-slate-500')}>{opt.sub}</p>
              </div>
              {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
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
        <h2 className="font-heading text-3xl font-bold text-white mt-6">Hmm —</h2>
        <p className="text-slate-300/85 mt-3 max-w-sm text-[14px]">
          We&apos;re missing some of your stats. Go back and double-check your height, weight, age, and activity level.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400 mt-4">Your daily calorie target</p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2 leading-tight">
        Eat to <span className="text-orange-400">{
          draft.dietGoal === 'lose' ? 'lose'
          : draft.dietGoal === 'gain' ? 'build'
          : 'stay'
        }</span>.
      </h2>

      {/* Big calorie readout */}
      <div className="my-6 mx-auto rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/[0.10] to-red-500/[0.04] px-6 py-5 max-w-xs w-full">
        <div className="flex items-center justify-center gap-2 mb-1">
          <FireIcon size={16} className="text-orange-400" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-orange-300">Daily target</span>
        </div>
        <p className="font-heading font-black text-5xl text-white tabular-nums leading-none">
          {rec.calorieGoal.toLocaleString()}
        </p>
        <p className="text-[12px] text-slate-400 mt-1.5">kcal · TDEE {rec.tdee.toLocaleString()}</p>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-2 mx-auto max-w-xs w-full">
        {[
          { name: 'Protein', val: rec.macroGoals.protein, tone: '#ef4444' },
          { name: 'Carbs',   val: rec.macroGoals.carbs,   tone: '#f59e0b' },
          { name: 'Fat',     val: rec.macroGoals.fat,     tone: '#3b82f6' },
        ].map((m) => (
          <div
            key={m.name}
            className="rounded-xl border bg-white/[0.025] py-2.5 text-center"
            style={{ borderColor: `${m.tone}40` }}
          >
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: m.tone }}>{m.name}</p>
            <p className="font-heading font-bold text-xl text-white tabular-nums mt-0.5">{m.val}<span className="text-[10px] text-slate-500 ml-0.5">g</span></p>
          </div>
        ))}
      </div>

      {/* ETA */}
      {estWeeks !== null && estWeeks > 0 && (
        <p className="text-[12px] text-slate-300/80 mt-5 leading-relaxed max-w-sm mx-auto">
          At this rate you&apos;ll reach{' '}
          <span className="text-white font-bold">
            {draft.targetWeight!.value}{draft.targetWeight!.unit}
          </span>{' '}
          in roughly <span className="text-orange-300 font-bold">{estWeeks} week{estWeeks === 1 ? '' : 's'}</span>.
        </p>
      )}

      <div className="mt-auto pt-6 mx-auto max-w-md w-full rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/25 p-4 flex items-start gap-3">
        <FoodIcon size={20} className="text-emerald-300 flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-emerald-100/85 text-left leading-relaxed">
          Outrank&apos;s diet tracker will help you hit this every day — type what you ate, AI counts the calories. Find it on your dashboard after signup.
        </p>
      </div>
    </div>
  );
}
