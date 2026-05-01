'use client';

import { useEffect, useState } from 'react';
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
 * Simple stick-figure exercise illustrations. The previous filled-body
 * versions were over-engineered and read worse than honest stick
 * figures. These use thick orange strokes + small joint circles for
 * articulation, plus minimal equipment (bench, bar, plates) drawn in
 * dim slate so the figure pops.
 */
function ExerciseIllustration({ id }: { id: ExerciseId }) {
  const lim = '#fb923c';     // limb color
  const acc = '#dc2626';     // joint accent
  const dim = '#475569';     // equipment / floor
  const plate = '#1e293b';
  const SW = 6;              // limb stroke
  const HEAD_R = 9;

  const Joint = ({ cx, cy }: { cx: number; cy: number }) => (
    <circle cx={cx} cy={cy} r={3.5} fill={acc} />
  );
  const Floor = (y = 124) => (
    <line x1="20" y1={y} x2="200" y2={y} stroke={dim} strokeWidth="2" strokeLinecap="round" />
  );

  if (id === 'pushups') {
    // Side view, head right, body horizontal in plank, one arm bent.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(124)}
        {/* Body line — head to feet */}
        <line x1="38" y1="78" x2="138" y2="76" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head + neck */}
        <circle cx="148" cy="72" r={HEAD_R} fill={lim} />
        {/* Front arm — bent down to floor */}
        <line x1="138" y1="78" x2="148" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="148" y1="98" x2="148" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={148} cy={98} />
        {/* Back arm — bent down to floor */}
        <line x1="62" y1="80" x2="62" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="62" y1="100" x2="74" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={62} cy={100} />
        {/* Legs straight back */}
        <line x1="38" y1="78" x2="22" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="44" y1="78" x2="34" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'pullups') {
    // Bar at top, body hanging.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {/* Bar + brackets */}
        <line x1="40" y1="22" x2="180" y2="22" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <line x1="48" y1="14" x2="48" y2="22" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="172" y1="14" x2="172" y2="22" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        {/* Hands gripping bar */}
        <Joint cx={94} cy={22} />
        <Joint cx={126} cy={22} />
        {/* Arms — straight up to bar */}
        <line x1="100" y1="50" x2="94" y2="22" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="120" y1="50" x2="126" y2="22" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="110" cy="50" r={HEAD_R} fill={lim} />
        {/* Torso */}
        <line x1="110" y1="58" x2="110" y2="92" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Hips joint */}
        <Joint cx={110} cy={92} />
        {/* Legs — straight down */}
        <line x1="110" y1="92" x2="98" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="92" x2="122" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      </svg>
    );
  }

  if (id === 'situps') {
    // Curling up at ~45° from floor, knees bent.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(124)}
        {/* Bent legs — knees up, feet planted */}
        <line x1="58" y1="120" x2="78" y2="86" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="78" y1="86" x2="98" y2="116" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={78} cy={86} />
        {/* Torso — at angle */}
        <line x1="98" y1="116" x2="138" y2="64" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Hips joint */}
        <Joint cx={98} cy={116} />
        {/* Head — at top of torso */}
        <circle cx="142" cy="56" r={HEAD_R} fill={lim} />
        {/* Arm — crossed, behind head */}
        <line x1="138" y1="64" x2="128" y2="44" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="128" y1="44" x2="148" y2="48" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={128} cy={44} />
      </svg>
    );
  }

  if (id === 'bench') {
    // Lying on bench, pushing barbell up.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(132)}
        {/* Bench */}
        <line x1="40" y1="84" x2="180" y2="84" stroke={dim} strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="84" x2="50" y2="124" stroke={dim} strokeWidth="3" />
        <line x1="170" y1="84" x2="170" y2="124" stroke={dim} strokeWidth="3" />
        <line x1="42" y1="124" x2="62" y2="124" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="158" y1="124" x2="178" y2="124" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        {/* Body — flat on bench (head right) */}
        <line x1="60" y1="80" x2="140" y2="80" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Head */}
        <circle cx="150" cy="76" r={HEAD_R} fill={lim} />
        {/* Legs hanging off the foot end */}
        <line x1="60" y1="80" x2="40" y2="100" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="64" y1="84" x2="44" y2="106" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms pushing barbell up */}
        <line x1="100" y1="80" x2="100" y2="48" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="120" y1="80" x2="120" y2="48" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={100} cy={48} />
        <Joint cx={120} cy={48} />
        {/* Barbell */}
        <line x1="50" y1="44" x2="170" y2="44" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        {/* Plates */}
        <ellipse cx="40" cy="44" rx="6" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="180" cy="44" rx="6" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
      </svg>
    );
  }

  if (id === 'squat') {
    // Front-facing squat with bar across shoulders.
    return (
      <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
        {Floor(132)}
        {/* Barbell + plates */}
        <line x1="40" y1="42" x2="180" y2="42" stroke={dim} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="30" cy="42" rx="5" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        <ellipse cx="190" cy="42" rx="5" ry="18" fill={plate} stroke={dim} strokeWidth="1" />
        {/* Head — under bar */}
        <circle cx="110" cy="34" r={HEAD_R} fill={lim} />
        {/* Torso — vertical */}
        <line x1="110" y1="42" x2="110" y2="80" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Arms gripping bar */}
        <line x1="110" y1="48" x2="86" y2="42" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="110" y1="48" x2="134" y2="42" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        {/* Hips joint */}
        <Joint cx={110} cy={80} />
        {/* Legs — bent into squat */}
        <line x1="110" y1="80" x2="86" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="86" y1="98" x2="86" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={86} cy={98} />
        <line x1="110" y1="80" x2="134" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <line x1="134" y1="98" x2="134" y2="124" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
        <Joint cx={134} cy={98} />
      </svg>
    );
  }

  // deadlift — hinged forward, hands on bar at floor
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
      {Floor(124)}
      {/* Head */}
      <circle cx="110" cy="40" r={HEAD_R} fill={lim} />
      {/* Torso — slightly hinged */}
      <line x1="110" y1="48" x2="110" y2="86" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <Joint cx={110} cy={86} />
      {/* Arms straight down to bar */}
      <line x1="110" y1="56" x2="86" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="56" x2="134" y2="98" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Hands grip bar */}
      <Joint cx={86} cy={98} />
      <Joint cx={134} cy={98} />
      {/* Legs — slight bend */}
      <line x1="110" y1="86" x2="98" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      <line x1="110" y1="86" x2="122" y2="118" stroke={lim} strokeWidth={SW} strokeLinecap="round" />
      {/* Barbell on floor */}
      <line x1="40" y1="98" x2="180" y2="98" stroke={dim} strokeWidth="4" strokeLinecap="round" />
      {/* Big bumper plates */}
      <circle cx="32" cy="98" r="20" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="188" cy="98" r="20" fill={plate} stroke={dim} strokeWidth="1.2" />
      <circle cx="32" cy="98" r="3.5" fill={dim} />
      <circle cx="188" cy="98" r="3.5" fill={dim} />
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
  return (
    <svg width="220" height="240" viewBox="0 0 220 240" fill="none">
      <defs>
        {/* Outer hex face — multi-stop metallic gradient */}
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fef3c7" />
          <stop offset="18%" stopColor={rank.color} />
          <stop offset="55%" stopColor={rank.color} />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
        {/* Inner hex bevel — darker, deeper */}
        <linearGradient id={`${id}-inner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={rank.color} stopOpacity="0.5" />
          <stop offset="60%" stopColor="#0c0c14" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        {/* Top facet specular shine */}
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Wing primary — shimmering metal */}
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%"  stopColor={rank.color} stopOpacity="0.95" />
          <stop offset="55%" stopColor={rank.color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={rank.color} stopOpacity="0.15" />
        </linearGradient>
        {/* Banner gradient */}
        <linearGradient id={`${id}-banner`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={rank.color} />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
      </defs>

      {/* Wing flourishes — left and right, with detailed feathers */}
      {/* Left wing */}
      <g style={{ filter: `drop-shadow(0 2px 6px ${rank.color}66)` }}>
        <path
          d="M 18 110 Q 30 88 64 96 Q 56 112 70 122 Q 50 124 30 122 Q 22 118 18 110 Z"
          fill={`url(#${id}-wing)`}
        />
        {/* Feather rachis lines */}
        <path d="M 22 110 L 64 100" stroke="#fef3c7" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 26 116 L 66 106" stroke="#fef3c7" strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M 30 120 L 65 116" stroke="#fef3c7" strokeWidth="0.5" fill="none" opacity="0.4" strokeLinecap="round" />
        {/* Tip points */}
        <path d="M 22 108 L 18 104 L 24 110 Z" fill={rank.color} opacity="0.7" />
        <path d="M 26 116 L 22 114 L 28 118 Z" fill={rank.color} opacity="0.7" />
      </g>
      {/* Right wing — mirror */}
      <g style={{ filter: `drop-shadow(0 2px 6px ${rank.color}66)` }}>
        <path
          d="M 202 110 Q 190 88 156 96 Q 164 112 150 122 Q 170 124 190 122 Q 198 118 202 110 Z"
          fill={`url(#${id}-wing)`}
        />
        <path d="M 198 110 L 156 100" stroke="#fef3c7" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 194 116 L 154 106" stroke="#fef3c7" strokeWidth="0.6" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M 190 120 L 155 116" stroke="#fef3c7" strokeWidth="0.5" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M 198 108 L 202 104 L 196 110 Z" fill={rank.color} opacity="0.7" />
        <path d="M 194 116 L 198 114 L 192 118 Z" fill={rank.color} opacity="0.7" />
      </g>

      {/* Hex badge — with deep drop shadow for floating feel */}
      <g style={{ filter: `drop-shadow(0 6px 24px ${rank.color}aa)` }}>
        {/* Outer hex (face) */}
        <path
          d="M 110 42 L 156 72 L 156 138 L 110 168 L 64 138 L 64 72 Z"
          fill={`url(#${id}-face)`}
          stroke={rank.color}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Inner hex (bevel/depth, slightly inset) */}
        <path
          d="M 110 56 L 144 78 L 144 132 L 110 154 L 76 132 L 76 78 Z"
          fill={`url(#${id}-inner)`}
          stroke={rank.color}
          strokeWidth="1"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* Engraved facet lines (edge cuts on the outer hex) */}
        <path d="M 110 42 L 110 56 M 156 72 L 144 78 M 156 138 L 144 132 M 110 168 L 110 154 M 64 138 L 76 132 M 64 72 L 76 78"
          stroke={rank.color} strokeWidth="0.6" opacity="0.7" />
        {/* Top-left facet specular highlight */}
        <path
          d="M 110 56 L 144 78 L 110 92 L 76 78 Z"
          fill={`url(#${id}-shine)`}
        />
        {/* Inner glow circle behind the letter */}
        <circle cx="110" cy="105" r="22" fill={rank.color} opacity="0.18" />
        {/* Rank initial — large, bold */}
        <text
          x="110"
          y="118"
          textAnchor="middle"
          fontSize="44"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill="#ffffff"
          style={{ filter: `drop-shadow(0 0 6px ${rank.color}cc)` }}
        >
          {rank.name[0]}
        </text>
        {/* Tier dot indicators below the letter */}
        <g>
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < Math.min(5, idx + 1);
            return (
              <circle
                key={i}
                cx={94 + i * 8}
                cy={140}
                r="2"
                fill={filled ? rank.color : '#1e293b'}
                stroke={filled ? '#fef3c7' : 'transparent'}
                strokeWidth="0.5"
              />
            );
          })}
        </g>
      </g>

      {/* Crown — for top 4 ranks. Detailed with center jewel + side
          spires + base band. */}
      {hasCrown && (
        <g style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          {/* Crown base band */}
          <rect x="86" y="32" width="48" height="6" rx="1" fill="#fbbf24" stroke="#7c2d12" strokeWidth="0.5" />
          {/* Five spires */}
          <path d="M 90 32 L 92 18 L 96 32 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 100 32 L 102 14 L 106 32 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 110 32 L 110 8  L 110 32 Z" fill="none" />
          <circle cx="110" cy="14" r="4" fill="#ef4444" stroke="#fde047" strokeWidth="0.5" />
          <path d="M 114 32 L 118 14 L 120 32 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          <path d="M 124 32 L 128 18 L 130 32 Z" fill="#fde047" stroke="#7c2d12" strokeWidth="0.5" />
          {/* Side jewels on the band */}
          <circle cx="92" cy="35" r="1.5" fill="#3b82f6" />
          <circle cx="128" cy="35" r="1.5" fill="#3b82f6" />
        </g>
      )}

      {/* Banner ribbon below the badge */}
      <g style={{ filter: `drop-shadow(0 3px 6px ${rank.color}66)` }}>
        <path
          d="M 70 174 L 150 174 L 144 198 L 110 192 L 76 198 Z"
          fill={`url(#${id}-banner)`}
          stroke={rank.color}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Banner end folds */}
        <path d="M 70 174 L 64 184 L 76 188 Z" fill={rank.color} opacity="0.7" />
        <path d="M 150 174 L 156 184 L 144 188 Z" fill={rank.color} opacity="0.7" />
        <text
          x="110"
          y="188"
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fontFamily="ui-monospace,monospace"
          fill="#ffffff"
          letterSpacing="2"
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
          <span className="text-orange-400 tabular-nums">{count.toLocaleString()}</span>{' '}
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

