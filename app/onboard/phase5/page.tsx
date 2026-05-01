'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { SpeechBubble } from '@/components/onboarding/SpeechBubble';
import { ScrollPicker } from '@/components/onboarding/ScrollPicker';
import { ExerciseLocation, MuscleKey, DayKey } from '@/types/onboarding';
import { CheckCircleFullIcon, ClockIcon } from '@/components/ui/AppIcons';

/**
 * Phase 5 — Workout details.
 *
 * Nine steps in order:
 *   0. Have a workout plan? (yes / build me one)
 *   1. Where do you exercise (commercial gym, small, garage, home, bodyweight)
 *   2. Equipment selector (10 options in a 3-col grid)
 *   3. "We'll tailor your workouts" mascot interlude
 *   4. Which muscles did you work out last? (multi-select, body silhouettes)
 *   5. Workout duration (preset cards)
 *   6. Days per week — count tab vs specific-days tab
 *   7. "We'll help you find time" mascot interlude
 *   8. Workout reminder time (hour scroll + AM/PM)
 *
 * Hand-off goes to /onboard/phase6 (placeholder until Phase 6 builds).
 */

const TOTAL_STEPS = 9;

const LOCATION_OPTIONS: { key: ExerciseLocation; label: string; sub: string }[] = [
  { key: 'commercial', label: 'Large commercial gym', sub: "Full equipment, plates for days." },
  { key: 'small_gym',  label: 'Small gym',            sub: 'Most basics, no Smith machine.' },
  { key: 'garage',     label: 'Garage gym',           sub: 'Personal setup, the essentials.' },
  { key: 'home',       label: 'At home',              sub: 'Whatever I keep in my room.' },
  { key: 'bodyweight', label: 'Bodyweight only',      sub: 'No equipment — just me.' },
];

