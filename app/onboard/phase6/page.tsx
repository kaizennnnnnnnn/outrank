'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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

const RANKS = [
  { name: 'Iron',        color: '#94a3b8', percentile: 25 },
  { name: 'Bronze',      color: '#b45309', percentile: 50 },
  { name: 'Silver',      color: '#cbd5e1', percentile: 70 },
  { name: 'Gold',        color: '#fbbf24', percentile: 85 },
  { name: 'Platinum',    color: '#22d3ee', percentile: 93 },
  { name: 'Diamond',     color: '#60a5fa', percentile: 97 },
  { name: 'Master',      color: '#a855f7', percentile: 99 },
  { name: 'Champion',    color: '#fb923c', percentile: 99.7 },
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

export default function OnboardPhase6Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [pickerValue, setPickerValue] = useState(EXERCISES[0].defaultValue);

  const exercise = EXERCISES[exerciseIndex];
  const rankIdx = rankIndexFor(exercise, pickerValue);
  const rank = RANKS[rankIdx];

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
    else router.push('/onboard/phase5');
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
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
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={next}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          {step === 0 ? 'CONTINUE' : 'GET MY RANK!'}
        </motion.button>
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
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        Great choice,<br/><span className="text-orange-400">{name}</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Personal plan locked in — calibrated to your goals at a pace that fits your life. Now let&apos;s see where you stand.
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
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">First rank</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
          What&apos;s your <span className="text-orange-400">best lift</span>?
        </h2>
      </div>

      {/* Exercise carousel — center is selected, prev/next dimmer */}
      <div className="mt-8 flex items-center justify-center gap-2 select-none">
        <button
          onClick={() => setExerciseIndex(prev)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-orange-400 hover:bg-white/[0.05] transition-colors flex-shrink-0"
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-orange-400 hover:bg-white/[0.05] transition-colors flex-shrink-0"
          aria-label="Next exercise"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Exercise illustration card — large centered */}
      <div className="mt-6 mx-auto w-full max-w-xs">
        <div className="aspect-[5/3] rounded-2xl bg-gradient-to-br from-[#10101a] to-[#0c0c14] border border-white/[0.08] flex items-center justify-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(249,115,22,0.4), transparent 70%)' }}
          />
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
      className={cn(
        'whitespace-nowrap font-bold transition-all',
        active && 'text-white text-xl',
        dim && 'text-slate-500 text-[13px] opacity-50',
      )}
    >
      {name}
    </span>
  );
}

/**
 * Minimalist exercise pictograms. Just enough lines + a small head
 * circle to read the pose. No joint circles (they read as bug
 * limbs), no fancy gradients. Equipment in dim slate so the orange
 * figure pops.
 */
