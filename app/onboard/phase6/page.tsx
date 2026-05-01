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
 * Filled-body exercise illustrations — proper anatomical proportions
 * (head, neck, shoulders, torso, limbs all painted with thickness),
 * orange-red gradient bodies, dark equipment with weight-plate detail,
 * floor shadows. Side view, looking right.
 */
function ExerciseIllustration({ id }: { id: ExerciseId }) {
  const Body = ({ children }: { children: React.ReactNode }) => (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
      <defs>
        <linearGradient id={`exBody-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fde68a" />
          <stop offset="35%" stopColor="#fb923c" />
          <stop offset="80%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id={`exShine-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`exBar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={`exPlate-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );

  const body = `url(#exBody-${id})`;
  const shine = `url(#exShine-${id})`;
  const bar = `url(#exBar-${id})`;
  const plate = `url(#exPlate-${id})`;

  if (id === 'pushups') {
    return (
      <Body>
        {/* Floor + shadow */}
        <ellipse cx="110" cy="120" rx="80" ry="3" fill="#000" opacity="0.4" />
        <line x1="20" y1="115" x2="200" y2="115" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

        {/* Back leg */}
        <path d="M 36 76 Q 30 88 40 100 L 50 100 Q 46 86 50 76 Z" fill={body} />
        {/* Front leg */}
        <path d="M 50 78 L 58 92 L 62 110 L 70 110 L 70 90 L 60 76 Z" fill={body} />
        {/* Torso (horizontal plank) */}
        <path d="M 56 72 Q 90 66 130 70 Q 144 76 144 84 Q 130 86 90 84 Q 60 80 50 80 Z" fill={body} />
        <path d="M 56 72 Q 90 66 130 70 Q 144 76 144 84 Q 130 86 90 84 Q 60 80 50 80 Z" fill={shine} />
        {/* Glute bump */}
        <ellipse cx="58" cy="76" rx="8" ry="6" fill={body} />
        {/* Head + neck */}
        <circle cx="156" cy="68" r="11" fill={body} />
        <circle cx="156" cy="68" r="11" fill={shine} />
        <rect x="148" y="76" width="14" height="6" fill={body} />
        {/* Front arm — bent down to floor */}
        <path d="M 138 80 L 134 96 Q 132 108 138 114 L 150 114 Q 152 102 152 92 L 144 80 Z" fill={body} />
        {/* Back arm — bent down */}
        <path d="M 70 78 L 70 96 Q 70 108 76 114 L 88 114 Q 88 102 88 92 L 78 78 Z" fill={body} />
      </Body>
    );
  }

  if (id === 'pullups') {
    return (
      <Body>
        {/* Mounting bracket + bar */}
        <rect x="20" y="14" width="180" height="6" rx="1" fill={bar} />
        <rect x="22" y="14" width="180" height="2" fill="#ffffff" opacity="0.2" />
        <rect x="28" y="6" width="6" height="14" fill="#475569" />
        <rect x="186" y="6" width="6" height="14" fill="#475569" />
        {/* Hands gripping bar */}
        <rect x="92" y="18" width="8" height="8" rx="2" fill={body} />
        <rect x="120" y="18" width="8" height="8" rx="2" fill={body} />
        {/* Arms — bent at elbows, hands on bar */}
        <path d="M 92 24 L 80 50 L 84 70 L 92 70 L 100 50 Z" fill={body} />
        <path d="M 128 24 L 140 50 L 136 70 L 128 70 L 120 50 Z" fill={body} />
        {/* Head */}
        <circle cx="110" cy="44" r="11" fill={body} />
        <circle cx="110" cy="44" r="11" fill={shine} />
        {/* Neck + traps */}
        <rect x="103" y="52" width="14" height="6" fill={body} />
        {/* Torso (V-taper) */}
        <path d="M 88 58 Q 110 56 132 58 L 128 92 Q 110 96 92 92 Z" fill={body} />
        <path d="M 88 58 Q 110 56 132 58 L 128 92 Q 110 96 92 92 Z" fill={shine} />
        {/* Pec separation */}
        <line x1="110" y1="58" x2="110" y2="84" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.55" />
        {/* Hips */}
        <rect x="94" y="92" width="32" height="8" rx="2" fill={body} />
        {/* Legs — straight down */}
        <path d="M 94 100 Q 92 116 96 134 L 106 134 Q 108 116 108 100 Z" fill={body} />
        <path d="M 112 100 Q 112 116 114 134 L 124 134 Q 128 116 126 100 Z" fill={body} />
      </Body>
    );
  }

  if (id === 'situps') {
    return (
      <Body>
        {/* Floor + shadow */}
        <ellipse cx="110" cy="124" rx="78" ry="3" fill="#000" opacity="0.4" />
        <line x1="22" y1="118" x2="198" y2="118" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        {/* Mat under person */}
        <rect x="28" y="112" width="120" height="6" rx="2" fill="#1e293b" />

        {/* Bent legs (knees up) */}
        <path d="M 32 90 L 56 76 L 70 88 L 60 110 L 38 112 Z" fill={body} />
        <path d="M 60 110 L 84 110 L 88 88 L 80 76 L 70 80 L 64 96 Z" fill={body} />
        <ellipse cx="74" cy="80" rx="12" ry="6" fill={body} />
        {/* Torso (curling up at angle) */}
        <path d="M 80 86 L 134 56 L 140 70 L 90 100 Z" fill={body} />
        <path d="M 80 86 L 134 56 L 140 70 L 90 100 Z" fill={shine} />
        {/* Abs hint lines */}
        <path d="M 100 92 L 124 74" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.5" />
        <path d="M 96 86 L 122 68" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.5" />
        {/* Head */}
        <circle cx="146" cy="50" r="10" fill={body} />
        <circle cx="146" cy="50" r="10" fill={shine} />
        {/* Arms — crossed across chest */}
        <rect x="106" y="76" width="26" height="6" rx="2" fill={body} transform="rotate(-30 119 79)" />
        <rect x="118" y="64" width="26" height="6" rx="2" fill={body} transform="rotate(-30 131 67)" />
      </Body>
    );
  }

  if (id === 'bench') {
    return (
      <Body>
        {/* Floor */}
        <line x1="14" y1="124" x2="206" y2="124" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        {/* Bench */}
        <rect x="40" y="78" width="140" height="10" rx="2" fill={bar} />
        <rect x="40" y="78" width="140" height="3" fill="#ffffff" opacity="0.2" />
        <rect x="50" y="88" width="4" height="36" fill="#475569" />
        <rect x="166" y="88" width="4" height="36" fill="#475569" />
        <rect x="42" y="120" width="20" height="4" rx="1" fill="#475569" />
        <rect x="158" y="120" width="20" height="4" rx="1" fill="#475569" />

        {/* Body lying on bench */}
        {/* Legs hanging off bench */}
        <path d="M 36 78 L 26 96 L 30 112 L 42 112 L 46 96 L 50 78 Z" fill={body} />
        {/* Torso */}
        <ellipse cx="98" cy="74" rx="44" ry="10" fill={body} />
        <ellipse cx="98" cy="74" rx="44" ry="10" fill={shine} />
        {/* Head */}
        <circle cx="156" cy="68" r="11" fill={body} />
        <circle cx="156" cy="68" r="11" fill={shine} />
        {/* Arms pushing barbell up */}
        <rect x="92" y="44" width="10" height="32" rx="3" fill={body} />
        <rect x="118" y="44" width="10" height="32" rx="3" fill={body} />
        {/* Barbell */}
        <line x1="50" y1="38" x2="170" y2="38" stroke={bar} strokeWidth="6" strokeLinecap="round" />
        <line x1="50" y1="36" x2="170" y2="36" stroke="#ffffff" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
        {/* Plates each side */}
        <ellipse cx="40" cy="38" rx="6" ry="22" fill={plate} stroke="#475569" strokeWidth="0.6" />
        <ellipse cx="180" cy="38" rx="6" ry="22" fill={plate} stroke="#475569" strokeWidth="0.6" />
        <ellipse cx="32" cy="38" rx="4" ry="18" fill={plate} stroke="#475569" strokeWidth="0.5" />
        <ellipse cx="188" cy="38" rx="4" ry="18" fill={plate} stroke="#475569" strokeWidth="0.5" />
      </Body>
    );
  }

  if (id === 'squat') {
    return (
      <Body>
        <line x1="14" y1="130" x2="206" y2="130" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

        {/* Barbell across shoulders + plates */}
        <line x1="40" y1="42" x2="180" y2="42" stroke={bar} strokeWidth="6" strokeLinecap="round" />
        <line x1="40" y1="40" x2="180" y2="40" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
        <ellipse cx="32" cy="42" rx="5" ry="22" fill={plate} stroke="#475569" strokeWidth="0.6" />
        <ellipse cx="188" cy="42" rx="5" ry="22" fill={plate} stroke="#475569" strokeWidth="0.6" />
        <ellipse cx="22" cy="42" rx="4" ry="16" fill={plate} stroke="#475569" strokeWidth="0.5" />
        <ellipse cx="198" cy="42" rx="4" ry="16" fill={plate} stroke="#475569" strokeWidth="0.5" />

        {/* Head */}
        <circle cx="110" cy="32" r="11" fill={body} />
        <circle cx="110" cy="32" r="11" fill={shine} />
        {/* Neck/traps under bar */}
        <rect x="100" y="40" width="20" height="8" fill={body} />
        {/* Shoulders/torso (front-facing, in squat) */}
        <path d="M 80 48 Q 110 46 140 48 L 138 86 Q 130 92 110 92 Q 90 92 82 86 Z" fill={body} />
        <path d="M 80 48 Q 110 46 140 48 L 138 86 Q 130 92 110 92 Q 90 92 82 86 Z" fill={shine} />
        {/* Pec line */}
        <line x1="110" y1="48" x2="110" y2="86" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.55" />
        {/* Arms gripping bar */}
        <path d="M 70 50 L 60 68 L 64 80 L 74 80 L 80 64 Z" fill={body} />
        <path d="M 150 50 L 160 68 L 156 80 L 146 80 L 140 64 Z" fill={body} />
        {/* Quads — bent in squat */}
        <path d="M 86 90 L 70 116 L 84 130 L 100 130 L 100 92 Z" fill={body} />
        <path d="M 134 90 L 150 116 L 136 130 L 120 130 L 120 92 Z" fill={body} />
      </Body>
    );
  }

  // deadlift
  return (
    <Body>
      <line x1="14" y1="130" x2="206" y2="130" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

      {/* Head — slightly forward (typical deadlift posture) */}
      <circle cx="110" cy="36" r="11" fill={body} />
      <circle cx="110" cy="36" r="11" fill={shine} />
      <rect x="103" y="44" width="14" height="6" fill={body} />
      {/* Torso — slightly hinged forward */}
      <path d="M 84 50 L 136 50 L 138 86 Q 124 92 110 92 Q 96 92 82 86 Z" fill={body} />
      <path d="M 84 50 L 136 50 L 138 86 Q 124 92 110 92 Q 96 92 82 86 Z" fill={shine} />
      <line x1="110" y1="50" x2="110" y2="88" stroke="#7f1d1d" strokeWidth="0.6" opacity="0.55" />
      {/* Arms — straight down, holding the bar */}
      <path d="M 78 56 L 70 100 L 84 102 L 92 56 Z" fill={body} />
      <path d="M 142 56 L 150 100 L 136 102 L 128 56 Z" fill={body} />
      {/* Hands gripping bar */}
      <rect x="68" y="100" width="14" height="8" rx="2" fill={body} />
      <rect x="138" y="100" width="14" height="8" rx="2" fill={body} />
      {/* Legs — slight bend */}
      <path d="M 88 90 Q 84 110 88 130 L 100 130 Q 102 110 100 90 Z" fill={body} />
      <path d="M 120 90 Q 118 110 120 130 L 132 130 Q 136 110 132 90 Z" fill={body} />
      {/* Barbell */}
      <line x1="34" y1="106" x2="186" y2="106" stroke={bar} strokeWidth="6" strokeLinecap="round" />
      <line x1="34" y1="104" x2="186" y2="104" stroke="#ffffff" strokeWidth="1" opacity="0.3" />
      {/* Big plates */}
      <circle cx="28" cy="106" r="22" fill={plate} stroke="#475569" strokeWidth="0.7" />
      <circle cx="192" cy="106" r="22" fill={plate} stroke="#475569" strokeWidth="0.7" />
      <circle cx="28" cy="106" r="14" fill="none" stroke="#475569" strokeWidth="0.6" />
      <circle cx="192" cy="106" r="14" fill="none" stroke="#475569" strokeWidth="0.6" />
      <circle cx="28" cy="106" r="3" fill="#475569" />
      <circle cx="192" cy="106" r="3" fill="#475569" />
    </Body>
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

// Simplified continent silhouettes mapped to a 220x220 world strip.
// Not cartographically accurate — they read as continents, that's it.
const CONTINENTS = [
  // North America
  'M 6 28 Q 18 22 32 25 L 48 32 L 52 48 L 50 62 L 40 72 L 30 78 L 20 80 L 10 70 L 6 55 Z',
  // Greenland
  'M 65 18 L 80 18 L 82 32 L 75 38 L 65 35 Z',
  // Central America
  'M 38 78 L 52 80 L 48 95 L 42 92 Z',
  // South America
  'M 48 92 L 60 88 L 66 100 L 70 130 L 65 158 L 55 170 L 50 168 L 42 145 L 44 115 Z',
  // Europe
  'M 100 45 L 130 42 L 140 55 L 135 70 L 110 70 L 100 60 Z',
  // Africa
  'M 102 75 L 138 76 L 142 95 L 140 130 L 130 152 L 120 162 L 110 152 L 100 120 L 98 95 Z',
  // Madagascar
  'M 145 132 L 152 130 L 154 148 L 148 150 Z',
  // Mid-east / Asia mainland
  'M 138 22 L 200 18 L 215 38 L 218 65 L 210 85 L 192 92 L 175 95 L 158 88 L 145 75 L 138 58 Z',
  // India
  'M 162 95 L 178 95 L 180 118 L 170 132 L 162 122 L 158 105 Z',
  // SE Asia / Indonesia / Australia
  'M 180 102 L 200 98 L 218 142 L 215 162 L 198 168 L 180 162 L 178 142 L 178 120 Z',
];

// Active-user dots. Position is in 0..220 (one map width); delay
// staggers their twinkle. They get rendered both at translate(0)
// and translate(220) so they're visible on either side of the loop.
const GLOBE_DOTS: [number, number, number][] = [
  [22, 60, 0],     // West coast US
  [38, 50, 0.5],   // East coast US
  [40, 65, 1],     // Mexico
  [58, 110, 0.3],  // Brazil
  [62, 140, 0.8],  // Argentina
  [108, 60, 1.5],  // UK / N Europe
  [120, 65, 0.2],  // Central Europe
  [128, 90, 1.2],  // Egypt
  [115, 110, 1.7], // Central Africa
  [125, 145, 0.6], // S Africa
  [148, 95, 0.4],  // Middle East
  [170, 110, 1.4], // India
  [185, 60, 0.9],  // China
  [202, 70, 1.6],  // Japan
  [195, 145, 0.1], // Australia
  [185, 125, 1.3], // Indonesia
];

function Globe() {
  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* Star field */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280" fill="none">
        {[
          [20, 30, 1.2], [50, 18, 0.8], [240, 26, 1], [260, 50, 0.7],
          [22, 230, 0.9], [250, 240, 1.1], [16, 110, 0.6], [266, 140, 0.8],
          [120, 14, 0.7], [180, 8, 0.9], [60, 264, 0.7], [220, 270, 0.8],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fef3c7" opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </svg>

      {/* Atmospheric halo behind globe */}
      <div
        className="absolute inset-0 m-auto rounded-full pointer-events-none"
        style={{
          width: 250,
          height: 250,
          background: 'radial-gradient(circle, rgba(34,211,238,0.4), rgba(56,189,248,0.18) 40%, transparent 75%)',
          filter: 'blur(20px)',
        }}
      />

      <svg
        viewBox="0 0 220 220"
        fill="none"
        className="absolute inset-0 m-auto w-[220px] h-[220px]"
        style={{ overflow: 'hidden' }}
      >
        <defs>
          <clipPath id="globeClip">
            <circle cx="110" cy="110" r="98" />
          </clipPath>
          {/* Ocean — deep blue with cyan highlight upper-left */}
          <radialGradient id="globeOcean" cx="35%" cy="30%" r="70%">
            <stop offset="0%"  stopColor="#1e40af" />
            <stop offset="40%" stopColor="#0c4a6e" />
            <stop offset="80%" stopColor="#082f49" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          {/* Continent gradient — earthy green-amber */}
          <linearGradient id="globeLand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#65a30d" />
            <stop offset="60%" stopColor="#3f6212" />
            <stop offset="100%" stopColor="#1a2e05" />
          </linearGradient>
          {/* Day/night terminator — bright at upper-left, fades to dark
              at lower-right. Sells the spherical lighting. */}
          <radialGradient id="globeDayNight" cx="32%" cy="28%" r="75%">
            <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="80%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.7" />
          </radialGradient>
        </defs>

        {/* Ocean base */}
        <circle cx="110" cy="110" r="98" fill="url(#globeOcean)" />

        {/* Drifting continents + dots, clipped to the globe circle.
            Two copies of the world side-by-side give us a seamless
            loop when the parent translates -220 over the period. */}
        <g clipPath="url(#globeClip)">
          <g className="animate-globe-drift">
            {[0, 220].map((offset) => (
              <g key={offset} transform={`translate(${offset}, 0)`}>
                {CONTINENTS.map((d, i) => (
                  <path key={i} d={d} fill="url(#globeLand)" stroke="#3f6212" strokeWidth="0.4" opacity="0.95" />
                ))}
                {GLOBE_DOTS.map(([x, y, delay], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#fb923c" opacity="0.35">
                      <animate attributeName="opacity" values="0.05; 0.55; 0.05" dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
                    </circle>
                    <circle cx={x} cy={y} r="1.6" fill="#fef3c7">
                      <animate attributeName="opacity" values="0.4; 1; 0.4" dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
                    </circle>
                  </g>
                ))}
              </g>
            ))}
          </g>

          {/* Day/night terminator overlay */}
          <circle cx="110" cy="110" r="98" fill="url(#globeDayNight)" />

          {/* Lat/long grid — anchored to the viewer, doesn't rotate */}
          {[40, 70, 110, 150, 180].map((y) => {
            const r = Math.sqrt(Math.max(0, 98 * 98 - (y - 110) * (y - 110)));
            return r > 0 ? (
              <ellipse
                key={y}
                cx="110"
                cy={y}
                rx={r}
                ry={r * 0.18}
                stroke="#22d3ee"
                strokeWidth="0.5"
                fill="none"
                opacity="0.25"
              />
            ) : null;
          })}
          {[0, 30, 60, 90, 120, 150].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rx = Math.abs(Math.sin(rad) * 98);
            return (
              <ellipse
                key={deg}
                cx="110"
                cy="110"
                rx={rx}
                ry={98}
                stroke="#22d3ee"
                strokeWidth="0.5"
                fill="none"
                opacity="0.22"
              />
            );
          })}
        </g>

        {/* Globe rim */}
        <circle cx="110" cy="110" r="98" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.7" />
        <circle cx="110" cy="110" r="98" fill="none" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" style={{ transform: 'translate(0.5px, 0.5px)' }} />
      </svg>
    </div>
  );
}
