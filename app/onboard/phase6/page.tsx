'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { ScrollPicker } from '@/components/onboarding/ScrollPicker';
import { BestLift } from '@/types/onboarding';

/**
 * Phase 6 — First rank reveal.
 *
 * Five steps:
 *   0. "Great choice!" — personal plan recap interlude
 *   1. Pick best lift + reps/weight (exercise carousel + ScrollPicker)
 *   2. Rank reveal — big badge animation with percentile
 *   3. Projected rank — "You can reach Champion by [date]"
 *   4. Active lifters globe — animated dot count
 *
 * Hand-off goes to /onboard/phase7 (placeholder).
 */

const TOTAL_STEPS = 5;

// Exercise catalog — each has a unit (reps for bodyweight, kg/lbs for
// weight) and a thresholds array mapping rank tier index → minimum
// value to reach that tier. Thresholds are tuned roughly against
// real-world lifter populations so the percentile feels honest.
type ExerciseId = 'pushups' | 'pullups' | 'situps' | 'bench' | 'squat' | 'deadlift';

interface ExerciseDef {
  id: ExerciseId;
  name: string;
  unitKind: 'reps' | 'weight';
  /** Absolute thresholds, ordered by RANKS index. Length must equal RANKS.length. */
  thresholds: number[];
  /** Default starting value for the picker. */
  defaultValue: number;
  pickerMax: number;
  pickerStep: number;
}

// Each rank now has a richer color set: a primary, a darker base
// for shadow stops, and a brighter highlight for top sheen — gives
// the metallic depth instead of a flat hex tint.
const RANKS = [
  { name: 'Iron',     color: '#94a3b8', dark: '#475569', light: '#e2e8f0', percentile: 25 },
  { name: 'Bronze',   color: '#b45309', dark: '#78350f', light: '#fbbf24', percentile: 50 },
  { name: 'Silver',   color: '#cbd5e1', dark: '#64748b', light: '#f8fafc', percentile: 70 },
  { name: 'Gold',     color: '#fbbf24', dark: '#92400e', light: '#fef3c7', percentile: 85 },
  { name: 'Platinum', color: '#22d3ee', dark: '#0e7490', light: '#ecfeff', percentile: 93 },
  { name: 'Diamond',  color: '#60a5fa', dark: '#1e40af', light: '#eff6ff', percentile: 97 },
  { name: 'Master',   color: '#a855f7', dark: '#581c87', light: '#f3e8ff', percentile: 99 },
  { name: 'Champion', color: '#fb923c', dark: '#7c2d12', light: '#fef3c7', percentile: 99.7 },
] as const;

const EXERCISES: ExerciseDef[] = [
  { id: 'pushups',  name: 'Push Ups',     unitKind: 'reps',   thresholds: [0, 6, 16, 31, 51, 76, 101, 151],     defaultValue: 20,  pickerMax: 250, pickerStep: 1 },
  { id: 'pullups',  name: 'Pull Ups',     unitKind: 'reps',   thresholds: [0, 2, 6, 11, 16, 21, 26, 36],         defaultValue: 8,   pickerMax: 60,  pickerStep: 1 },
  { id: 'situps',   name: 'Sit Ups',      unitKind: 'reps',   thresholds: [0, 10, 25, 40, 60, 80, 110, 150],     defaultValue: 25,  pickerMax: 250, pickerStep: 1 },
  { id: 'bench',    name: 'Bench Press',  unitKind: 'weight', thresholds: [0, 30, 50, 70, 90, 110, 130, 160],    defaultValue: 60,  pickerMax: 250, pickerStep: 5 },
  { id: 'squat',    name: 'Squat',        unitKind: 'weight', thresholds: [0, 40, 70, 100, 130, 160, 190, 230],  defaultValue: 80,  pickerMax: 350, pickerStep: 5 },
  { id: 'deadlift', name: 'Deadlift',     unitKind: 'weight', thresholds: [0, 50, 90, 130, 170, 200, 230, 270],  defaultValue: 100, pickerMax: 400, pickerStep: 5 },
];

function rankIndexFor(ex: ExerciseDef, value: number): number {
  let idx = 0;
  for (let i = 0; i < ex.thresholds.length; i++) {
    if (value >= ex.thresholds[i]) idx = i;
  }
  return idx;
}

// Shared editorial CTA — filled-ink footer button matching phase3's renderFooter.
function EditorialCTA({
  onClick,
  children,
  disabled,
  motionInitial,
  motionAnimate,
  motionTransition,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  motionInitial?: Record<string, number>;
  motionAnimate?: Record<string, number>;
  motionTransition?: Record<string, number>;
}) {
  const enabled = !disabled;
  return (
    <motion.button
      whileTap={{ scale: enabled ? 0.98 : 1 }}
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      initial={motionInitial}
      animate={motionAnimate}
      transition={motionTransition}
      className="font-body"
      style={{
        width: '100%',
        padding: '14px 16px',
        background: enabled ? 'var(--b-ink)' : 'transparent',
        color: enabled ? 'var(--b-paper)' : 'var(--b-ink-40)',
        border: '1px solid var(--b-ink)',
        cursor: enabled ? 'pointer' : 'not-allowed',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: enabled ? 1 : 0.4,
      }}
    >
      {children}
    </motion.button>
  );
}

