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

// Each equipment icon is a colored-fill SVG with depth shading. Renders
// in active orange tone when selected, otherwise muted slate.
function EquipIcon({
  active,
  color,
  children,
}: {
  active: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const fill = active ? '#fb923c' : color;
  return (
    <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
      <g style={{ color: fill }}>{children}</g>
    </svg>
  );
}

const equipDumbbell = (active: boolean) => (
  <EquipIcon active={active} color="#94a3b8">
    <rect x="2"  y="11" width="4"  height="10" rx="1" fill="currentColor" />
    <rect x="26" y="11" width="4"  height="10" rx="1" fill="currentColor" />
    <rect x="6"  y="13" width="2.5" height="6" fill="currentColor" opacity="0.7" />
    <rect x="23.5" y="13" width="2.5" height="6" fill="currentColor" opacity="0.7" />
    <rect x="8.5" y="14.5" width="15" height="3" rx="0.5" fill="currentColor" />
    <rect x="2"  y="11" width="4" height="2" fill="#ffffff" opacity="0.18" />
    <rect x="26" y="11" width="4" height="2" fill="#ffffff" opacity="0.18" />
  </EquipIcon>
);
const equipBarbell = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    <rect x="0.5" y="9.5" width="3.5" height="13" rx="0.7" fill="currentColor" />
    <rect x="28" y="9.5" width="3.5" height="13" rx="0.7" fill="currentColor" />
    <rect x="4.5" y="11.5" width="2.5" height="9" fill="currentColor" opacity="0.7" />
    <rect x="25" y="11.5" width="2.5" height="9" fill="currentColor" opacity="0.7" />
    <rect x="7" y="14.5" width="18" height="3" rx="0.5" fill="currentColor" />
    <rect x="0.5" y="9.5" width="3.5" height="2.5" fill="#ffffff" opacity="0.2" />
  </EquipIcon>
);
const equipKettlebell = (active: boolean) => (
  <EquipIcon active={active} color="#94a3b8">
    <path d="M11 5h10c1.1 0 2 .9 2 2v1a3 3 0 01-1.5 2.6 8 8 0 11-11 0A3 3 0 019 8V7c0-1.1.9-2 2-2z" fill="currentColor" />
    <ellipse cx="16" cy="13" rx="3.5" ry="1.5" fill="#ffffff" opacity="0.25" />
    <ellipse cx="13" cy="20" rx="2" ry="1" fill="#ffffff" opacity="0.18" />
  </EquipIcon>
);
const equipBench = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    <rect x="2" y="11" width="28" height="5" rx="1.5" fill="currentColor" />
    <rect x="2" y="11" width="28" height="2" fill="#ffffff" opacity="0.2" />
    <rect x="5" y="16" width="2.5" height="11" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="24.5" y="16" width="2.5" height="11" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="3" y="26" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
    <rect x="23" y="26" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
  </EquipIcon>
);
const equipSquatRack = (active: boolean) => (
  <EquipIcon active={active} color="#94a3b8">
    <rect x="4" y="3" width="2.5" height="26" rx="0.5" fill="currentColor" />
    <rect x="25.5" y="3" width="2.5" height="26" rx="0.5" fill="currentColor" />
    <rect x="2" y="6" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="23" y="6" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="2" y="13" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="23" y="13" width="7" height="2" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="6.5" y="11" width="19" height="2" rx="0.5" fill="currentColor" />
  </EquipIcon>
);
const equipPullup = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    <rect x="3" y="3" width="26" height="2.5" rx="0.5" fill="currentColor" />
    <rect x="3" y="3" width="26" height="1" fill="#ffffff" opacity="0.2" />
    <rect x="6" y="2" width="2" height="6" rx="0.3" fill="currentColor" opacity="0.85" />
    <rect x="24" y="2" width="2" height="6" rx="0.3" fill="currentColor" opacity="0.85" />
    <rect x="11.5" y="5.5" width="1.5" height="9" rx="0.4" fill="currentColor" />
    <rect x="19" y="5.5" width="1.5" height="9" rx="0.4" fill="currentColor" />
    <circle cx="12.25" cy="14.5" r="0.6" fill="currentColor" opacity="0.5" />
    <circle cx="19.75" cy="14.5" r="0.6" fill="currentColor" opacity="0.5" />
    <circle cx="16" cy="20" r="3.5" fill="currentColor" opacity="0.85" />
    <rect x="15.25" y="22" width="1.5" height="8" rx="0.4" fill="currentColor" opacity="0.7" />
  </EquipIcon>
);
const equipCable = (active: boolean) => (
  <EquipIcon active={active} color="#94a3b8">
    <rect x="3" y="3" width="26" height="8" rx="1.5" fill="currentColor" />
    <rect x="3" y="3" width="26" height="2" fill="#ffffff" opacity="0.2" />
    <line x1="16" y1="11" x2="16" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.7" />
    <rect x="11" y="20" width="10" height="3.5" rx="0.7" fill="currentColor" opacity="0.85" />
    <rect x="2" y="28" width="28" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
  </EquipIcon>
);
const equipCardio = (active: boolean) => (
  <EquipIcon active={active} color="#22c55e">
    <rect x="2" y="24" width="28" height="3.5" rx="1" fill="currentColor" opacity="0.85" />
    <rect x="2" y="24" width="28" height="1.5" fill="#ffffff" opacity="0.2" />
    <path d="M5 23l4-9 5-3 5 7 4 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="14" cy="11" r="2" fill="currentColor" />
  </EquipIcon>
);
const equipBands = (active: boolean) => (
  <EquipIcon active={active} color="#a855f7">
    <circle cx="7" cy="16" r="4" fill="currentColor" />
    <circle cx="7" cy="16" r="2" fill="#0c0c14" />
    <circle cx="25" cy="16" r="4" fill="currentColor" />
    <circle cx="25" cy="16" r="2" fill="#0c0c14" />
    <path d="M11 14c0-3 10-3 10 2 0 5-10 5-10 0z" fill="currentColor" opacity="0.6" />
  </EquipIcon>
);
const equipBodyweight = (active: boolean) => (
  <EquipIcon active={active} color="#fbbf24">
    <circle cx="16" cy="6" r="3" fill="currentColor" />
    <rect x="14.5" y="9.5" width="3" height="10" rx="1" fill="currentColor" />
    <rect x="6" y="13" width="20" height="2.5" rx="1" fill="currentColor" opacity="0.85" />
    <path d="M14 19l-4 9h2l3-7" fill="currentColor" />
    <path d="M18 19l4 9h-2l-3-7" fill="currentColor" />
  </EquipIcon>
);