function ExerciseIllustration({ id }: { id: ExerciseId }) {
  const lim = '#fb923c';     // figure color
  const dim = '#475569';     // equipment / floor
  const plate = '#1e293b';
  const SW = 5;              // limb stroke
  const HEAD_R = 7;

  const Floor = (y = 124) => (
    <line x1="20" y1={y} x2="200" y2={y} stroke={dim} strokeWidth="2" strokeLinecap="round" />
  );

  if (id === 'pushups') {
    // Side view, body diagonal nose-to-toes, single arm + leg visible.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(116)}
        {/* Head */}
        <circle cx="156" cy="62" r={HEAD_R} fill={lim} />
        {/* Body line — head down to heels */}
        <line x1="148" y1="68" x2="38" y2="92" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Front arm — bent down to floor */}
        <path d="M 142 70 L 142 90 L 152 116" stroke={lim} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Back leg toe touching floor */}
        <line x1="38" y1="92" x2="22" y2="116" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'pullups') {
    // Body hanging from bar, arms reaching up.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {/* Bar */}
        <line x1="40" y1="22" x2="180" y2="22" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <line x1="48" y1="14" x2="48" y2="22" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="172" y1="14" x2="172" y2="22" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        {/* Arms reaching up to bar */}
        <line x1="100" y1="50" x2="100" y2="22" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="120" y1="50" x2="120" y2="22" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="110" cy="50" r={HEAD_R} fill={lim} />
        {/* Body */}
        <line x1="110" y1="56" x2="110" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Legs */}
        <line x1="110" y1="100" x2="100" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="100" x2="120" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'situps') {
    // Curl-up — body diagonal, knees bent.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(116)}
        {/* Lower legs — feet on floor, knees up */}
        <path d="M 60 116 L 80 84 L 102 116" stroke={lim} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Torso line — hinge at hips, head up */}
        <line x1="100" y1="116" x2="142" y2="64" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="146" cy="58" r={HEAD_R} fill={lim} />
      </svg>
    );
  }

  if (id === 'bench') {
    // Lying on bench, pressing bar up.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(124)}
        {/* Bench */}
        <line x1="40" y1="80" x2="180" y2="80" stroke={dim} strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="80" x2="50" y2="118" stroke={dim} strokeWidth="3" />
        <line x1="170" y1="80" x2="170" y2="118" stroke={dim} strokeWidth="3" />
        <line x1="42" y1="118" x2="62" y2="118" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="158" y1="118" x2="178" y2="118" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        {/* Body lying flat */}
        <line x1="60" y1="76" x2="140" y2="76" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="150" cy="72" r={HEAD_R} fill={lim} />
        {/* Legs hanging */}
        <line x1="60" y1="76" x2="44" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms pressing barbell up */}
        <line x1="100" y1="76" x2="100" y2="48" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="120" y1="76" x2="120" y2="48" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Barbell */}
        <line x1="50" y1="44" x2="170" y2="44" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="40" cy="44" rx="6" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="180" cy="44" rx="6" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
      </svg>
    );
  }

  if (id === 'squat') {
    // Front-on squat with bar overhead.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(124)}
        {/* Bar + plates */}
        <line x1="40" y1="40" x2="180" y2="40" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="30" cy="40" rx="5" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="190" cy="40" rx="5" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        {/* Head under bar */}
        <circle cx="110" cy="32" r={HEAD_R} fill={lim} />
        {/* Body */}
        <line x1="110" y1="40" x2="110" y2="78" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms gripping bar */}
        <line x1="110" y1="46" x2="86" y2="40" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="46" x2="134" y2="40" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Legs bent into squat */}
        <path d="M 110 78 L 86 96 L 86 124" stroke={lim} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 110 78 L 134 96 L 134 124" stroke={lim} strokeWidth={SW} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // deadlift — slight hinge, arms straight to bar at floor
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
      {Floor(124)}
      {/* Head */}
      <circle cx="110" cy="40" r={HEAD_R} fill={lim} />
      {/* Body — slight forward hinge */}
      <line x1="110" y1="46" x2="110" y2="84" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Arms straight to bar */}
      <line x1="110" y1="56" x2="92" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="56" x2="128" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Legs */}
      <line x1="110" y1="84" x2="100" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="84" x2="120" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Bar with bumper plates */}
      <line x1="40" y1="98" x2="180" y2="98" stroke={dim} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="98" r="18" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="188" cy="98" r="18" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="32" cy="98" r="3" fill={dim} />
      <circle cx="188" cy="98" r="3" fill={dim} />
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
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          CONTINUE
        </motion.button>
      }
    >
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400"
        >
          {exercise.name} • {value} {exercise.unitKind === 'reps' ? 'reps' : 'kg'}
        </motion.p>

        {/* Big rank badge with reveal animation */}
        <div className="relative mt-6">
          {/* Halo */}
          <motion.div
            className="absolute inset-0 m-auto rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 0.7, scale: 1.3 }}
            transition={{ delay: 0.3, duration: 1.0, ease: 'easeOut' }}
            style={{
              width: 280,
              height: 280,
              background: `radial-gradient(circle, ${rank.color}aa, transparent 65%)`,
              filter: 'blur(32px)',
            }}
          />
          {/* Sparkle rays */}
          <motion.svg
            initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
            animate={{ opacity: revealed ? 0.8 : 0, rotate: 0, scale: 1 }}
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
                stroke={rank.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
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
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-6 leading-tight">
            <span style={{ color: rank.color }}>{rank.name}</span>
          </h2>
          <p className="text-slate-300/85 mt-3 text-base">
            You&apos;re in the top{' '}
            <span className="font-bold text-white">{(100 - rank.percentile).toFixed(rank.percentile >= 99 ? 1 : 0)}%</span>{' '}
            of {exercise.name.toLowerCase()} lifters worldwide.
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
  // Slightly lighter shade for highlights
  return (
    <svg width="240" height="260" viewBox="0 0 240 260" fill="none">
      <defs>
        {/* Outer face — bright metallic top, deep base. Six stops for
            polish. */}
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="15%"  stopColor="#fef3c7" />
          <stop offset="35%"  stopColor={rank.color} />
          <stop offset="70%"  stopColor={rank.color} stopOpacity="0.6" />
          <stop offset="92%"  stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
        {/* Inner gem — radial gradient core */}
        <radialGradient id={`${id}-gem`} cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="20%"  stopColor="#fef3c7" />
          <stop offset="55%"  stopColor={rank.color} />
          <stop offset="100%" stopColor="#0c0c14" />
        </radialGradient>
        {/* Top-left specular shine */}
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Wing — shimmering metal with feather plumes */}
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%"  stopColor="#fef3c7" stopOpacity="0.9" />
          <stop offset="35%" stopColor={rank.color} stopOpacity="1" />
          <stop offset="80%" stopColor={rank.color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={rank.color} stopOpacity="0.05" />
        </linearGradient>
        {/* Banner */}
        <linearGradient id={`${id}-banner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="20%"  stopColor={rank.color} />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* Behind-badge halo glow */}
      <circle cx="120" cy="120" r="80" fill={rank.color} opacity="0.15" filter={`url(#${id}-blur)`} />

      {/* Wing flourishes — bigger, with feather details */}
      <g style={{ filter: `drop-shadow(0 4px 10px ${rank.color}88)` }}>
        {/* Left wing — three feather sweeps */}
        <path
          d="M 12 122 Q 30 90 70 102 Q 56 116 80 130 Q 50 134 24 130 Q 14 126 12 122 Z"
          fill={`url(#${id}-wing)`}
        />
        {/* Feather division lines */}
        <path d="M 16 120 Q 38 110 70 104" stroke="#fef3c7" strokeWidth="0.8" fill="none" opacity="0.65" strokeLinecap="round" />
        <path d="M 22 126 Q 46 118 75 116" stroke="#fef3c7" strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M 28 130 Q 50 126 78 128" stroke="#fef3c7" strokeWidth="0.5" fill="none" opacity="0.4" strokeLinecap="round" />
        {/* Feather tips */}
        <path d="M 14 118 L 8 112 L 18 122 Z" fill={rank.color} opacity="0.8" />
        <path d="M 20 126 L 14 124 L 24 130 Z" fill={rank.color} opacity="0.8" />
      </g>
      <g style={{ filter: `drop-shadow(0 4px 10px ${rank.color}88)` }}>
        {/* Right wing — mirror */}
        <path
          d="M 228 122 Q 210 90 170 102 Q 184 116 160 130 Q 190 134 216 130 Q 226 126 228 122 Z"
          fill={`url(#${id}-wing)`}
        />
        <path d="M 224 120 Q 202 110 170 104" stroke="#fef3c7" strokeWidth="0.8" fill="none" opacity="0.65" strokeLinecap="round" />
        <path d="M 218 126 Q 194 118 165 116" stroke="#fef3c7" strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M 212 130 Q 190 126 162 128" stroke="#fef3c7" strokeWidth="0.5" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M 226 118 L 232 112 L 222 122 Z" fill={rank.color} opacity="0.8" />
        <path d="M 220 126 L 226 124 L 216 130 Z" fill={rank.color} opacity="0.8" />
      </g>

      {/* Hex badge */}
      <g style={{ filter: `drop-shadow(0 8px 28px ${rank.color}cc)` }}>
        {/* Outer hex face */}
        <path
          d="M 120 50 L 172 80 L 172 152 L 120 182 L 68 152 L 68 80 Z"
          fill={`url(#${id}-face)`}
          stroke={rank.color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Inner inset hex (deeper bevel) */}
        <path
          d="M 120 64 L 158 86 L 158 146 L 120 168 L 82 146 L 82 86 Z"
          fill="#0c0c14"
          stroke={rank.color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Engraved facet cuts — connect outer to inner hex */}
        <path
          d="M 120 50 L 120 64 M 172 80 L 158 86 M 172 152 L 158 146 M 120 182 L 120 168 M 68 152 L 82 146 M 68 80 L 82 86"
          stroke={rank.color}
          strokeWidth="0.8"
          opacity="0.85"
        />
        {/* Top-left facet specular */}
        <path
          d="M 120 64 L 158 86 L 120 102 L 82 86 Z"
          fill={`url(#${id}-shine)`}
        />
        {/* Inner gem — circular jewel in the middle */}
        <circle cx="120" cy="120" r="26" fill={`url(#${id}-gem)`} stroke={rank.color} strokeWidth="1.2" />
        {/* Gem inner facets */}
        <path d="M 120 100 L 138 116 L 130 138 L 110 138 L 102 116 Z"
          fill="none" stroke="#ffffff" strokeWidth="0.4" opacity="0.4" />
        {/* Gem highlight */}
        <ellipse cx="113" cy="112" rx="6" ry="4" fill="#ffffff" opacity="0.55" />

        {/* Rank initial — large, bold, embossed */}
        <text
          x="120"
          y="132"
          textAnchor="middle"
          fontSize="32"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill="#ffffff"
          style={{ filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.8))` }}
        >
          {rank.name[0]}
        </text>

        {/* Tier dots */}
        <g>
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < Math.min(5, idx + 1);
            return (
              <circle
                key={i}
                cx={104 + i * 8}
                cy={158}
                r="2.2"
                fill={filled ? rank.color : '#1a1a2e'}
                stroke={filled ? '#fef3c7' : '#1a1a2e'}
                strokeWidth="0.6"
              />
            );
          })}
        </g>
      </g>

      {/* Crown — top-tier ranks only */}
      {hasCrown && (
        <g style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>
          {/* Base band with engraving */}
          <rect x="92" y="38" width="56" height="8" rx="1" fill="#fbbf24" stroke="#92400e" strokeWidth="0.6" />
          <line x1="92" y1="40" x2="148" y2="40" stroke="#fef3c7" strokeWidth="0.5" opacity="0.7" />
          {/* Spires */}
          <path d="M 96 38 L 100 22 L 104 38 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.5" />
          <path d="M 108 38 L 112 16 L 116 38 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.5" />
          <path d="M 124 38 L 128 16 L 132 38 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.5" />
          <path d="M 136 38 L 140 22 L 144 38 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.5" />
          {/* Center spire with jewel */}
          <path d="M 116 38 L 120 6 L 124 38 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.5" />
          <circle cx="120" cy="14" r="4.5" fill="#ef4444" stroke="#fde047" strokeWidth="0.8" />
          <ellipse cx="118" cy="12" rx="1.5" ry="1" fill="#ffffff" opacity="0.7" />
          {/* Side jewels on band */}
          <circle cx="98" cy="42" r="1.6" fill="#3b82f6" stroke="#fef3c7" strokeWidth="0.3" />
          <circle cx="142" cy="42" r="1.6" fill="#3b82f6" stroke="#fef3c7" strokeWidth="0.3" />
        </g>
      )}

      {/* Banner ribbon */}
      <g style={{ filter: `drop-shadow(0 4px 8px ${rank.color}88)` }}>
        <path
          d="M 76 188 L 164 188 L 158 214 L 120 206 L 82 214 Z"
          fill={`url(#${id}-banner)`}
          stroke={rank.color}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M 76 188 L 70 200 L 82 204 Z" fill={rank.color} opacity="0.8" />
        <path d="M 164 188 L 170 200 L 158 204 Z" fill={rank.color} opacity="0.8" />
        <text
          x="120"
          y="204"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill="#ffffff"
          letterSpacing="2.5"
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
      footer={
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          CONTINUE
        </motion.button>
      }
    >
      <div className="flex flex-col flex-1 justify-center text-center px-1">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">Projected progress</p>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2 leading-tight">
          You can reach<br/>
          <span style={{ color: target.color }}>{target.name}</span>
          <br/>
          by <span className="text-white">{etaStr}</span>.
        </h2>

        {/* Current → target visual */}
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="flex flex-col items-center">
            <div className="opacity-60">
              <RankBadgeMini rank={current} size={84} />
            </div>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-2">Now</span>
          </div>

          {/* Arrow with progress dots */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block w-2 h-2 rounded-full"
                  style={{
                    background: target.color,
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
              style={{ filter: `drop-shadow(0 0 14px ${target.color}aa)` }}
            >
              <RankBadgeMini rank={target} size={100} />
            </motion.div>
            <span className="text-[9px] uppercase tracking-widest font-bold mt-2" style={{ color: target.color }}>
              Goal
            </span>
          </div>
        </div>

        <p className="text-slate-300/85 mt-10 max-w-sm mx-auto text-[15px] leading-relaxed">
          You have <span className="text-orange-400 font-semibold">amazing potential</span>. Ranks measure your real progress — keep showing up and they keep climbing.
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
          <stop offset="0%"  stopColor="#fef3c7" />
          <stop offset="25%" stopColor={rank.color} />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
      </defs>
      <g style={{ filter: `drop-shadow(0 3px 12px ${rank.color}99)` }}>
        <path
          d="M 50 12 L 80 32 L 80 78 L 50 98 L 20 78 L 20 32 Z"
          fill={`url(#rbm-${rank.name})`}
          stroke={rank.color}
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
      footer={
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          CONTINUE
        </motion.button>
      }
    >
      <div className="flex flex-col items-center text-center flex-1 justify-center">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-tight max-w-sm">
          There are{' '}
          <span
            className="text-orange-400 font-mono tabular-nums inline-block text-center"
            style={{ minWidth: '4.5em' }}
          >
            {count.toLocaleString()}
          </span>{' '}
          lifters working out right now.
        </h2>
        <p className="text-slate-300/85 mt-3 max-w-sm text-[15px] leading-relaxed">
          You&apos;ll join thousands leveling up today.
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
 */

// Continent silhouettes for a 240-wide horizontal world map. The KEY
// invert from the previous version: continents are LIGHTER than the
// ocean (matching the user's reference), so they read as raised land
// against a deep night ocean. Shapes are hand-drawn to roughly match
// real continents — Mexico tail on NA, V-shape on SA, recognizable
// Africa horn, India peninsula, Australia, etc.
const CONTINENTS = [
  // North America — with Alaska wrap, Canada, US, Mexico tail
  'M 4 30 Q 14 22 28 22 Q 42 22 54 24 Q 66 26 74 32 Q 78 42 74 54 Q 66 60 58 60 Q 50 64 46 72 Q 44 82 38 88 Q 30 84 24 76 Q 16 68 10 58 Q 4 46 4 30 Z',
  // Greenland
  'M 78 16 Q 88 14 96 22 Q 96 32 90 38 Q 80 38 78 32 Z',
  // Central America bridge
  'M 38 90 L 48 88 L 52 100 L 44 100 Z',
  // South America — V-shape with Andes side
  'M 48 100 Q 62 96 72 102 Q 76 116 74 132 Q 70 154 64 168 Q 58 174 52 168 Q 46 152 46 130 Q 46 114 48 100 Z',
  // UK
  'M 100 50 Q 106 48 108 54 Q 106 58 102 58 Z',
  // Western Europe
  'M 110 52 Q 124 50 132 54 Q 136 64 130 70 Q 118 72 112 66 Z',
  // Iberia
  'M 100 64 Q 110 64 112 70 Q 110 74 102 74 Z',
  // Scandinavia
  'M 122 32 Q 138 28 142 38 Q 142 50 132 52 Q 124 50 122 42 Z',
  // Africa — recognizable shape, horn east, narrow south
  'M 102 76 Q 124 74 138 80 Q 142 92 142 102 Q 144 116 138 130 Q 130 144 122 156 Q 114 158 110 150 Q 104 132 100 114 Q 98 96 102 76 Z',
  // Madagascar
  'M 144 130 Q 152 128 152 142 Q 150 150 146 150 Q 142 144 144 130 Z',
  // Middle East / Saudi Arabia
  'M 138 80 Q 150 78 156 86 Q 158 96 150 98 Q 142 94 138 88 Z',
  // Asia mainland (Russia/China)
  'M 138 30 Q 162 24 188 24 Q 210 26 226 32 Q 234 42 232 56 Q 226 70 218 78 Q 204 84 188 86 Q 172 86 158 80 Q 146 70 142 58 Q 138 44 138 30 Z',
  // India peninsula
  'M 162 88 Q 176 88 178 100 Q 178 116 170 124 Q 162 120 158 108 Q 158 96 162 88 Z',
  // SE Asia / Indochina
  'M 178 90 Q 192 88 196 100 Q 196 110 188 114 Q 178 110 178 100 Z',
  // Japan
  'M 222 56 Q 230 60 232 70 Q 228 78 222 76 Q 220 66 222 56 Z',
  // Indonesia archipelago
  'M 178 116 Q 192 114 200 120 Q 198 128 188 130 Q 180 126 178 122 Z',
  // Philippines
  'M 200 102 Q 208 100 210 110 Q 206 116 202 114 Z',
  // Australia
  'M 188 132 Q 212 128 222 138 Q 222 152 214 162 Q 200 166 190 162 Q 184 150 188 132 Z',
  // New Zealand
  'M 224 162 Q 232 160 232 172 Q 226 174 222 172 Z',
];

// 35 dot clusters across populated regions. Coordinates are in the
// 0..240 world-strip space. Smaller (2px halo + 1px core) and
// lighter cyan than before — reading as "city lights at night."
const GLOBE_DOTS: [number, number, number][] = [
  // North America cluster
  [16, 50, 0.0], [22, 56, 0.4], [28, 50, 0.8], [38, 50, 0.2], [44, 56, 0.6], [50, 64, 1.0], [42, 78, 1.4],
  // South America cluster
  [60, 110, 0.3], [56, 130, 0.7], [62, 150, 1.1], [66, 134, 1.5],
  // Europe cluster
  [104, 56, 0.0], [114, 56, 0.4], [122, 58, 0.8], [128, 62, 1.2], [120, 50, 1.6], [108, 64, 0.3],
  // Africa cluster (north)
  [120, 80, 0.5], [128, 90, 0.9], [114, 96, 1.3], [120, 110, 1.7],
  // Africa cluster (south)
  [122, 142, 0.2], [134, 150, 0.6],
  // Middle East
  [148, 86, 0.3], [142, 92, 0.7],
  // India dense
  [166, 102, 0.0], [170, 110, 0.4], [174, 116, 0.8], [168, 118, 1.2],
  // SE Asia / China
  [186, 76, 0.5], [196, 70, 0.9], [206, 80, 1.3], [188, 102, 1.7],
  // Japan / Korea
  [222, 60, 0.2], [228, 68, 0.6],
  // Australia / NZ
  [196, 148, 0.4], [206, 152, 0.8], [214, 156, 1.2], [228, 168, 1.6],
];

const Globe = React.memo(function Globe() {
  return (
    <div className="relative w-[320px] h-[320px] mx-auto">
      {/* Dense star field */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 320" fill="none">
        {[
          [12, 24, 1.0], [38, 14, 0.7], [78, 22, 0.9], [122, 8, 1.0], [168, 14, 0.8],
          [218, 22, 1.0], [256, 32, 0.7], [284, 56, 0.9], [302, 80, 0.6],
          [12, 86, 0.6], [310, 116, 0.8], [8, 160, 0.9], [310, 200, 0.7],
          [22, 250, 0.8], [38, 286, 1.0], [80, 304, 0.7], [128, 312, 0.6],
          [184, 308, 0.9], [240, 296, 0.8], [276, 270, 0.7], [304, 234, 0.6],
          [156, 12, 0.5], [206, 14, 0.6], [60, 18, 0.55], [100, 16, 0.5],
          [50, 280, 0.55], [250, 264, 0.6], [180, 290, 0.5], [220, 290, 0.6],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.5 + (i % 3) * 0.15} />
        ))}
      </svg>

      {/* Outer atmospheric halo */}
      <div
        className="absolute inset-0 m-auto rounded-full pointer-events-none"
        style={{
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(56,189,248,0.2) 35%, transparent 70%)',
          filter: 'blur(22px)',
        }}
      />

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
          {/* Ocean — deep purple-navy, BRIGHT upper-left lit hemisphere
              fading to NEAR-BLACK lower-right shadow. Strong terminator
              for the 3D sphere read. */}
          <radialGradient id="globeOcean" cx="30%" cy="26%" r="85%">
            <stop offset="0%"   stopColor="#5854a3" />
            <stop offset="20%"  stopColor="#393373" />
            <stop offset="50%"  stopColor="#1a1542" />
            <stop offset="80%"  stopColor="#080620" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Continent fill — soft slate-purple, bright on lit hemisphere */}
          <radialGradient id="globeLand" cx="30%" cy="26%" r="85%">
            <stop offset="0%"   stopColor="#a5a8d4" />
            <stop offset="35%"  stopColor="#7c7fb0" />
            <stop offset="70%"  stopColor="#4a4d7c" />
            <stop offset="100%" stopColor="#2a2c50" />
          </radialGradient>
          {/* Sphere shadow — heavy at lower-right */}
          <radialGradient id="globeShadow" cx="30%" cy="26%" r="80%">
            <stop offset="0%"   stopColor="#000000" stopOpacity="0" />
            <stop offset="55%"  stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
          </radialGradient>
          {/* Highlight — subtle bright sheen at upper-left */}
          <radialGradient id="globeHighlight" cx="28%" cy="22%" r="35%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        {/* Ocean base sphere */}
        <circle cx="140" cy="140" r="128" fill="url(#globeOcean)" />

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
                      fill="url(#globeLand)"
                      stroke="#3a3c64"
                      strokeWidth="0.35"
                    />
                  ))}
                  {/* Bigger, more clustered cyan dots */}
                  {GLOBE_DOTS.map(([x, y, delay], i) => (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3.5" fill="#67e8f9" opacity="0.45" filter="url(#dotGlow)">
                        <animate attributeName="opacity" values="0.25; 0.65; 0.25" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r="1.4" fill="#cffafe">
                        <animate attributeName="opacity" values="0.7; 1; 0.7" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}
                </g>
              ))}
            </g>
          </g>

          {/* Lat/long grid — very subtle */}
          {[60, 90, 140, 190, 220].map((y) => {
            const r = Math.sqrt(Math.max(0, 128 * 128 - (y - 140) * (y - 140)));
            return r > 0 ? (
              <ellipse
                key={y}
                cx="140"
                cy={y}
                rx={r}
                ry={r * 0.18}
                stroke="#a5b4fc"
                strokeWidth="0.4"
                fill="none"
                opacity="0.14"
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
                stroke="#a5b4fc"
                strokeWidth="0.4"
                fill="none"
                opacity="0.12"
              />
            );
          })}

          {/* Sphere shadow — drives the 3D depth feel */}
          <circle cx="140" cy="140" r="128" fill="url(#globeShadow)" />
          {/* Highlight sheen */}
          <circle cx="140" cy="140" r="128" fill="url(#globeHighlight)" />
        </g>

        {/* Rim glow */}
        <circle cx="140" cy="140" r="128" fill="none" stroke="#67e8f9" strokeWidth="1" opacity="0.6" />
        <circle cx="140" cy="140" r="131" fill="none" stroke="#a5b4fc" strokeWidth="1.5" opacity="0.3" />
      </svg>
    </div>
  );
});