// Continent silhouettes for a 220-wide horizontal world map. Drawn
// dim (slate) so the bright user-activity dots pop on top — matches
// the user's reference of a night-mode Earth from space where the
// CITIES are the bright feature, not the landmass.
const CONTINENTS = [
  // North America (with Mexico tail)
  'M 6 32 Q 14 24 26 24 L 38 26 Q 48 22 56 28 L 64 24 L 72 36 Q 76 50 70 60 L 60 66 L 50 70 L 44 80 L 38 90 L 32 84 L 24 78 L 16 70 L 8 56 Z',
  // Greenland
  'M 80 18 L 92 20 L 90 36 L 82 38 Z',
  // Central America bridge
  'M 38 90 L 50 88 L 52 100 L 46 100 Z',
  // South America
  'M 50 100 L 62 96 L 70 102 L 74 122 L 70 150 L 64 168 L 56 170 L 50 162 L 46 144 L 46 118 Z',
  // UK + Western Europe
  'M 100 50 L 116 48 L 132 52 L 138 60 L 130 68 L 110 68 L 100 60 Z',
  // Scandinavia
  'M 122 36 L 138 32 L 140 50 L 128 50 Z',
  // Africa
  'M 100 78 L 132 78 L 140 92 L 142 118 L 132 142 L 122 156 L 112 152 L 102 130 L 96 102 Z',
  // Madagascar
  'M 144 134 L 150 132 L 152 150 L 146 152 Z',
  // Middle East
  'M 138 78 L 152 76 L 156 92 L 144 92 L 138 86 Z',
  // Asia mainland
  'M 138 28 L 168 24 L 200 28 L 218 40 L 218 60 L 208 78 L 190 86 L 168 86 L 152 78 L 142 64 L 138 48 Z',
  // India
  'M 162 90 L 174 90 L 178 112 L 170 122 L 162 116 L 158 100 Z',
  // China extension / Japan
  'M 198 60 L 218 70 L 214 80 L 200 76 Z',
  // Indonesia / Malaysia
  'M 178 116 L 198 112 L 202 124 L 188 128 L 180 122 Z',
  // Australia
  'M 188 132 L 215 128 L 218 148 L 210 162 L 196 164 L 188 152 Z',
];

