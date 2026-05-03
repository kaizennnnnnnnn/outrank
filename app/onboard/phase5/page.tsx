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

// Recognizable equipment icons with depth + the active orange wash.
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
    <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
      <g style={{ color: fill }}>{children}</g>
    </svg>
  );
}

// Classic dumbbell — two large hex weight plates connected by a thin
// short grip in the middle. Distinct from a barbell by being SHORT.
const equipDumbbell = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Left weight stack: large hex */}
    <path d="M3 16l3-5h4l3 5-3 5h-4z" fill="currentColor" />
    {/* Right weight stack */}
    <path d="M19 16l3-5h4l3 5-3 5h-4z" fill="currentColor" />
    {/* Inner darker hex (shading) */}
    <path d="M5.5 16l1.5-2.5h2L10.5 16 9 18.5h-2z" fill="#0c0c14" opacity="0.3" />
    <path d="M21.5 16l1.5-2.5h2L26.5 16 25 18.5h-2z" fill="#0c0c14" opacity="0.3" />
    {/* Grip — short bar between */}
    <rect x="13" y="14.5" width="6" height="3" fill="currentColor" />
    {/* Grip ridges */}
    <line x1="14.5" y1="15" x2="14.5" y2="17" stroke="#0c0c14" strokeWidth="0.4" opacity="0.5" />
    <line x1="16" y1="15" x2="16" y2="17" stroke="#0c0c14" strokeWidth="0.4" opacity="0.5" />
    <line x1="17.5" y1="15" x2="17.5" y2="17" stroke="#0c0c14" strokeWidth="0.4" opacity="0.5" />
  </EquipIcon>
);

// Barbell — long thin bar with stacked plates on each end.
const equipBarbell = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Long bar */}
    <rect x="2" y="15" width="28" height="2" rx="0.5" fill="currentColor" />
    {/* Left plates (stacked) */}
    <rect x="3" y="9" width="3" height="14" rx="0.5" fill="currentColor" />
    <rect x="6.5" y="11" width="2.5" height="10" rx="0.5" fill="currentColor" />
    <rect x="9.5" y="12.5" width="1.5" height="7" rx="0.3" fill="currentColor" opacity="0.85" />
    {/* Right plates (stacked) */}
    <rect x="26" y="9" width="3" height="14" rx="0.5" fill="currentColor" />
    <rect x="23" y="11" width="2.5" height="10" rx="0.5" fill="currentColor" />
    <rect x="21" y="12.5" width="1.5" height="7" rx="0.3" fill="currentColor" opacity="0.85" />
    {/* Top highlight on bar */}
    <line x1="2" y1="15" x2="30" y2="15" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
  </EquipIcon>
);

// Kettlebell — iconic bell shape with U handle on top.
const equipKettlebell = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* U-shaped handle */}
    <path
      d="M11 9c0-3 2-5 5-5s5 2 5 5v3"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Bell body — round bottom, narrows at neck */}
    <ellipse cx="16" cy="20" rx="9" ry="8" fill="currentColor" />
    {/* Neck (where handle meets body) */}
    <rect x="13" y="11" width="6" height="3" fill="currentColor" />
    {/* Body shine */}
    <ellipse cx="13" cy="17" rx="3" ry="2.5" fill="#ffffff" opacity="0.25" />
    {/* Base shadow */}
    <ellipse cx="16" cy="27" rx="6" ry="1" fill="#0c0c14" opacity="0.3" />
  </EquipIcon>
);

// Bench — side view with seat pad + 2 visible legs.
const equipBench = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Pad */}
    <rect x="3" y="11" width="26" height="4" rx="1.2" fill="currentColor" />
    {/* Pad shine */}
    <rect x="3" y="11" width="26" height="1.5" fill="#ffffff" opacity="0.25" />
    {/* Backrest support post (small angled piece) */}
    <rect x="25" y="6" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.9" />
    {/* Legs — A-frame */}
    <line x1="6" y1="15" x2="4" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6" y1="15" x2="9" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26" y1="15" x2="23" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26" y1="15" x2="28" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Floor */}
    <line x1="2" y1="27" x2="30" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
  </EquipIcon>
);

