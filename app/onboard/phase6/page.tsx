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
 * Stylized stick-figure exercise illustration. Each exercise has a
 * unique pose drawn inline as SVG. Kept minimal but recognizable.
 */
function ExerciseIllustration({ id }: { id: ExerciseId }) {
  const stroke = '#fb923c';
  const dim = '#475569';

  if (id === 'pushups') {
    return (
      <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
        <line x1="20" y1="80" x2="160" y2="80" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="8" fill={stroke} />
        <line x1="55" y1="55" x2="120" y2="65" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="120" y1="65" x2="160" y2="65" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="58" y1="55" x2="58" y2="80" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="118" y1="65" x2="125" y2="80" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="155" y1="65" x2="158" y2="80" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'pullups') {
    return (
      <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
        <line x1="20" y1="20" x2="160" y2="20" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="20" x2="30" y2="35" stroke={dim} strokeWidth="2" />
        <line x1="150" y1="20" x2="150" y2="35" stroke={dim} strokeWidth="2" />
        <circle cx="90" cy="50" r="9" fill={stroke} />
        <line x1="90" y1="22" x2="80" y2="48" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="90" y1="22" x2="100" y2="48" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="90" y1="58" x2="90" y2="92" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="90" y1="92" x2="80" y2="110" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="90" y1="92" x2="100" y2="110" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'situps') {
    return (
      <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
        <line x1="20" y1="80" x2="160" y2="80" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="50" r="8" fill={stroke} />
        <line x1="55" y1="55" x2="100" y2="80" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="100" y1="80" x2="120" y2="65" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="120" y1="65" x2="140" y2="80" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === 'bench') {
    return (
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none">
        <rect x="40" y="55" width="100" height="10" rx="2" fill={dim} />
        <line x1="48" y1="65" x2="48" y2="95" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <line x1="132" y1="65" x2="132" y2="95" stroke={dim} strokeWidth="3" strokeLinecap="round" />
        <circle cx="90" cy="48" r="7" fill={stroke} />
        <line x1="60" y1="55" x2="120" y2="55" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        <line x1="74" y1="38" x2="106" y2="38" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="38" x2="60" y2="22" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <line x1="120" y1="38" x2="120" y2="22" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <rect x="48" y="14" width="6" height="14" rx="1" fill={stroke} />
        <rect x="126" y="14" width="6" height="14" rx="1" fill={stroke} />
      </svg>
    );
  }
  if (id === 'squat') {
    return (
      <svg width="180" height="110" viewBox="0 0 180 110" fill="none">
        <line x1="20" y1="100" x2="160" y2="100" stroke={dim} strokeWidth="2" strokeLinecap="round" />
        <circle cx="90" cy="32" r="8" fill={stroke} />
        <line x1="90" y1="40" x2="90" y2="64" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="90" y1="64" x2="78" y2="80" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="78" y1="80" x2="78" y2="100" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="90" y1="64" x2="102" y2="80" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="102" y1="80" x2="102" y2="100" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
        <line x1="60" y1="22" x2="120" y2="22" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
        <rect x="48" y="14" width="6" height="14" rx="1" fill={stroke} />
        <rect x="126" y="14" width="6" height="14" rx="1" fill={stroke} />
      </svg>
    );
  }
  // deadlift
  return (
    <svg width="180" height="110" viewBox="0 0 180 110" fill="none">
      <line x1="20" y1="100" x2="160" y2="100" stroke={dim} strokeWidth="2" strokeLinecap="round" />
      <circle cx="90" cy="38" r="8" fill={stroke} />
      <line x1="90" y1="46" x2="90" y2="68" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      <line x1="90" y1="48" x2="78" y2="78" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="90" y1="48" x2="102" y2="78" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <line x1="90" y1="68" x2="76" y2="98" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      <line x1="90" y1="68" x2="104" y2="98" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      <line x1="55" y1="86" x2="125" y2="86" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
      <circle cx="48" cy="86" r="8" fill={stroke} />
      <circle cx="132" cy="86" r="8" fill={stroke} />
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
              width: 220,
              height: 220,
              background: `radial-gradient(circle, ${rank.color}aa, transparent 65%)`,
              filter: 'blur(28px)',
            }}
          />
          {/* Sparkle rays */}
          <motion.svg
            initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
            animate={{ opacity: revealed ? 0.8 : 0, rotate: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
            width="240"
            height="240"
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
  return (
    <svg width="180" height="200" viewBox="0 0 180 200" fill="none">
      <defs>
        <linearGradient id="rbBig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fef3c7" />
          <stop offset="20%" stopColor={rank.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>
        <linearGradient id="rbBigInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Wing flourishes flanking the badge */}
      <g fill={rank.color} opacity="0.85">
        <path d="M 22 100 Q 36 85 60 92 Q 50 106 32 110 Z" />
        <path d="M 158 100 Q 144 85 120 92 Q 130 106 148 110 Z" />
      </g>
      {/* Wing feather stripes */}
      <g stroke={rank.color} strokeWidth="0.8" fill="none" opacity="0.55">
        <path d="M 28 96 L 56 100" />
        <path d="M 32 104 L 58 106" />
        <path d="M 152 96 L 124 100" />
        <path d="M 148 104 L 122 106" />
      </g>
      {/* Hex badge */}
      <g style={{ filter: `drop-shadow(0 4px 18px ${rank.color}aa)` }}>
        <path
          d="M 90 36 L 132 64 L 132 124 L 90 152 L 48 124 L 48 64 Z"
          fill="url(#rbBig)"
          stroke={rank.color}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner facet shine on top edge */}
        <path d="M 90 36 L 132 64 L 90 80 Z" fill="url(#rbBigInner)" />
        {/* Rank initial */}
        <text x="90" y="106" textAnchor="middle" fontSize="40" fontWeight="bold" fontFamily="ui-monospace,monospace" fill="#ffffff">
          {rank.name[0]}
        </text>
      </g>
      {/* Crown — for top 4 ranks */}
      {RANKS.indexOf(rank) >= 4 && (
        <g fill="#fde047" opacity="0.9">
          <path d="M 70 28 L 78 12 L 90 22 L 102 12 L 110 28 Z" stroke="#7c2d12" strokeWidth="0.5" />
        </g>
      )}
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
 * Stylized rotating globe with lat/long grid and twinkling dots
 * representing active users on different continents. Rotation is a
 * pure CSS transform on the wrapper; the dots use staggered opacity
 * keyframes so they "twinkle" without re-rendering.
 */
function Globe() {
  return (
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* Outer star field */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280" fill="none">
        {[
          [20, 30, 1.2], [50, 18, 0.8], [240, 26, 1], [260, 50, 0.7],
          [22, 230, 0.9], [250, 240, 1.1], [16, 110, 0.6], [266, 140, 0.8],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fef3c7" opacity={0.55 + (i % 3) * 0.15} />
        ))}
      </svg>

      {/* Atmospheric halo */}
      <div
        className="absolute inset-0 m-auto rounded-full pointer-events-none"
        style={{
          width: 240,
          height: 240,
          background: 'radial-gradient(circle, rgba(34,211,238,0.35), rgba(56,189,248,0.15) 40%, transparent 75%)',
          filter: 'blur(18px)',
        }}
      />

      {/* Globe — meridian/parallel grid + dots, rotates slowly */}
      <div className="absolute inset-0 m-auto w-[220px] h-[220px] animate-globe-spin">
        <svg viewBox="0 0 220 220" fill="none" className="w-full h-full">
          {/* Sphere base */}
          <defs>
            <radialGradient id="globeBase" cx="35%" cy="30%" r="65%">
              <stop offset="0%"  stopColor="#1e3a5f" />
              <stop offset="60%" stopColor="#0c1322" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <circle cx="110" cy="110" r="100" fill="url(#globeBase)" stroke="#1e3a5f" strokeWidth="1" />

          {/* Parallels */}
          {[40, 70, 110, 150, 180].map((y) => {
            const r = Math.sqrt(Math.max(0, 100 * 100 - (y - 110) * (y - 110)));
            return r > 0 ? (
              <ellipse
                key={y}
                cx="110"
                cy={y}
                rx={r}
                ry={r * 0.18}
                stroke="#22d3ee"
                strokeWidth="0.6"
                fill="none"
                opacity="0.35"
              />
            ) : null;
          })}

          {/* Meridians */}
          {[0, 30, 60, 90, 120, 150].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const rx = Math.abs(Math.sin(rad) * 100);
            return (
              <ellipse
                key={deg}
                cx="110"
                cy="110"
                rx={rx}
                ry={100}
                stroke="#22d3ee"
                strokeWidth="0.6"
                fill="none"
                opacity="0.3"
              />
            );
          })}

          {/* Active-user dots — small bright spots scattered across the globe */}
          {[
            [50, 80, 0],   [70, 60, 0.4],  [85, 110, 0.8], [120, 75, 1.2],
            [145, 90, 0.2],[160, 120, 0.6],[180, 100, 1.0],[100, 140, 1.4],
            [130, 150, 0.3],[155, 160, 0.7],[60, 130, 1.1],[90, 170, 1.5],
            [105, 95, 0.5],[140, 130, 0.9],[170, 140, 1.3],[75, 90, 0.1],
          ].map(([x, y, delay], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="2.2" fill="#fb923c">
                <animate attributeName="opacity" values="0.3; 1; 0.3" dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
              <circle cx={x} cy={y} r="4.5" fill="#fb923c" opacity="0.4">
                <animate attributeName="opacity" values="0.05; 0.5; 0.05" dur="2.2s" begin={`${delay}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