export default function OnboardPhase6Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [pickerValue, setPickerValue] = useState(EXERCISES[0].defaultValue);

  const exercise = EXERCISES[exerciseIndex];
  const rankIdx = rankIndexFor(exercise, pickerValue);

  // Reset picker default when exercise changes (so user doesn't keep
  // their squat weight when they swipe to push ups)
  useEffect(() => {
    setPickerValue(exercise.defaultValue);
  }, [exercise.defaultValue]);

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      // Save the best lift on the rank-reveal transition (step 1 → 2)
      if (step === 1) {
        const lift: BestLift = {
          exercise: exercise.id,
          reps: exercise.unitKind === 'reps' ? pickerValue : 1,
          weight: exercise.unitKind === 'weight' ? pickerValue : undefined,
          unit: exercise.unitKind === 'weight' ? (draft.weight?.unit === 'lbs' ? 'lbs' : 'kg') : undefined,
        };
        update({ bestLifts: [lift] });
      }
      setStep((s) => s + 1);
    } else {
      router.push('/onboard/phase7');
    }
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase5diet');
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

  // Step 2 (rank reveal) and 3 (projection) and 4 (globe) render
  // standalone — they don't use the normal wizard footer because they
  // have their own bespoke animations + CTAs.
  if (step === 2) {
    return (
      <RankRevealStep
        exercise={exercise}
        value={pickerValue}
        rankIdx={rankIdx}
        onContinue={next}
        onBack={back}
        step={step}
      />
    );
  }
  if (step === 3) {
    return (
      <ProjectedRankStep
        rankIdx={rankIdx}
        onContinue={next}
        onBack={back}
        step={step}
      />
    );
  }
  if (step === 4) {
    return (
      <ActiveLiftersGlobeStep
        onContinue={next}
        onBack={back}
        step={step}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={back}
      showBack
      footer={
        <EditorialCTA onClick={next}>
          {step === 0 ? 'Continue →' : 'Get my rank →'}
        </EditorialCTA>
      }
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
          {step === 0 && <PlanRecapStep name={draft.name || 'friend'} />}
          {step === 1 && (
            <BestLiftStep
              exerciseIndex={exerciseIndex}
              setExerciseIndex={setExerciseIndex}
              pickerValue={pickerValue}
              setPickerValue={setPickerValue}
              weightUnit={draft.weight?.unit === 'lbs' ? 'lbs' : 'kg'}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Step 0: Plan recap ──────────────────────────────────────────────────────

function PlanRecapStep({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} greeting />
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 28 }}
      >
        Plan locked
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.05,
          margin: '8px 0 0',
          maxWidth: 440,
        }}
      >
        Great choice,{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{name}</em>.
      </h2>
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-ink-60)',
          marginTop: 14,
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        Plan locked in across all 5 pillars — strength, sleep, hydration, focus, steps. Let&apos;s start by ranking your strength.
      </p>
    </div>
  );
}

// ─── Step 1: Best lift + reps/weight ─────────────────────────────────────────

function BestLiftStep({
  exerciseIndex,
  setExerciseIndex,
  pickerValue,
  setPickerValue,
  weightUnit,
}: {
  exerciseIndex: number;
  setExerciseIndex: (i: number) => void;
  pickerValue: number;
  setPickerValue: (v: number) => void;
  weightUnit: 'kg' | 'lbs';
}) {
  const exercise = EXERCISES[exerciseIndex];
  const prev = (exerciseIndex - 1 + EXERCISES.length) % EXERCISES.length;
  const nextI = (exerciseIndex + 1) % EXERCISES.length;

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          First rank
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            marginTop: 8,
            color: 'var(--b-ink)',
          }}
        >
          What&apos;s your{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>best lift</em>?
        </h2>
      </div>

      {/* Exercise carousel — center is selected, prev/next dimmer */}
      <div className="mt-8 flex items-center justify-center gap-2 select-none">
        <button
          onClick={() => setExerciseIndex(prev)}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            color: 'var(--b-accent)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Previous exercise"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <ExerciseChip name={EXERCISES[prev].name} dim />
          <ExerciseChip name={exercise.name} active />
          <ExerciseChip name={EXERCISES[nextI].name} dim />
        </div>

        <button
          onClick={() => setExerciseIndex(nextI)}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            color: 'var(--b-accent)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Next exercise"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Exercise illustration card — large centered */}
      <div className="mt-6 mx-auto w-full max-w-xs">
        <div
          className="aspect-[5/3] flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'transparent',
            border: '1px solid var(--b-rule)',
            borderTop: '2px solid var(--b-ink)',
          }}
        >
          <ExerciseIllustration id={exercise.id} />
        </div>
      </div>

      {/* Reps / weight picker */}
      <div className="mt-6">
        <ScrollPicker
          value={pickerValue}
          onChange={setPickerValue}
          min={0}
          max={exercise.pickerMax}
          step={exercise.pickerStep}
          unit={exercise.unitKind === 'reps' ? 'reps' : weightUnit}
          majorEvery={exercise.unitKind === 'weight' ? 4 : 5}
        />
      </div>
    </div>
  );
}

function ExerciseChip({ name, active, dim }: { name: string; active?: boolean; dim?: boolean }) {
  return (
    <span
      className="font-display whitespace-nowrap transition-all"
      style={{
        fontStyle: 'italic',
        fontWeight: 500,
        fontSize: active ? 20 : 13,
        color: active ? 'var(--b-ink)' : 'var(--b-ink-40)',
        opacity: dim ? 0.6 : 1,
      }}
    >
      {name}
    </span>
  );
}

/**
 * Properly proportional stick figures. Body is one continuous spine
 * line, arms/legs branch from clear shoulder + hip joints. Head ~1/7
 * of body height. Each pose drawn for clarity at small sizes.
 *
 * Editorial palette: ink figures on paper, accent for the head.
 */