// Squat rack — two TALL posts + horizontal bar + visible J-hooks.
const equipSquatRack = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Vertical posts (clearly tall) */}
    <rect x="4" y="3" width="3" height="26" rx="0.5" fill="currentColor" />
    <rect x="25" y="3" width="3" height="26" rx="0.5" fill="currentColor" />
    {/* Top horizontal connector */}
    <rect x="3" y="3" width="26" height="2" rx="0.3" fill="currentColor" />
    {/* J-hooks — visible little extensions sticking inward */}
    <path d="M7 11h3v2H8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M25 11h-3v2h2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Loaded barbell across */}
    <rect x="6" y="11.5" width="20" height="1.8" rx="0.3" fill="currentColor" opacity="0.95" />
    {/* Plates on bar */}
    <rect x="7" y="9" width="2" height="7" rx="0.3" fill="currentColor" />
    <rect x="23" y="9" width="2" height="7" rx="0.3" fill="currentColor" />
    {/* Lower hook */}
    <path d="M7 19h3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M25 19h-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* Floor */}
    <line x1="2" y1="29" x2="30" y2="29" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </EquipIcon>
);

// Pull-up bar — clean horizontal bar with mounting brackets and grip
// hand markers below.
const equipPullup = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Mount brackets on wall */}
    <rect x="3" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="26" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.85" />
    {/* Wall mount plates */}
    <rect x="2" y="6" width="2" height="8" rx="0.3" fill="currentColor" opacity="0.6" />
    <rect x="28" y="6" width="2" height="8" rx="0.3" fill="currentColor" opacity="0.6" />
    {/* The bar itself */}
    <rect x="6" y="9.5" width="20" height="2.5" rx="1" fill="currentColor" />
    {/* Bar shine */}
    <line x1="6" y1="10" x2="26" y2="10" stroke="#ffffff" strokeWidth="0.5" opacity="0.3" />
    {/* Grip marks (where hands would go) */}
    <circle cx="11" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
    <circle cx="21" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
    {/* Hanging chains/handles */}
    <line x1="11" y1="14.5" x2="11" y2="22" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1" opacity="0.5" />
    <line x1="21" y1="14.5" x2="21" y2="22" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1" opacity="0.5" />
  </EquipIcon>
);

// Cable machine — tall column + pulley wheel at top + cable + handle.
const equipCable = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Tower body */}
    <rect x="11" y="4" width="10" height="18" rx="1" fill="currentColor" />
    {/* Tower shine */}
    <rect x="11" y="4" width="10" height="2" fill="#ffffff" opacity="0.25" />
    {/* Pulley wheel at top */}
    <circle cx="16" cy="6" r="2.5" fill="currentColor" stroke="#0c0c14" strokeWidth="0.5" />
    <circle cx="16" cy="6" r="1" fill="#0c0c14" opacity="0.4" />
    {/* Cable hanging down */}
    <line x1="16" y1="8.5" x2="16" y2="22" stroke="currentColor" strokeWidth="0.8" />
    {/* Handle at bottom */}
    <rect x="13" y="22" width="6" height="2.5" rx="0.4" fill="currentColor" />
    {/* Weight stack indicator (lines on tower) */}
    <line x1="13" y1="11" x2="19" y2="11" stroke="#0c0c14" strokeWidth="0.5" opacity="0.4" />
    <line x1="13" y1="14" x2="19" y2="14" stroke="#0c0c14" strokeWidth="0.5" opacity="0.4" />
    <line x1="13" y1="17" x2="19" y2="17" stroke="#0c0c14" strokeWidth="0.5" opacity="0.4" />
    {/* Floor */}
    <line x1="2" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </EquipIcon>
);

// Treadmill — running surface + console + side rails.
const equipCardio = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Running deck */}
    <path d="M3 22l4-3h18l4 3v3H3z" fill="currentColor" />
    {/* Belt lines */}
    <line x1="9" y1="22" x2="11" y2="20" stroke="#0c0c14" strokeWidth="0.5" opacity="0.5" />
    <line x1="15" y1="22" x2="17" y2="20" stroke="#0c0c14" strokeWidth="0.5" opacity="0.5" />
    <line x1="21" y1="22" x2="23" y2="20" stroke="#0c0c14" strokeWidth="0.5" opacity="0.5" />
    {/* Front motor cover */}
    <rect x="22" y="17" width="6" height="2.5" fill="currentColor" opacity="0.85" />
    {/* Vertical console arm */}
    <rect x="23" y="6" width="2" height="11" fill="currentColor" />
    {/* Console screen */}
    <rect x="20" y="4" width="8" height="5" rx="1" fill="currentColor" />
    <rect x="21" y="5" width="6" height="2" fill="#0c0c14" opacity="0.5" />
    {/* Side rail */}
    <rect x="3" y="14" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.85" />
  </EquipIcon>
);

