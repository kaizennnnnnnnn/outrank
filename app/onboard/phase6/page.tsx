'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { ScrollPicker } from '@/components/onboarding/ScrollPicker';
import { ActiveLiftersGlobe } from '@/components/onboarding/ActiveLiftersGlobe';
import { BestLift } from '@/types/onboarding';

/**
 * Phase 6 — Best lift + active-lifters globe.
 *
 * Three steps:
 *   0. "Great choice!" — personal plan recap interlude
 *   1. Pick best lift + reps/weight (exercise carousel + ScrollPicker)
 *   2. Active lifters globe — animated dot count
 *
 * The lift is stored in the onboarding draft (no rank assigned) so it
 * later surfaces on the user's profile as a shareable, editable stat.
 * Hand-off goes to /onboard/phase7.
 */

// Three steps after dropping per-lift ranks: plan recap, best lift,
// active-lifters globe. The lift the user picks is saved to the
// onboarding draft as bestLifts (no rank assignment) so it can later
// surface on their profile and be edited / shared.
const TOTAL_STEPS = 3;

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

const EXERCISES: ExerciseDef[] = [
  { id: 'pushups',  name: 'Push Ups',     unitKind: 'reps',   thresholds: [0, 6, 16, 31, 51, 76, 101, 151],     defaultValue: 20,  pickerMax: 250, pickerStep: 1 },
  { id: 'pullups',  name: 'Pull Ups',     unitKind: 'reps',   thresholds: [0, 2, 6, 11, 16, 21, 26, 36],         defaultValue: 8,   pickerMax: 60,  pickerStep: 1 },
  { id: 'situps',   name: 'Sit Ups',      unitKind: 'reps',   thresholds: [0, 10, 25, 40, 60, 80, 110, 150],     defaultValue: 25,  pickerMax: 250, pickerStep: 1 },
  { id: 'bench',    name: 'Bench Press',  unitKind: 'weight', thresholds: [0, 30, 50, 70, 90, 110, 130, 160],    defaultValue: 60,  pickerMax: 250, pickerStep: 5 },
  { id: 'squat',    name: 'Squat',        unitKind: 'weight', thresholds: [0, 40, 70, 100, 130, 160, 190, 230],  defaultValue: 80,  pickerMax: 350, pickerStep: 5 },
  { id: 'deadlift', name: 'Deadlift',     unitKind: 'weight', thresholds: [0, 50, 90, 130, 170, 200, 230, 270],  defaultValue: 100, pickerMax: 400, pickerStep: 5 },
];

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

  // Reset picker default when exercise changes (so user doesn't keep
  // their squat weight when they swipe to push ups)
  useEffect(() => {
    setPickerValue(exercise.defaultValue);
  }, [exercise.defaultValue]);

  const next = () => {
    if (step < TOTAL_STEPS - 1) {
      // Save the best lift when leaving the lift-picker step. No rank
      // is computed — the lift just lives on the user's profile as a
      // shareable stat.
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

  // Step 2 (active-lifters globe) renders standalone with its own CTA.
  if (step === 2) {
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
          {step === 0 ? 'Continue →' : 'Save my best lift →'}
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
          For your profile
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
          <ActiveLiftersGlobe size={320} />
        </div>
      </div>
    </WizardShell>
  );
}