const Icon = (children: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const EQUIP_DUMBBELL = Icon(
  <>
    <rect x="2"  y="9"  width="3"  height="6" rx="0.5" />
    <rect x="19" y="9"  width="3"  height="6" rx="0.5" />
    <rect x="5"  y="10" width="2"  height="4" />
    <rect x="17" y="10" width="2"  height="4" />
    <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5" />
  </>
);
const EQUIP_BARBELL = Icon(
  <>
    <rect x="1"  y="9"  width="2.5" height="6" rx="0.5" />
    <rect x="20.5" y="9" width="2.5" height="6" rx="0.5" />
    <rect x="3.5" y="10.5" width="1.5" height="3" />
    <rect x="19" y="10.5" width="1.5" height="3" />
    <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" />
  </>
);
const EQUIP_KETTLEBELL = Icon(
  <>
    <path d="M9 4h6a2 2 0 012 2v1a3 3 0 01-1 2.2A6 6 0 1118 15a3 3 0 011 2.3V18a2 2 0 01-2 2H7a2 2 0 01-2-2v-.7A3 3 0 016 15 6 6 0 118 9.2 3 3 0 017 7V6a2 2 0 012-2z" />
  </>
);
const EQUIP_BENCH = Icon(
  <>
    <rect x="2" y="9" width="20" height="3" rx="1" />
    <line x1="5" y1="12" x2="5" y2="20" />
    <line x1="19" y1="12" x2="19" y2="20" />
    <line x1="3" y1="20" x2="7" y2="20" />
    <line x1="17" y1="20" x2="21" y2="20" />
  </>
);
const EQUIP_SQUAT_RACK = Icon(
  <>
    <line x1="5"  y1="3" x2="5"  y2="21" />
    <line x1="19" y1="3" x2="19" y2="21" />
    <line x1="2"  y1="9" x2="22" y2="9" />
    <rect x="3"  y="6" width="3" height="2" />
    <rect x="18" y="6" width="3" height="2" />
    <rect x="3"  y="14" width="3" height="2" />
    <rect x="18" y="14" width="3" height="2" />
  </>
);
const EQUIP_PULLUP = Icon(
  <>
    <line x1="3" y1="4" x2="21" y2="4" strokeWidth="2.5" />
    <line x1="5" y1="2" x2="5" y2="6" />
    <line x1="19" y1="2" x2="19" y2="6" />
    <line x1="9" y1="4" x2="9" y2="11" />
    <line x1="15" y1="4" x2="15" y2="11" />
    <circle cx="12" cy="14" r="2.5" />
    <line x1="12" y1="16.5" x2="12" y2="22" />
  </>
);
const EQUIP_CABLE = Icon(
  <>
    <rect x="3" y="3" width="18" height="6" rx="1" />
    <line x1="12" y1="9" x2="12" y2="16" strokeDasharray="2 1.5" />
    <rect x="9" y="16" width="6" height="3" rx="0.5" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </>
);
const EQUIP_CARDIO = Icon(
  <>
    <line x1="3" y1="20" x2="21" y2="20" strokeWidth="2" />
    <path d="M5 17l3-7 4-2 4 5 3 4" />
    <circle cx="11" cy="9" r="1.5" />
  </>
);
const EQUIP_BANDS = Icon(
  <>
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="12" r="3" />
    <path d="M9 12c0-2 6-2 6 0s-6 2-6 0z" />
  </>
);
const EQUIP_BODYWEIGHT = Icon(
  <>
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="14" />
    <line x1="12" y1="14" x2="9" y2="20" />
    <line x1="12" y1="14" x2="15" y2="20" />
    <line x1="6" y1="11" x2="12" y2="11" />
    <line x1="12" y1="11" x2="18" y2="11" />
  </>
);

const EQUIPMENT_OPTIONS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'dumbbells',   label: 'Dumbbells',    icon: EQUIP_DUMBBELL },
  { key: 'barbell',     label: 'Barbell',      icon: EQUIP_BARBELL },
  { key: 'kettlebells', label: 'Kettlebells',  icon: EQUIP_KETTLEBELL },
  { key: 'bench',       label: 'Bench',        icon: EQUIP_BENCH },
  { key: 'squat_rack',  label: 'Squat rack',   icon: EQUIP_SQUAT_RACK },
  { key: 'pullup_bar',  label: 'Pull-up bar',  icon: EQUIP_PULLUP },
  { key: 'cable',       label: 'Cable machine',icon: EQUIP_CABLE },
  { key: 'cardio',      label: 'Cardio',       icon: EQUIP_CARDIO },
  { key: 'bands',       label: 'Bands',        icon: EQUIP_BANDS },
  { key: 'bodyweight',  label: 'Bodyweight',   icon: EQUIP_BODYWEIGHT },
];

const MUSCLE_OPTIONS: { key: MuscleKey; label: string }[] = [
  { key: 'chest',     label: 'Chest' },
  { key: 'arms',      label: 'Arms' },
  { key: 'abs',       label: 'Abs' },
  { key: 'legs',      label: 'Legs' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'back',      label: 'Back' },
];

const DAY_OPTIONS: { key: DayKey; label: string }[] = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

const DURATION_OPTIONS: { value: number; label: string; sub: string }[] = [
  { value: 30,  label: '30 min', sub: 'Quick + efficient.' },
  { value: 45,  label: '45 min', sub: 'A solid session.' },
  { value: 60,  label: '60 min', sub: 'The classic.' },
  { value: 90,  label: '90 min', sub: 'No rush, full focus.' },
  { value: 120, label: '2 hours+', sub: 'I take my time.' },
];