function ExerciseIllustration({ id }: { id: ExerciseId }) {
  const lim = 'var(--b-ink)';
  const dim = 'var(--b-ink-40)';
  const plate = 'var(--b-ink-15)';
  const accent = 'var(--b-accent)';
  const SW = 4.5;
  const HEAD_R = 6;

  // Stick body: head circle + neck stub + spine line + 2 arms + 2 legs
  // attached at clear shoulder and hip points.

  if (id === 'pushups') {
    // Side view plank: body horizontal, arms perpendicular down to floor,
    // toes touching floor at the back. Head + spine + 1 arm + 1 leg
    // visible (other side hidden behind body).
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        <line x1="20" y1="118" x2="200" y2="118" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        {/* Spine — head end (right) to feet end (left), slightly downward */}
        <line x1="50" y1="80" x2="146" y2="68" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="154" cy="62" r={HEAD_R} fill={accent} />
        {/* Front arm — perpendicular down from shoulder to floor */}
        <line x1="138" y1="71" x2="138" y2="115" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Back arm — perpendicular down from mid-spine */}
        <line x1="74" y1="76" x2="74" y2="115" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Back leg — extended back at slight angle, toe touching */}
        <line x1="50" y1="80" x2="34" y2="115" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'pullups') {
    // Body hanging straight down from bar, arms going up to bar at angle.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {/* Bar */}
        <rect x="40" y="20" width="140" height="4" rx="1" fill={dim} />
        <rect x="46" y="14" width="3" height="10" fill={dim} />
        <rect x="171" y="14" width="3" height="10" fill={dim} />
        {/* Arms up to bar */}
        <line x1="106" y1="44" x2="98" y2="24" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="114" y1="44" x2="122" y2="24" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="110" cy="50" r={HEAD_R} fill={accent} />
        {/* Spine */}
        <line x1="110" y1="56" x2="110" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Legs hanging */}
        <line x1="110" y1="98" x2="102" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="98" x2="118" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'situps') {
    // Curl up at 45°, knees bent up. Head + diagonal torso + bent legs.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        <line x1="20" y1="118" x2="200" y2="118" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        {/* Lower legs (foot on floor, knee up) */}
        <line x1="62" y1="118" x2="80" y2="84" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="80" y1="84" x2="100" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Spine — diagonal up from hips */}
        <line x1="100" y1="118" x2="138" y2="68" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="142" cy="60" r={HEAD_R} fill={accent} />
        {/* Arm — crossed behind head */}
        <line x1="138" y1="68" x2="124" y2="50" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="124" y1="50" x2="148" y2="50" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'bench') {
    // Body lying flat, arms pressing bar up.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        <line x1="20" y1="128" x2="200" y2="128" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        {/* Bench top */}
        <rect x="40" y="78" width="140" height="6" rx="2" fill={dim} />
        {/* Bench legs (A-frame) */}
        <line x1="50" y1="84" x2="44" y2="120" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="54" y1="84" x2="60" y2="120" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="166" y1="84" x2="160" y2="120" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="170" y1="84" x2="176" y2="120" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        {/* Body — flat on bench, head end right */}
        <line x1="60" y1="74" x2="140" y2="74" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="148" cy="70" r={HEAD_R} fill={accent} />
        {/* Legs hanging off the foot end */}
        <line x1="60" y1="74" x2="48" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms pressing barbell up */}
        <line x1="98" y1="74" x2="98" y2="44" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="118" y1="74" x2="118" y2="44" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Barbell */}
        <line x1="50" y1="40" x2="170" y2="40" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="40" cy="40" rx="6" ry="16" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="180" cy="40" rx="6" ry="16" fill={plate} stroke={dim} strokeWidth="1" />
      </svg>
    );
  }

  if (id === 'squat') {
    // Front-facing squat with bar across shoulders.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        <line x1="20" y1="128" x2="200" y2="128" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        {/* Bar + plates */}
        <line x1="38" y1="42" x2="182" y2="42" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="28" cy="42" rx="5" ry="14" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="192" cy="42" rx="5" ry="14" fill={plate} stroke={dim} strokeWidth="1" />
        {/* Head under bar */}
        <circle cx="110" cy="36" r={HEAD_R} fill={accent} />
        {/* Spine — vertical */}
        <line x1="110" y1="42" x2="110" y2="80" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms gripping bar (slight outward angle) */}
        <line x1="110" y1="48" x2="88" y2="42" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="48" x2="132" y2="42" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Legs bent into squat (clear knee bend) */}
        <line x1="110" y1="80" x2="86" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="86" y1="100" x2="86" y2="126" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="80" x2="134" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="134" y1="100" x2="134" y2="126" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  // deadlift
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
      <line x1="20" y1="128" x2="200" y2="128" stroke={dim} strokeWidth="2" strokeLinecap="round" />
      {/* Head */}
      <circle cx="110" cy="40" r={HEAD_R} fill={accent} />
      {/* Spine — slight forward lean */}
      <line x1="110" y1="46" x2="110" y2="84" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Arms — straight down to bar */}
      <line x1="110" y1="58" x2="92" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="58" x2="128" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Legs — slight bend, knees forward */}
      <line x1="110" y1="84" x2="98" y2="106" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="98" y1="106" x2="100" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="84" x2="122" y2="106" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="122" y1="106" x2="120" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Bar on floor */}
      <line x1="40" y1="100" x2="180" y2="100" stroke={dim} strokeWidth="4" strokeLinecap="round" />
      {/* Big bumper plates */}
      <circle cx="32" cy="100" r="18" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="188" cy="100" r="18" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="32" cy="100" r="3" fill={dim} />
      <circle cx="188" cy="100" r="3" fill={dim} />
    </svg>
  );
}

// ─── Step 2: Rank reveal ─────────────────────────────────────────────────────