const EQUIPMENT_OPTIONS: { key: string; label: string; renderIcon: (active: boolean) => React.ReactNode }[] = [
  { key: 'dumbbells',   label: 'Dumbbells',     renderIcon: equipDumbbell },
  { key: 'barbell',     label: 'Barbell',       renderIcon: equipBarbell },
  { key: 'kettlebells', label: 'Kettlebells',   renderIcon: equipKettlebell },
  { key: 'bench',       label: 'Bench',         renderIcon: equipBench },
  { key: 'squat_rack',  label: 'Squat rack',    renderIcon: equipSquatRack },
  { key: 'pullup_bar',  label: 'Pull-up bar',   renderIcon: equipPullup },
  { key: 'cable',       label: 'Cable machine', renderIcon: equipCable },
  { key: 'cardio',      label: 'Cardio',        renderIcon: equipCardio },
  { key: 'bands',       label: 'Bands',         renderIcon: equipBands },
  { key: 'bodyweight',  label: 'Bodyweight',    renderIcon: equipBodyweight },
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
              {opt.renderIcon(active)}
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

/**
 * Cleaner human silhouette with the targeted muscle highlighted.
 * Single continuous outline so it reads as a real body, not a
 * collection of blocks.
 */
function MuscleSilhouette({ muscle, active }: SilhouetteProps) {
  const dim = '#334155';
  const dimStroke = '#1e293b';
  const hot = active ? 'url(#muscleHot)' : '#64748b';

  // Single continuous figure — head at top, tapered torso, smooth
  // arms hanging at the sides, legs slightly apart.
  const SIL = `
    M 28 4
    C 23 4  20 8  20 13
    C 20 17  22 20  24 22
    L 24 24
    C 19 24  14 27  11 32
    C 9 36  9 38  10 40
    L 12 44
    C 11 47  10 52  10 58
    L 11 70
    C 11 73  12 75  13 75
    L 16 75
    C 17 75  17 73  17 71
    L 16 60
    L 18 60
    L 20 70
    C 20 75  20 76  20 76
    L 22 76
    Q 23 76  23 75
    L 23 26
    L 25 26
    L 25 32
    Q 24 36  24 42
    L 24 60
    C 24 64  25 67  26 70
    L 26 76
    C 26 78  27 78  28 78
    L 29 78
    C 30 78  31 78  31 76
    L 31 70
    C 32 67  33 64  33 60
    L 33 42
    Q 33 36  32 32
    L 32 26
    L 34 26
    L 34 75
    Q 34 76  35 76
    L 37 76
    C 37 76  37 75  37 70
    L 39 60
    L 41 60
    L 40 71
    C 40 73  40 75  41 75
    L 44 75
    C 45 75  46 73  46 70
    L 47 58
    C 47 52  46 47  45 44
    L 47 40
    C 48 38  48 36  46 32
    C 43 27  38 24  33 24
    L 33 22
    C 35 20  37 17  37 13
    C 37 8  33 4  28 4
    Z`;

  return (
    <svg width="50" height="76" viewBox="0 0 56 80" fill="none" className="flex-shrink-0">
      <defs>
        <linearGradient id={`muscleHot-${muscle}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <clipPath id={`muscleClip-${muscle}`}>
          <path d={SIL} />
        </clipPath>
      </defs>
      {/* Base silhouette */}
      <path d={SIL} fill={dim} stroke={dimStroke} strokeWidth="0.5" />

      {/* Highlighted muscle area, clipped to silhouette */}
      <g clipPath={`url(#muscleClip-${muscle})`}>
        {muscle === 'chest' && (
          <>
            <ellipse cx="22" cy="32" rx="7" ry="6" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <ellipse cx="34" cy="32" rx="7" ry="6" fill={active ? `url(#muscleHot-${muscle})` : hot} />
          </>
        )}
        {muscle === 'arms' && (
          <>
            <ellipse cx="13" cy="38" rx="4" ry="9" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <ellipse cx="43" cy="38" rx="4" ry="9" fill={active ? `url(#muscleHot-${muscle})` : hot} />
          </>
        )}
        {muscle === 'abs' && (
          <rect x="23" y="38" width="10" height="20" rx="1" fill={active ? `url(#muscleHot-${muscle})` : hot} />
        )}
        {muscle === 'legs' && (
          <>
            <ellipse cx="20" cy="68" rx="5" ry="11" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <ellipse cx="36" cy="68" rx="5" ry="11" fill={active ? `url(#muscleHot-${muscle})` : hot} />
          </>
        )}
        {muscle === 'shoulders' && (
          <>
            <ellipse cx="14" cy="26" rx="5" ry="5" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <ellipse cx="42" cy="26" rx="5" ry="5" fill={active ? `url(#muscleHot-${muscle})` : hot} />
          </>
        )}
        {muscle === 'back' && (
          <>
            <path d="M 16 28 Q 12 40 14 56 L 28 56 L 28 28 Z" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <path d="M 40 28 Q 44 40 42 56 L 28 56 L 28 28 Z" fill={active ? `url(#muscleHot-${muscle})` : hot} />
            <line x1="28" y1="28" x2="28" y2="56" stroke="#0f172a" strokeWidth="0.6" opacity="0.6" />
          </>
        )}
      </g>
    </svg>
  );
}