export default function OnboardPhase5Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase6');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase4');
  };

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
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
            <HasPlanStep
              value={draft.hasPlan}
              onChange={(hasPlan) => update({ hasPlan })}
            />
          )}
          {step === 1 && (
            <LocationStep
              value={draft.exerciseLocation}
              onChange={(exerciseLocation) => update({ exerciseLocation })}
            />
          )}
          {step === 2 && (
            <EquipmentStep
              value={draft.equipment || []}
              onChange={(equipment) => update({ equipment })}
            />
          )}
          {step === 3 && <TailorInterludeStep />}
          {step === 4 && (
            <LastMusclesStep
              value={draft.lastMuscles || []}
              onChange={(lastMuscles) => update({ lastMuscles })}
            />
          )}
          {step === 5 && (
            <DurationStep
              value={draft.workoutDuration}
              onChange={(workoutDuration) => update({ workoutDuration })}
            />
          )}
          {step === 6 && (
            <DaysStep
              draft={draft}
              update={update}
            />
          )}
          {step === 7 && <HelpFindTimeStep />}
          {step === 8 && (
            <ReminderStep
              value={draft.workoutReminderTime}
              onChange={(workoutReminderTime) => update({ workoutReminderTime })}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Footer / CTA ────────────────────────────────────────────────────────────

function renderFooter(
  step: number,
  draft: ReturnType<typeof useOnboardingDraft>['draft'],
  next: () => void,
) {
  const daysOk =
    typeof draft.workoutDaysPerWeek === 'number' ||
    (draft.workoutDays && draft.workoutDays.length > 0);
  const canProceed =
    (step === 0 && typeof draft.hasPlan === 'boolean') ||
    (step === 1 && !!draft.exerciseLocation) ||
    (step === 2) || // equipment can be empty (bodyweight)
    (step === 3) ||
    (step === 4) || // last muscles can be empty (skip)
    (step === 5 && typeof draft.workoutDuration === 'number') ||
    (step === 6 && daysOk) ||
    (step === 7) ||
    (step === 8); // reminder time is optional

  const labels: Record<number, string> = {
    0: 'CONTINUE',
    1: 'CONTINUE',
    2: (draft.equipment?.length ?? 0) > 0 ? 'CONTINUE' : 'NO EQUIPMENT',
    3: 'CONTINUE',
    4: (draft.lastMuscles?.length ?? 0) > 0 ? 'CONTINUE' : 'SKIP',
    5: 'CONTINUE',
    6: 'CONTINUE',
    7: 'CONTINUE',
    8: draft.workoutReminderTime ? 'REMIND ME' : 'MAYBE LATER',
  };

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
      {labels[step] || 'CONTINUE'}
    </motion.button>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function MascotRow({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 mt-4 mb-6">
      <div className="flex-shrink-0">
        <PhoenixMascot size={90} />
      </div>
      <SpeechBubble className="flex-1 mb-2">{message}</SpeechBubble>
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function HasPlanStep({
  value,
  onChange,
}: {
  value?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Do you have a workout plan you already follow?" />
      <div className="space-y-2.5 mt-2">
        {[
          { val: true,  label: 'Yes, I have one',     sub: "I'll log my own program." },
          { val: false, label: 'No, build me one',    sub: "Tailor a plan to my goals + equipment." },
        ].map((opt) => {
          const active = value === opt.val;
          return (
            <button
              key={String(opt.val)}
              onClick={() => onChange(opt.val)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-5 py-4 transition-all',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                  {opt.label}
                </span>
                {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
              </div>
              <p className={cn('text-[13px] mt-1', active ? 'text-orange-200/80' : 'text-slate-500')}>
                {opt.sub}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LocationStep({
  value,
  onChange,
}: {
  value?: ExerciseLocation;
  onChange: (v: ExerciseLocation) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Where do you usually work out?" />
      <div className="space-y-2.5 mt-2">
        {LOCATION_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-5 py-4 transition-all',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                  {opt.label}
                </span>
                {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
              </div>
              <p className={cn('text-[13px] mt-1', active ? 'text-orange-200/80' : 'text-slate-500')}>
                {opt.sub}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EquipmentStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (key: string) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="What equipment do you have? You can change this later." />
      <div className="grid grid-cols-3 gap-2.5 mt-2">
        {EQUIPMENT_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={cn(
                'aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 px-2',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_18px_-6px_rgba(249,115,22,0.6)] text-orange-200'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20 text-slate-300',
              )}
            >
              <span className={cn(active ? 'text-orange-300' : 'text-slate-400')}>{opt.icon}</span>
              <span className={cn(
                'text-[11px] font-bold uppercase tracking-wide text-center',
                active ? 'text-white' : 'text-slate-200',
              )}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TailorInterludeStep() {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} greeting />
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        We&apos;ll <span className="text-orange-400">tailor</span><br/>your workouts.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Every set, every rep, every cue is built around your equipment, energy, and weak points.
      </p>
    </div>
  );
}

function LastMusclesStep({
  value,
  onChange,
}: {
  value: MuscleKey[];
  onChange: (v: MuscleKey[]) => void;
}) {
  const toggle = (key: MuscleKey) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Which muscles did you work out last? We'll avoid hammering them again." />
      <div className="grid grid-cols-2 gap-2.5 mt-2">
        {MUSCLE_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={cn(
                'rounded-2xl border-2 transition-all flex items-center gap-3 p-3',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_18px_-6px_rgba(249,115,22,0.6)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <MuscleSilhouette muscle={opt.key} active={active} />
              <span className={cn('font-bold text-[14px]', active ? 'text-white' : 'text-slate-200')}>
                {opt.label}
              </span>
              {active && <CheckCircleFullIcon size={16} className="text-orange-400 ml-auto" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DurationStep({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How long is your typical workout?" />
      <div className="space-y-2 mt-2">
        {DURATION_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-5 py-3.5 transition-all flex items-center justify-between gap-4',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div className="flex items-center gap-3">
                <ClockIcon size={20} className={active ? 'text-orange-300' : 'text-slate-500'} />
                <div>
                  <p className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                    {opt.label}
                  </p>
                  <p className={cn('text-[12px] mt-0.5', active ? 'text-orange-200/80' : 'text-slate-500')}>
                    {opt.sub}
                  </p>
                </div>
              </div>
              {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DaysStep({
  draft,
  update,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  update: ReturnType<typeof useOnboardingDraft>['update'];
}) {
  const [mode, setMode] = useState<'count' | 'specific'>(
    draft.workoutDays?.length ? 'specific' : 'count'
  );

  const setCount = (n: number) => {
    update({ workoutDaysPerWeek: n, workoutDays: undefined });
  };
  const toggleDay = (d: DayKey) => {
    const current = draft.workoutDays || [];
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
    update({ workoutDays: next, workoutDaysPerWeek: undefined });
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How many days a week do you usually train?" />

      {/* Mode tabs */}
      <div className="flex p-1 mt-2 rounded-full bg-[#10101a] border border-white/8 mb-4">
        {([
          { val: 'count' as const,    label: 'Just a number' },
          { val: 'specific' as const, label: 'Pick days' },
        ]).map((tab) => {
          const active = mode === tab.val;
          return (
            <button
              key={tab.val}
              onClick={() => setMode(tab.val)}
              className={cn(
                'flex-1 py-2 rounded-full text-sm font-bold transition-all',
                active
                  ? 'bg-orange-500 text-white shadow-[0_0_16px_-4px_rgba(249,115,22,0.7)]'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === 'count' ? (
        <div className="grid grid-cols-3 gap-2.5">
          {[2, 3, 4, 5, 6, 7].map((n) => {
            const active = draft.workoutDaysPerWeek === n;
            return (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={cn(
                  'aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1',
                  active
                    ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_18px_-6px_rgba(249,115,22,0.6)]'
                    : 'bg-[#10101a] border-white/8 hover:border-white/20',
                )}
              >
                <span className={cn('font-heading text-3xl font-bold tabular-nums', active ? 'text-white' : 'text-slate-200')}>
                  {n}
                </span>
                <span className={cn('text-[10px] uppercase tracking-widest font-bold', active ? 'text-orange-300' : 'text-slate-500')}>
                  {n === 1 ? 'day' : 'days'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_OPTIONS.map((d) => {
            const active = (draft.workoutDays || []).includes(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                className={cn(
                  'aspect-[2/3] rounded-xl border-2 transition-all flex items-center justify-center',
                  active
                    ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_14px_-4px_rgba(249,115,22,0.6)]'
                    : 'bg-[#10101a] border-white/8',
                )}
              >
                <span className={cn('text-[12px] font-bold uppercase', active ? 'text-white' : 'text-slate-300')}>
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HelpFindTimeStep() {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} />
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        We&apos;ll help you<br/><span className="text-orange-400">find time</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Your health is important. Making time for it should feel simple, achievable, and worth showing up for.
      </p>
    </div>
  );
}

function ReminderStep({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  // Default reminder is 9:00 AM if none stored. Stored as 'HH:MM' 24h.
  const parsed = parseTime(value);
  const hour12 = parsed.hour12;
  const period: 'AM' | 'PM' = parsed.period;

  const setHour = (h: number) => {
    onChange(format24(h, period));
  };
  const togglePeriod = () => {
    onChange(format24(hour12, period === 'AM' ? 'PM' : 'AM'));
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Want a reminder before your workout? Pick a time that works." />

      {/* Notification preview — looks like a real iOS-style notification */}
      <div className="mt-2 mx-auto max-w-sm rounded-2xl bg-[#10101a] border border-white/10 p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #fb923c, #dc2626)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-white font-bold text-sm">Outrank</p>
            <p className="text-slate-500 text-[11px] ml-auto">in 2h</p>
          </div>
          <p className="text-slate-200 text-[13px] mt-0.5 font-medium">Time to train</p>
          <p className="text-slate-400 text-[12px] leading-snug">
            Today: chest + shoulders. Bench Press, DB Shoulder Press, Lateral Raise.
          </p>
        </div>
      </div>

      {/* Time display */}
      <div className="mt-8 text-center">
        <p className="font-heading font-bold text-white tabular-nums leading-none" style={{ fontSize: 64 }}>
          <span className={period === 'AM' || period === 'PM' ? 'text-white' : ''}>{hour12}</span>
          <span className="text-orange-400">:00</span>
          <span className="text-orange-400 text-3xl ml-2 align-baseline">{period}</span>
        </p>
      </div>

      {/* Hour scroll picker */}
      <div className="mt-8">
        <ScrollPicker
          value={hour12}
          onChange={setHour}
          min={1}
          max={12}
          step={1}
          majorEvery={3}
        />
      </div>

      {/* AM / PM toggle */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={togglePeriod}
          className="inline-flex p-1 rounded-full bg-[#10101a] border border-white/8"
        >
          {(['AM', 'PM'] as const).map((p) => {
            const active = period === p;
            return (
              <span
                key={p}
                className={cn(
                  'px-6 py-1.5 rounded-full text-sm font-bold transition-all',
                  active
                    ? 'bg-orange-500 text-white shadow-[0_0_18px_-4px_rgba(249,115,22,0.7)]'
                    : 'text-slate-400',
                )}
              >
                {p}
              </span>
            );
          })}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTime(value?: string): { hour12: number; period: 'AM' | 'PM' } {
  // Default 9:00 AM if not set or invalid
  if (!value) return { hour12: 9, period: 'AM' };
  const [hStr] = value.split(':');
  const h24 = parseInt(hStr, 10);
  if (Number.isNaN(h24)) return { hour12: 9, period: 'AM' };
  const period: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, period };
}

function format24(hour12: number, period: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (period === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:00`;
}

// ─── Muscle silhouettes ─────────────────────────────────────────────────────
//
// One front-or-back body silhouette per muscle group with the relevant
// muscle painted in the active color while the rest stays dim. Used in
// the LastMusclesStep grid so each option visually communicates which
// area it represents.

interface SilhouetteProps {
  muscle: MuscleKey;
  active: boolean;
}

function MuscleSilhouette({ muscle, active }: SilhouetteProps) {
  const dim = '#1e293b';
  const dimStroke = '#334155';
  const hot = active ? 'url(#muscleHot)' : '#475569';
  return (
    <svg width="56" height="80" viewBox="0 0 56 80" fill="none" className="flex-shrink-0">
      <defs>
        <linearGradient id="muscleHot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      {/* Base silhouette — body in dim slate */}
      {muscle !== 'back' ? (
        // Front view
        <g fill={dim} stroke={dimStroke} strokeWidth="0.5">
          <circle cx="28" cy="10" r="6" />
          <rect x="25" y="15" width="6" height="3" />
          <path d="M 18 22 Q 16 19 22 18 Q 27 16 28 16 Q 29 16 34 18 Q 40 19 38 22 L 40 36 Q 38 50 36 60 L 20 60 Q 18 50 16 36 Z" />
          <path d="M 18 22 Q 14 32 13 44 L 19 44 Q 20 30 22 22 Z" />
          <path d="M 38 22 Q 42 32 43 44 L 37 44 Q 36 30 34 22 Z" />
          <path d="M 20 60 Q 18 70 19 78 L 26 78 Q 27 70 27 60 Z" />
          <path d="M 36 60 Q 38 70 37 78 L 30 78 Q 29 70 29 60 Z" />
        </g>
      ) : (
        // Back view
        <g fill={dim} stroke={dimStroke} strokeWidth="0.5">
          <circle cx="28" cy="10" r="6" />
          <rect x="25" y="15" width="6" height="3" />
          <path d="M 18 22 Q 16 19 22 18 Q 27 16 28 16 Q 29 16 34 18 Q 40 19 38 22 L 40 36 Q 38 50 36 60 L 20 60 Q 18 50 16 36 Z" />
          <path d="M 18 22 Q 14 32 13 44 L 19 44 Q 20 30 22 22 Z" />
          <path d="M 38 22 Q 42 32 43 44 L 37 44 Q 36 30 34 22 Z" />
          <path d="M 20 60 Q 18 70 19 78 L 26 78 Q 27 70 27 60 Z" />
          <path d="M 36 60 Q 38 70 37 78 L 30 78 Q 29 70 29 60 Z" />
        </g>
      )}

      {/* Hot overlay — only the targeted muscle */}
      {muscle === 'chest' && (
        <g fill={hot}>
          <path d="M 21 22 Q 27 24 28 26 L 28 36 Q 22 35 20 32 Z" />
          <path d="M 35 22 Q 29 24 28 26 L 28 36 Q 34 35 36 32 Z" />
        </g>
      )}
      {muscle === 'arms' && (
        <g fill={hot}>
          {/* Biceps + forearms on both arms */}
          <path d="M 18 22 Q 14 30 14 40 L 19 40 Q 20 30 22 22 Z" />
          <path d="M 38 22 Q 42 30 42 40 L 37 40 Q 36 30 34 22 Z" />
        </g>
      )}
      {muscle === 'abs' && (
        <g fill={hot}>
          <rect x="24" y="38" width="8" height="22" rx="1" />
          <line x1="24" y1="44" x2="32" y2="44" stroke={dimStroke} strokeWidth="0.4" />
          <line x1="24" y1="50" x2="32" y2="50" stroke={dimStroke} strokeWidth="0.4" />
          <line x1="24" y1="56" x2="32" y2="56" stroke={dimStroke} strokeWidth="0.4" />
          <line x1="28" y1="38" x2="28" y2="60" stroke={dimStroke} strokeWidth="0.4" />
        </g>
      )}
      {muscle === 'legs' && (
        <g fill={hot}>
          <path d="M 20 60 Q 18 70 19 78 L 26 78 Q 27 70 27 60 Z" />
          <path d="M 36 60 Q 38 70 37 78 L 30 78 Q 29 70 29 60 Z" />
        </g>
      )}
      {muscle === 'shoulders' && (
        <g fill={hot}>
          <ellipse cx="20" cy="22" rx="5" ry="4" />
          <ellipse cx="36" cy="22" rx="5" ry="4" />
        </g>
      )}
      {muscle === 'back' && (
        <g fill={hot}>
          {/* Lats + traps as a single back area */}
          <path d="M 21 22 Q 18 28 18 38 Q 19 50 22 60 L 28 60 L 28 22 Z" />
          <path d="M 35 22 Q 38 28 38 38 Q 37 50 34 60 L 28 60 L 28 22 Z" />
          {/* Spine line */}
          <line x1="28" y1="22" x2="28" y2="60" stroke="#0f172a" strokeWidth="0.6" />
        </g>
      )}
    </svg>
  );
}