function RankRevealStep({
  exercise,
  value,
  rankIdx,
  onContinue,
  onBack,
  step,
}: {
  exercise: ExerciseDef;
  value: number;
  rankIdx: number;
  onContinue: () => void;
  onBack: () => void;
  step: number;
}) {
  const rank = RANKS[rankIdx];
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={onBack}
      showBack
      footer={
        <EditorialCTA
          onClick={onContinue}
          motionInitial={{ opacity: 0 }}
          motionAnimate={{ opacity: revealed ? 1 : 0 }}
          motionTransition={{ delay: 1.4, duration: 0.5 }}
        >
          Continue →
        </EditorialCTA>
      }
    >
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          {exercise.name} — {value} {exercise.unitKind === 'reps' ? 'reps' : 'kg'}
        </motion.div>

        {/* Big rank badge with reveal animation — keeps the metallic SVG
            since the badge itself IS the artwork; only the surrounding
            chrome (halo blur, neon shadow) is removed for editorial. */}
        <div className="relative mt-6">
          {/* Sparkle rays */}
          <motion.svg
            initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
            animate={{ opacity: revealed ? 0.5 : 0, rotate: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
            width="300"
            height="300"
            viewBox="0 0 100 100"
            className="absolute inset-0 m-auto"
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1="50"
                y1="50"
                x2="50"
                y2="2"
                stroke="var(--b-ink-40)"
                strokeWidth="0.8"
                strokeLinecap="round"
                opacity="0.5"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}
          </motion.svg>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -15 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 14 }}
            className="relative"
          >
            <RankBadgeBig rank={rank} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: 38,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.05,
              marginTop: 24,
              color: 'var(--b-ink)',
            }}
          >
            <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{rank.name}</em>
          </h2>
          <p
            className="font-body"
            style={{
              fontSize: 13,
              color: 'var(--b-ink-60)',
              marginTop: 12,
              lineHeight: 1.6,
            }}
          >
            You&apos;re in the top{' '}
            <span style={{ color: 'var(--b-ink)', fontWeight: 700 }}>
              {(100 - rank.percentile).toFixed(rank.percentile >= 99 ? 1 : 0)}%
            </span>{' '}
            of {exercise.name.toLowerCase()} lifters worldwide.
          </p>
          <p
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--b-ink-40)',
              marginTop: 12,
              maxWidth: 320,
              marginInline: 'auto',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            That&apos;s your{' '}
            <em style={{ color: 'var(--b-accent)', fontWeight: 600 }}>Strength rank</em>. Sleep, hydration, focus and steps each get their own.
          </p>
        </motion.div>
      </div>
    </WizardShell>
  );
}