// Resistance band — stretched band with two D-handles on the ends.
const equipBands = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Left D-handle */}
    <path d="M2 12c0-3 4-3 4 0v8c0 3-4 3-4 0z" fill="currentColor" />
    <ellipse cx="4" cy="16" rx="0.8" ry="3" fill="#0c0c14" opacity="0.4" />
    {/* Right D-handle */}
    <path d="M30 12c0-3-4-3-4 0v8c0 3 4 3 4 0z" fill="currentColor" />
    <ellipse cx="28" cy="16" rx="0.8" ry="3" fill="#0c0c14" opacity="0.4" />
    {/* Stretchy band — wavy line connecting handles */}
    <path d="M6 16c4-3 8 3 12 0s4-3 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Band texture lines */}
    <path d="M6 17c4-3 8 3 12 0s4-3 8 0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" strokeLinecap="round" />
  </EquipIcon>
);

// Bodyweight — clear standing person with arms up
const equipBodyweight = (active: boolean) => (
  <EquipIcon active={active} color="#cbd5e1">
    {/* Head */}
    <circle cx="16" cy="6" r="2.5" fill="currentColor" />
    {/* Body */}
    <rect x="14.5" y="9" width="3" height="9" rx="0.5" fill="currentColor" />
    {/* Arms raised in V */}
    <line x1="15" y1="10" x2="9" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="17" y1="10" x2="23" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Legs apart */}
    <line x1="15.5" y1="18" x2="11" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="16.5" y1="18" x2="21" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

function MascotRow({ message }: { message: React.ReactNode }) { /* phoenix nods on each step mount */
  return (
    <div className="flex items-end gap-3 mt-4 mb-6">
      <div className="flex-shrink-0">
        <PhoenixMascot size={90} react={1} />
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
        We&apos;ll <span className="text-orange-400">tailor</span><br/>everything.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Workouts, sleep targets, water goals, focus blocks and step counts — all built around your equipment, energy, and weakest pillar.
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
        Workouts, water nudges, screen-off windows, bedtime — slotted into your day so showing up feels simple instead of crammed.
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
      <MascotRow message="Want a reminder before your workout? We'll set up sleep, water and focus nudges later." />

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
 * Plain standing human silhouette. The muscle the card REPRESENTS is
 * always painted red — the user shouldn't have to tap to see what
 * the card means. The `active` state controls overall card brightness
 * (handled outside via the orange border + glow), not the muscle color.
 */
function MuscleSilhouette({ muscle, active }: SilhouetteProps) {
  const dim = '#475569';
  // Pre-colored: dimmer red on inactive cards, brighter red on active.
  const HOT = active ? '#ef4444' : '#dc2626';

  // Per-muscle: returns HOT if THIS card represents this muscle.
  const isThis = (m: MuscleKey) => muscle === m;

  return (
    <svg width="48" height="80" viewBox="0 0 56 80" fill="none" className="flex-shrink-0">
      {/* Head */}
      <circle cx="28" cy="9" r="6" fill={dim} />
      {/* Neck */}
      <rect x="26" y="14" width="4" height="3" fill={dim} />

      {/* Shoulders / deltoids — always shown */}
      <ellipse cx="17" cy="20" rx="4" ry="3.5" fill={isThis('shoulders') ? HOT : dim} />
      <ellipse cx="39" cy="20" rx="4" ry="3.5" fill={isThis('shoulders') ? HOT : dim} />

      {/* Torso — base in slate, replaced by red if muscle === 'back' */}
      <path
        d="M 18 19 L 38 19 L 36 48 L 20 48 Z"
        fill={isThis('back') ? HOT : dim}
      />
      {/* Chest highlight on top of torso (always when card is chest) */}
      {isThis('chest') && (
        <>
          <ellipse cx="23" cy="26" rx="5" ry="4" fill={HOT} />
          <ellipse cx="33" cy="26" rx="5" ry="4" fill={HOT} />
        </>
      )}
      {/* Abs highlight */}
      {isThis('abs') && (
        <rect x="24" y="30" width="8" height="16" rx="1" fill={HOT} />
      )}
      {/* Spine line for back-card emphasis */}
      {isThis('back') && (
        <line x1="28" y1="19" x2="28" y2="48" stroke="#0c0c14" strokeWidth="0.7" opacity="0.6" />
      )}

      {/* Arms — clearly separate, painted red if card is 'arms' */}
      <rect x="13" y="20" width="3.5" height="28" rx="1.5" fill={isThis('arms') ? HOT : dim} />
      <rect x="39.5" y="20" width="3.5" height="28" rx="1.5" fill={isThis('arms') ? HOT : dim} />

      {/* Legs */}
      <rect x="20" y="48" width="6" height="28" rx="1.5" fill={isThis('legs') ? HOT : dim} />
      <rect x="30" y="48" width="6" height="28" rx="1.5" fill={isThis('legs') ? HOT : dim} />

      {/* Feet */}
      <ellipse cx="23" cy="77" rx="3.5" ry="1.5" fill={dim} />
      <ellipse cx="33" cy="77" rx="3.5" ry="1.5" fill={dim} />
    </svg>
  );
}