// Active-user dot positions on the world map (0..220 x). Each dot
// represents a region of activity; double-render across both world
// copies so they're visible on either side of the seamless loop.
const GLOBE_DOTS: [number, number, number][] = [
  [22, 56, 0],     // SF
  [40, 50, 0.4],   // NYC
  [42, 76, 0.8],   // Mexico
  [60, 116, 1.2],  // Sao Paulo
  [62, 152, 0.3],  // Buenos Aires
  [108, 56, 0.7],  // London
  [122, 60, 1.4],  // Paris/Berlin
  [126, 88, 1.0],  // Cairo
  [116, 116, 1.6], // Lagos
  [128, 144, 0.5], // Cape Town
  [148, 88, 0.9],  // Dubai
  [168, 108, 1.3], // Mumbai
  [184, 60, 0.2],  // Beijing
  [202, 68, 1.7],  // Tokyo
  [198, 148, 0.6], // Sydney
  [188, 122, 1.1], // Jakarta
];

function Globe() {
  return (
    <div className="relative w-[300px] h-[300px] mx-auto">
      {/* Star field — bigger, more stars for space feel */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300" fill="none">
        {[
          [16, 28, 1.2], [42, 14, 0.8], [84, 22, 1], [128, 8, 1.1],
          [182, 16, 0.9], [232, 24, 1.2], [266, 36, 0.8], [284, 60, 1.0],
          [12, 90, 0.7], [294, 100, 0.9], [8, 160, 1.0], [288, 180, 0.8],
          [22, 230, 0.9], [38, 268, 1.1], [80, 286, 0.8], [128, 292, 0.7],
          [184, 290, 1.0], [240, 280, 0.9], [276, 256, 0.8], [288, 220, 0.7],
          [156, 12, 0.6], [206, 14, 0.7], [60, 18, 0.65], [104, 16, 0.55],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </svg>

      {/* Atmospheric outer halo — cyan glow extending past the rim */}
      <div
        className="absolute inset-0 m-auto rounded-full pointer-events-none"
        style={{
          width: 280,
          height: 280,
          background: 'radial-gradient(circle, rgba(34,211,238,0.55) 0%, rgba(56,189,248,0.25) 35%, transparent 70%)',
          filter: 'blur(22px)',
        }}
      />

      <svg
        viewBox="0 0 240 240"
        fill="none"
        className="absolute inset-0 m-auto w-[260px] h-[260px]"
        style={{ overflow: 'hidden' }}
      >
        <defs>
          <clipPath id="globeClip">
            <circle cx="120" cy="120" r="108" />
          </clipPath>
          {/* Ocean — deep navy with subtle upper-left glow */}
          <radialGradient id="globeOcean" cx="35%" cy="30%" r="75%">
            <stop offset="0%"  stopColor="#1e3a8a" />
            <stop offset="35%" stopColor="#0c1f4a" />
            <stop offset="75%" stopColor="#020617" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Continent fill — dim slate, just enough contrast to read */}
          <linearGradient id="globeLand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          {/* Sphere lighting — bright upper-left, dim lower-right */}
          <radialGradient id="globeLight" cx="32%" cy="28%" r="75%">
            <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </radialGradient>
          {/* Glow filter for active dots */}
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Ocean base */}
        <circle cx="120" cy="120" r="108" fill="url(#globeOcean)" />

        {/* Continents + dots, clipped to globe, drifting horizontally
            for the rotation illusion. Two copies side-by-side for
            seamless loop. The continents start at y=8 within a 220-tall
            world strip; we offset by 12 vertically so the world band
            sits nicely inside the larger 240 globe. */}
        <g clipPath="url(#globeClip)">
          <g className="animate-globe-drift" transform="translate(10, 12)">
            {[0, 220].map((offset) => (
              <g key={offset} transform={`translate(${offset}, 0)`}>
                {CONTINENTS.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="url(#globeLand)"
                    stroke="#334155"
                    strokeWidth="0.4"
                  />
                ))}
                {/* Active-user dots: bright cyan core + soft cyan halo */}
                {GLOBE_DOTS.map(([x, y, delay], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="6" fill="#22d3ee" opacity="0.35" filter="url(#dotGlow)">
                      <animate attributeName="opacity" values="0.15; 0.6; 0.15" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="2" fill="#a5f3fc">
                      <animate attributeName="opacity" values="0.6; 1; 0.6" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </g>
            ))}
          </g>

          {/* Sphere lighting overlay (terminator) */}
          <circle cx="120" cy="120" r="108" fill="url(#globeLight)" />
        </g>

        {/* Rim — bright cyan ring + soft outer fade */}
        <circle cx="120" cy="120" r="108" fill="none" stroke="#22d3ee" strokeWidth="1.6" opacity="0.85" />
        <circle cx="120" cy="120" r="111" fill="none" stroke="#0ea5e9" strokeWidth="2" opacity="0.35" />
        <circle cx="120" cy="120" r="115" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.18" />
      </svg>
    </div>
  );
}