function RankBadgeBig({ rank }: { rank: typeof RANKS[number] }) {
  const idx = RANKS.indexOf(rank);
  const hasCrown = idx >= 4;
  const id = `big-${rank.name}`;
  return (
    <svg width="260" height="280" viewBox="0 0 260 280" fill="none">
      <defs>
        {/* Outer face — uses dark→primary→light→primary→dark for the
            polished metal sheen running diagonally across the badge. */}
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={rank.dark} />
          <stop offset="22%"  stopColor={rank.color} />
          <stop offset="42%"  stopColor={rank.light} />
          <stop offset="58%"  stopColor={rank.light} />
          <stop offset="78%"  stopColor={rank.color} />
          <stop offset="100%" stopColor={rank.dark} />
        </linearGradient>
        {/* Inner facet — concave look with lighter mid */}
        <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#14130f" />
          <stop offset="50%"  stopColor={rank.dark} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#14130f" />
        </linearGradient>
        {/* Inner gem — radial */}
        <radialGradient id={`${id}-gem`} cx="40%" cy="35%" r="70%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="15%"  stopColor={rank.light} />
          <stop offset="50%"  stopColor={rank.color} />
          <stop offset="85%"  stopColor={rank.dark} />
          <stop offset="100%" stopColor="#14130f" />
        </radialGradient>
        {/* Top facet specular */}
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Wing — feather-style multi-stop */}
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="0.7">
          <stop offset="0%"   stopColor={rank.light} />
          <stop offset="30%"  stopColor={rank.color} />
          <stop offset="65%"  stopColor={rank.color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={rank.dark} stopOpacity="0.1" />
        </linearGradient>
        {/* Banner ribbon */}
        <linearGradient id={`${id}-banner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={rank.light} stopOpacity="0.6" />
          <stop offset="25%"  stopColor={rank.color} />
          <stop offset="100%" stopColor={rank.dark} />
        </linearGradient>
      </defs>

      {/* Decorative star sparkles around the badge */}
      {[
        [40, 60], [220, 60], [30, 200], [230, 200], [130, 30], [130, 230],
      ].map(([cx, cy], i) => (
        <g key={i} opacity={0.5 + (i % 2) * 0.3}>
          <path
            d={`M ${cx} ${cy - 4} L ${cx + 1.2} ${cy - 1} L ${cx + 4} ${cy} L ${cx + 1.2} ${cy + 1} L ${cx} ${cy + 4} L ${cx - 1.2} ${cy + 1} L ${cx - 4} ${cy} L ${cx - 1.2} ${cy - 1} Z`}
            fill={rank.light}
          />
        </g>
      ))}

      {/* Wing flourishes — bigger, layered feathers (no neon glow shadow) */}
      <g>
        {/* Left wing — primary feather */}
        <path
          d="M 12 132 Q 30 96 80 110 Q 64 126 88 142 Q 56 144 26 140 Q 14 136 12 132 Z"
          fill={`url(#${id}-wing)`}
        />
        {/* Feather division lines */}
        <path d="M 16 130 Q 40 116 78 112" stroke={rank.light} strokeWidth="0.9" fill="none" opacity="0.75" strokeLinecap="round" />
        <path d="M 22 136 Q 50 126 82 124" stroke={rank.light} strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 28 142 Q 56 136 86 138" stroke={rank.light} strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        {/* Feather tips */}
        <path d="M 14 128 L 6 120 L 20 132 Z" fill={rank.color} />
        <path d="M 20 138 L 14 134 L 26 142 Z" fill={rank.color} />
        <path d="M 26 146 L 22 144 L 30 148 Z" fill={rank.color} opacity="0.85" />
      </g>
      <g>
        {/* Right wing — mirror */}
        <path
          d="M 248 132 Q 230 96 180 110 Q 196 126 172 142 Q 204 144 234 140 Q 246 136 248 132 Z"
          fill={`url(#${id}-wing)`}
        />
        <path d="M 244 130 Q 220 116 182 112" stroke={rank.light} strokeWidth="0.9" fill="none" opacity="0.75" strokeLinecap="round" />
        <path d="M 238 136 Q 210 126 178 124" stroke={rank.light} strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 232 142 Q 204 136 174 138" stroke={rank.light} strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M 246 128 L 254 120 L 240 132 Z" fill={rank.color} />
        <path d="M 240 138 L 246 134 L 234 142 Z" fill={rank.color} />
        <path d="M 234 146 L 238 144 L 230 148 Z" fill={rank.color} opacity="0.85" />
      </g>

      {/* Hex badge — premium multi-layer (no drop-shadow) */}
      <g>
        {/* Outer hex face — metallic gradient */}
        <path
          d="M 130 56 L 184 88 L 184 164 L 130 196 L 76 164 L 76 88 Z"
          fill={`url(#${id}-face)`}
          stroke={rank.dark}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Engraved bevel */}
        <path
          d="M 130 64 L 178 92 L 178 160 L 130 188 L 82 160 L 82 92 Z"
          fill="none"
          stroke={rank.light}
          strokeWidth="0.8"
          opacity="0.6"
          strokeLinejoin="round"
        />
        {/* Inner inset hex */}
        <path
          d="M 130 76 L 168 100 L 168 152 L 130 176 L 92 152 L 92 100 Z"
          fill={`url(#${id}-inner)`}
          stroke={rank.color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Engraved facet cuts on outer hex */}
        <path
          d="M 130 56 L 130 76 M 184 88 L 168 100 M 184 164 L 168 152 M 130 196 L 130 176 M 76 164 L 92 152 M 76 88 L 92 100"
          stroke={rank.light}
          strokeWidth="1"
          opacity="0.7"
        />
        {/* Top-left specular shine on face */}
        <path
          d="M 130 56 L 184 88 L 130 100 L 76 88 Z"
          fill={`url(#${id}-shine)`}
        />

        {/* Inner gem — large central jewel */}
        <circle cx="130" cy="128" r="30" fill={`url(#${id}-gem)`} stroke={rank.dark} strokeWidth="1.5" />
        {/* Gem facet lines (cut crystal look) */}
        <path d="M 130 100 L 152 116 L 144 144 L 116 144 L 108 116 Z"
          fill="none" stroke={rank.light} strokeWidth="0.6" opacity="0.55" />
        <path d="M 130 100 L 130 144 M 108 116 L 152 144 M 108 144 L 152 116"
          stroke={rank.light} strokeWidth="0.4" opacity="0.4" />
        {/* Gem inner shine */}
        <ellipse cx="121" cy="118" rx="8" ry="5" fill="#ffffff" opacity="0.55" />
        <ellipse cx="125" cy="115" rx="3" ry="2" fill="#ffffff" opacity="0.85" />

        {/* Rank initial — embossed */}
        <text
          x="130"
          y="142"
          textAnchor="middle"
          fontSize="32"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill={rank.dark}
        >
          {rank.name[0]}
        </text>

        {/* Tier dot indicators */}
        <g>
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < Math.min(5, idx + 1);
            return (
              <circle
                key={i}
                cx={114 + i * 8}
                cy={170}
                r="2.4"
                fill={filled ? rank.color : '#1a1a2e'}
                stroke={filled ? rank.light : '#1a1a2e'}
                strokeWidth="0.7"
              />
            );
          })}
        </g>
      </g>

      {/* Crown — top tiers */}
      {hasCrown && (
        <g>
          {/* Base band */}
          <rect x="100" y="42" width="60" height="9" rx="1.5" fill="#fbbf24" stroke="#7c2d12" strokeWidth="0.7" />
          <line x1="100" y1="44" x2="160" y2="44" stroke="#fef3c7" strokeWidth="0.6" opacity="0.8" />
          {/* Five spires with shading */}
          <path d="M 104 42 L 108 24 L 112 42 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 116 42 L 120 18 L 124 42 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 134 42 L 138 18 L 142 42 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 146 42 L 150 24 L 154 42 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          {/* Tallest center spire with jewel */}
          <path d="M 124 42 L 130 6 L 136 42 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <circle cx="130" cy="14" r="5" fill="#ef4444" stroke="#fde047" strokeWidth="1" />
          <ellipse cx="128" cy="12" rx="1.8" ry="1.2" fill="#ffffff" opacity="0.8" />
          {/* Side jewels */}
          <circle cx="106" cy="46.5" r="1.8" fill="#3b82f6" stroke="#fef3c7" strokeWidth="0.4" />
          <circle cx="154" cy="46.5" r="1.8" fill="#3b82f6" stroke="#fef3c7" strokeWidth="0.4" />
        </g>
      )}

      {/* Banner ribbon — bigger (no neon shadow) */}
      <g>
        <path
          d="M 80 202 L 180 202 L 174 232 L 130 222 L 86 232 Z"
          fill={`url(#${id}-banner)`}
          stroke={rank.dark}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Banner highlight stripe */}
        <path d="M 80 202 L 180 202 L 178 207 L 82 207 Z" fill={rank.light} opacity="0.4" />
        {/* End folds */}
        <path d="M 80 202 L 72 216 L 86 220 Z" fill={rank.dark} />
        <path d="M 180 202 L 188 216 L 174 220 Z" fill={rank.dark} />
        <text
          x="130"
          y="220"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill="#ffffff"
          letterSpacing="3"
        >
          {rank.name.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

// ─── Step 3: Projected rank ──────────────────────────────────────────────────

function ProjectedRankStep({
  rankIdx,
  onContinue,
  onBack,
  step,
}: {
  rankIdx: number;
  onContinue: () => void;
  onBack: () => void;
  step: number;
}) {
  const current = RANKS[rankIdx];
  const targetIdx = Math.min(rankIdx + 1, RANKS.length - 1);
  const target = RANKS[targetIdx];

  // ETA — 8 weeks ahead of today
  const eta = new Date();
  eta.setDate(eta.getDate() + 56);
  const etaStr = eta.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={onBack}
      showBack
      footer={<EditorialCTA onClick={onContinue}>Continue →</EditorialCTA>}
    >
      <div className="flex flex-col flex-1 justify-center text-center px-1">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          Projected progress
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 32,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            marginTop: 8,
            color: 'var(--b-ink)',
          }}
        >
          You can reach{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{target.name}</em>
          {' '}by{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-ink)' }}>{etaStr}</em>.
        </h2>

        {/* Current → target visual */}
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="flex flex-col items-center">
            <div style={{ opacity: 0.5 }}>
              <RankBadgeMini rank={current} size={84} />
            </div>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 8 }}
            >
              Now
            </div>
          </div>

          {/* Arrow with progress dots */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block"
                  style={{
                    width: 6,
                    height: 1,
                    background: 'var(--b-ink)',
                    opacity: 0.3 + i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <RankBadgeMini rank={target} size={100} />
            </motion.div>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 8 }}
            >
              Goal
            </div>
          </div>
        </div>

        <p
          className="font-body"
          style={{
            fontSize: 13,
            color: 'var(--b-ink-60)',
            marginTop: 32,
            maxWidth: 360,
            marginInline: 'auto',
            lineHeight: 1.6,
          }}
        >
          You have{' '}
          <em style={{ color: 'var(--b-accent)', fontWeight: 600, fontStyle: 'italic' }}>amazing potential</em>. Every pillar — strength, sleep, water, focus, steps — climbs the same way. Show up, rank up.
        </p>
      </div>
    </WizardShell>
  );
}

function RankBadgeMini({ rank, size }: { rank: typeof RANKS[number]; size: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 100 110" fill="none">
      <defs>
        <linearGradient id={`rbm-${rank.name}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={rank.light} />
          <stop offset="25%" stopColor={rank.color} />
          <stop offset="100%" stopColor={rank.dark} />
        </linearGradient>
      </defs>
      <g>
        <path
          d="M 50 12 L 80 32 L 80 78 L 50 98 L 20 78 L 20 32 Z"
          fill={`url(#rbm-${rank.name})`}
          stroke={rank.dark}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <text x="50" y="68" textAnchor="middle" fontSize="28" fontWeight="bold" fontFamily="ui-monospace,monospace" fill="#ffffff">
          {rank.name[0]}
        </text>
      </g>
    </svg>
  );
}

// ─── Step 4: Active lifters globe ────────────────────────────────────────────

function ActiveLiftersGlobeStep({
  onContinue,
  onBack,
  step,
}: {
  onContinue: () => void;
  onBack: () => void;
  step: number;
}) {
  // Animated counter that tickers up to a target while the user views
  // the screen. Feels like a live metric.
  const target = 127432;
  const [count, setCount] = useState(target - 8000);

  useEffect(() => {
    const startTime = performance.now();
    const startCount = target - 8000;
    const duration = 2200;
    let raf: number;
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(startCount + (target - startCount) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={onBack}
      showBack
      footer={<EditorialCTA onClick={onContinue}>Continue →</EditorialCTA>}
    >
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          Live worldwide
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.1,
            marginTop: 8,
            maxWidth: 420,
            color: 'var(--b-ink)',
          }}
        >
          There are{' '}
          <em
            className="font-mono tabular-nums inline-block text-center"
            style={{
              minWidth: '4.5em',
              color: 'var(--b-accent)',
              fontStyle: 'normal',
              fontWeight: 600,
            }}
          >
            {count.toLocaleString()}
          </em>{' '}
          people climbing their ranks right now.
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
          Lifting, sleeping better, drinking water, taking steps — all over the world.
        </p>

        <div className="mt-8 mx-auto w-full max-w-xs">
          <Globe />
        </div>
      </div>
    </WizardShell>
  );
}

/**
 * Real-feeling Earth globe. Continents are simplified silhouettes
 * rendered onto a 220-wide horizontal strip; the strip translates
 * left over a 36s loop, with two copies side-by-side for a seamless
 * wrap. The lat/long grid is anchored to the viewer (it doesn't
 * rotate). A radial day/night gradient on top sells the sphere.
 *
 * Active-user dots travel WITH the continents (they represent real
 * locations) and twinkle via SVG <animate>. They're clipped to the
 * globe circle so they only show on the visible hemisphere.
 *
 * Editorial palette: ink linework on paper. Continents are filled
 * with a flat ink tint, dots are accent red — flat, no neon glow.
 */

// Continent silhouettes — much higher detail this round. Each path
// uses 25-50 vertices to approximate real coastlines (rather than
// 10-15 vertex blobs). Hand-derived from world-110m simplified
// projections so Africa, India, Asia, Australia are clearly the
// real continents, not abstract shapes.
const CONTINENTS = [
  // North America — Alaska wrap, Canada with Hudson Bay, US east+west
  // coasts, Florida, Mexico tail, Yucatan
  'M 2 24 L 8 22 L 16 18 L 26 16 L 36 18 L 46 20 L 56 18 L 66 22 L 74 28 L 76 36 L 72 44 L 66 48 L 58 50 L 50 50 L 48 56 L 50 62 L 54 64 L 60 60 L 66 60 L 70 64 L 70 70 L 64 72 L 56 70 L 50 72 L 46 76 L 44 80 L 42 86 L 38 90 L 34 88 L 30 84 L 26 80 L 22 76 L 18 72 L 14 66 L 10 60 L 6 52 L 4 44 L 2 36 Z',
  // Greenland
  'M 80 12 L 86 10 L 94 14 L 98 22 L 96 30 L 92 36 L 84 36 L 80 30 L 78 22 Z',
  // Central America (Mexico tail + Guatemala + Panama)
  'M 38 92 L 44 90 L 50 94 L 54 100 L 52 104 L 48 102 L 44 98 L 40 96 Z',
  // Cuba + Hispaniola (Caribbean)
  'M 54 96 L 60 94 L 64 96 L 62 100 L 56 100 Z',
  'M 66 98 L 70 97 L 70 100 L 67 101 Z',
  // South America — distinct shape with Brazil bulge + tapered Andes
  'M 48 100 L 54 96 L 62 96 L 70 100 L 76 108 L 78 118 L 76 128 L 74 138 L 70 148 L 66 158 L 60 168 L 54 174 L 50 172 L 46 162 L 44 150 L 44 138 L 46 126 L 46 116 L 48 106 Z',
  // UK + Ireland
  'M 99 50 L 104 48 L 108 50 L 108 56 L 104 60 L 100 58 L 99 54 Z',
  'M 96 54 L 99 53 L 99 58 L 96 58 Z',
  // Iberia (Spain + Portugal)
  'M 99 64 L 105 63 L 112 66 L 113 72 L 109 76 L 102 76 L 99 72 Z',
  // Western Europe (France + Germany)
  'M 113 54 L 122 52 L 130 56 L 134 62 L 132 68 L 124 70 L 118 68 L 114 64 Z',
  // Italy boot — distinct shape
  'M 122 68 L 126 70 L 130 76 L 132 84 L 130 86 L 128 80 L 126 76 L 124 72 Z',
  // Sicily
  'M 126 88 L 129 88 L 129 91 L 126 91 Z',
  // Balkans
  'M 132 60 L 138 60 L 140 68 L 136 72 L 132 70 Z',
  // Scandinavia (Norway + Sweden + Finland)
  'M 122 28 L 130 24 L 138 26 L 142 32 L 144 40 L 142 48 L 138 52 L 132 52 L 128 48 L 124 42 L 122 36 Z',
  // Iceland
  'M 96 38 L 100 38 L 102 42 L 98 44 L 96 42 Z',
  // Africa — DETAILED: wide top (Sahara), Horn east, narrow Cape south
  'M 100 76 L 108 74 L 116 73 L 124 73 L 132 74 L 138 76 L 142 80 L 144 86 L 142 92 L 144 96 L 146 100 L 144 106 L 144 112 L 142 118 L 138 124 L 134 130 L 132 136 L 128 144 L 124 152 L 118 158 L 114 158 L 110 154 L 106 146 L 102 138 L 100 130 L 98 120 L 96 110 L 96 100 L 96 92 L 98 84 Z',
  // Madagascar
  'M 144 132 L 148 130 L 152 138 L 152 148 L 148 152 L 145 148 L 144 142 Z',
  // Arabian peninsula — distinctive shape
  'M 138 80 L 146 78 L 152 80 L 156 86 L 158 92 L 156 98 L 150 100 L 144 98 L 140 92 L 138 86 Z',
  // Russia/Central Asia — large horizontal mass
  'M 138 28 L 152 24 L 168 22 L 184 22 L 200 24 L 214 26 L 226 32 L 232 40 L 232 48 L 228 56 L 220 60 L 210 64 L 198 66 L 184 66 L 170 64 L 158 60 L 148 54 L 142 46 L 140 40 L 138 34 Z',
  // China — eastern coast distinct
  'M 188 60 L 198 58 L 210 60 L 222 66 L 224 74 L 220 80 L 212 84 L 200 84 L 192 82 L 188 76 Z',
  // Korean peninsula
  'M 218 60 L 222 60 L 224 68 L 222 72 L 218 70 Z',
  // India + Pakistan — clear south-pointing triangle
  'M 158 82 L 168 82 L 176 86 L 180 94 L 180 102 L 176 112 L 172 122 L 168 130 L 164 130 L 160 124 L 158 116 L 156 106 L 156 96 L 156 88 Z',
  // Sri Lanka
  'M 168 132 L 172 132 L 172 137 L 169 137 Z',
  // SE Asia (Indochina + Malaysia)
  'M 188 88 L 198 88 L 204 94 L 206 102 L 202 108 L 196 114 L 192 116 L 188 110 L 186 100 Z',
  // Japan archipelago (4 islands)
  'M 224 56 L 228 56 L 230 60 L 226 62 L 224 60 Z',
  'M 226 64 L 232 66 L 234 72 L 230 74 L 226 70 Z',
  'M 230 76 L 234 78 L 234 82 L 230 82 Z',
  // Philippines
  'M 206 96 L 211 96 L 211 102 L 207 102 Z',
  'M 208 104 L 213 104 L 213 110 L 209 110 Z',
  // Indonesia (Sumatra + Java + Borneo + Sulawesi)
  'M 182 112 L 196 110 L 202 114 L 200 118 L 188 118 L 184 116 Z',
  'M 198 116 L 210 114 L 214 118 L 208 122 L 200 122 Z',
  'M 198 122 L 208 122 L 210 128 L 202 128 Z',
  // New Guinea
  'M 215 124 L 226 122 L 230 128 L 222 130 L 215 128 Z',
  // Australia — distinctive shape
  'M 192 132 L 200 132 L 210 130 L 220 132 L 228 138 L 230 146 L 226 154 L 220 160 L 212 162 L 204 162 L 198 158 L 194 152 L 192 144 Z',
  // Tasmania
  'M 220 168 L 224 168 L 224 173 L 220 173 Z',
  // New Zealand (North + South Islands)
  'M 234 156 L 238 156 L 238 164 L 234 164 Z',
  'M 236 168 L 240 168 L 240 175 L 236 175 Z',
];

// Major-city activity dots — 60+ across populated regions to give
// the dense "cities lit at night" cluster look from the reference.
const GLOBE_DOTS: [number, number, number][] = [
  // North America — east coast cluster
  [38, 48, 0.0], [40, 52, 0.5], [42, 50, 1.0], [44, 56, 1.5],
  // West coast
  [16, 52, 0.2], [18, 56, 0.7], [20, 60, 1.2],
  // Central / Mexico
  [30, 56, 0.4], [34, 64, 0.9], [40, 76, 1.4],
  // Caribbean / Cuba
  [56, 96, 0.3], [60, 98, 0.8],
  // South America cluster (Brazil)
  [62, 116, 0.6], [66, 124, 1.1], [60, 132, 1.6],
  // Buenos Aires
  [62, 158, 0.5],
  // UK / Ireland
  [102, 54, 0.0], [104, 56, 0.5], [106, 56, 1.0],
  // Western Europe — dense
  [114, 56, 0.2], [118, 56, 0.7], [120, 58, 1.2], [122, 58, 1.7], [124, 60, 0.3],
  [126, 62, 0.8], [120, 62, 1.3], [116, 62, 1.8],
  // Iberia
  [104, 70, 0.6], [108, 72, 1.1],
  // Italy
  [126, 70, 0.4],
  // Scandinavia
  [130, 36, 0.9], [134, 40, 1.4],
  // Eastern Europe
  [128, 50, 0.7], [132, 54, 1.2],
  // Russia
  [148, 36, 0.5], [160, 32, 1.0], [180, 32, 1.5], [200, 34, 0.2],
  // North Africa
  [118, 82, 0.8], [124, 86, 1.3], [130, 88, 1.8], [114, 90, 0.4],
  // West Africa
  [108, 102, 0.6],
  // Central / South Africa
  [118, 110, 0.9], [124, 124, 1.2], [120, 140, 0.5], [122, 150, 1.0],
  // Middle East — dense (Dubai, Riyadh, Tehran, Israel)
  [142, 86, 0.3], [148, 90, 0.8], [152, 92, 1.3], [144, 92, 1.7],
  // India — VERY dense (matches reference)
  [164, 96, 0.0], [168, 98, 0.4], [170, 102, 0.8], [172, 106, 1.2], [168, 108, 1.6],
  [166, 112, 0.2], [170, 116, 0.6], [172, 118, 1.0], [168, 120, 1.4], [170, 122, 1.8],
  [166, 124, 0.5],
  // Pakistan / Bangladesh
  [160, 92, 0.7], [178, 102, 1.2],
  // China — dense
  [192, 70, 0.0], [200, 72, 0.5], [208, 74, 1.0], [216, 76, 1.5],
  [196, 78, 0.3], [204, 80, 0.8], [212, 82, 1.3],
  // Korea
  [220, 70, 0.6],
  // Japan — multiple dots
  [228, 62, 0.4], [232, 68, 0.9], [232, 74, 1.4],
  // SE Asia
  [192, 100, 0.7], [196, 106, 1.2], [200, 110, 1.7],
  // Indonesia / Philippines
  [188, 118, 0.5], [194, 120, 1.0], [208, 100, 1.5], [210, 124, 0.3],
  // Australia
  [206, 142, 0.6], [216, 146, 1.1], [222, 154, 1.6], [228, 162, 0.4],
];

const Globe = React.memo(function Globe() {
  return (
    <div className="relative w-[320px] h-[320px] mx-auto">
      <svg
        viewBox="0 0 280 280"
        fill="none"
        className="absolute inset-0 m-auto w-[300px] h-[300px]"
        style={{ overflow: 'hidden' }}
      >
        <defs>
          <clipPath id="globeClip">
            <circle cx="140" cy="140" r="128" />
          </clipPath>
        </defs>

        {/* Paper sphere — flat fill, hairline outline */}
        <circle cx="140" cy="140" r="128" fill="var(--b-paper)" stroke="var(--b-ink)" strokeWidth="1" />

        {/* Continents + dots, drifting */}
        <g clipPath="url(#globeClip)">
          <g transform="translate(20, 50)">
            <g className="animate-globe-drift">
              {[0, 240].map((offset) => (
                <g key={offset} transform={`translate(${offset}, 0)`}>
                  {CONTINENTS.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      fill="var(--b-ink-15)"
                      stroke="var(--b-ink)"
                      strokeWidth="0.4"
                    />
                  ))}
                  {/* Accent activity dots — flat, no glow */}
                  {GLOBE_DOTS.map(([x, y, delay], i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r="2" fill="var(--b-accent)" opacity="0.9">
                        <animate attributeName="opacity" values="0.4; 1; 0.4" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}
                </g>
              ))}
            </g>
          </g>

          {/* Lat/long grid — hairline ink */}
          {[60, 90, 140, 190, 220].map((y) => {
            const r = Math.sqrt(Math.max(0, 128 * 128 - (y - 140) * (y - 140)));
            return r > 0 ? (
              <ellipse
                key={y}
                cx="140"
                cy={y}
                rx={r}
                ry={r * 0.18}
                stroke="var(--b-ink)"
                strokeWidth="0.4"
                fill="none"
                opacity="0.18"
              />
            ) : null;
          })}
          {[0, 30, 60, 90, 120, 150].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rx = Math.abs(Math.sin(rad) * 128);
            return (
              <ellipse
                key={deg}
                cx="140"
                cy="140"
                rx={rx}
                ry={128}
                stroke="var(--b-ink)"
                strokeWidth="0.4"
                fill="none"
                opacity="0.16"
              />
            );
          })}
        </g>

        {/* Crisp ink rim */}
        <circle cx="140" cy="140" r="128" fill="none" stroke="var(--b-ink)" strokeWidth="1" />
      </svg>
    </div>
  );
});
