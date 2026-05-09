'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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

// Recognizable equipment icons. Active state inks the strokes/fills with the
// editorial accent; inactive uses ink-60. Renders match the legacy SVG paths
// so the silhouettes stay recognizable.
function EquipIcon({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const fill = active ? 'var(--b-accent)' : 'var(--b-ink-60)';
  return (
    <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
      <g style={{ color: fill }}>{children}</g>
    </svg>
  );
}

// Classic dumbbell — two large hex weight plates connected by a thin
// short grip in the middle. Distinct from a barbell by being SHORT.
const equipDumbbell = (active: boolean) => (
  <EquipIcon active={active}>
    <path d="M3 16l3-5h4l3 5-3 5h-4z" fill="currentColor" />
    <path d="M19 16l3-5h4l3 5-3 5h-4z" fill="currentColor" />
    <rect x="13" y="14.5" width="6" height="3" fill="currentColor" />
  </EquipIcon>
);

// Barbell — long thin bar with stacked plates on each end.
const equipBarbell = (active: boolean) => (
  <EquipIcon active={active}>
    <rect x="2" y="15" width="28" height="2" rx="0.5" fill="currentColor" />
    <rect x="3" y="9" width="3" height="14" rx="0.5" fill="currentColor" />
    <rect x="6.5" y="11" width="2.5" height="10" rx="0.5" fill="currentColor" />
    <rect x="9.5" y="12.5" width="1.5" height="7" rx="0.3" fill="currentColor" opacity="0.85" />
    <rect x="26" y="9" width="3" height="14" rx="0.5" fill="currentColor" />
    <rect x="23" y="11" width="2.5" height="10" rx="0.5" fill="currentColor" />
    <rect x="21" y="12.5" width="1.5" height="7" rx="0.3" fill="currentColor" opacity="0.85" />
  </EquipIcon>
);

// Kettlebell — iconic bell shape with U handle on top.
const equipKettlebell = (active: boolean) => (
  <EquipIcon active={active}>
    <path
      d="M11 9c0-3 2-5 5-5s5 2 5 5v3"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    <ellipse cx="16" cy="20" rx="9" ry="8" fill="currentColor" />
    <rect x="13" y="11" width="6" height="3" fill="currentColor" />
  </EquipIcon>
);

// Bench — side view with seat pad + 2 visible legs.
const equipBench = (active: boolean) => (
  <EquipIcon active={active}>
    <rect x="3" y="11" width="26" height="4" rx="1.2" fill="currentColor" />
    <rect x="25" y="6" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.9" />
    <line x1="6" y1="15" x2="4" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="6" y1="15" x2="9" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26" y1="15" x2="23" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26" y1="15" x2="28" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="2" y1="27" x2="30" y2="27" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
  </EquipIcon>
);

// Squat rack — two TALL posts + horizontal bar + visible J-hooks.
const equipSquatRack = (active: boolean) => (
  <EquipIcon active={active}>
    <rect x="4" y="3" width="3" height="26" rx="0.5" fill="currentColor" />
    <rect x="25" y="3" width="3" height="26" rx="0.5" fill="currentColor" />
    <rect x="3" y="3" width="26" height="2" rx="0.3" fill="currentColor" />
    <path d="M7 11h3v2H8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M25 11h-3v2h2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <rect x="6" y="11.5" width="20" height="1.8" rx="0.3" fill="currentColor" opacity="0.95" />
    <rect x="7" y="9" width="2" height="7" rx="0.3" fill="currentColor" />
    <rect x="23" y="9" width="2" height="7" rx="0.3" fill="currentColor" />
    <path d="M7 19h3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M25 19h-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <line x1="2" y1="29" x2="30" y2="29" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </EquipIcon>
);

// Pull-up bar — clean horizontal bar with mounting brackets and grip
// hand markers below.
const equipPullup = (active: boolean) => (
  <EquipIcon active={active}>
    <rect x="3" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="26" y="6" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.85" />
    <rect x="2" y="6" width="2" height="8" rx="0.3" fill="currentColor" opacity="0.6" />
    <rect x="28" y="6" width="2" height="8" rx="0.3" fill="currentColor" opacity="0.6" />
    <rect x="6" y="9.5" width="20" height="2.5" rx="1" fill="currentColor" />
    <circle cx="11" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
    <circle cx="21" cy="13.5" r="1" fill="currentColor" opacity="0.7" />
    <line x1="11" y1="14.5" x2="11" y2="22" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1" opacity="0.5" />
    <line x1="21" y1="14.5" x2="21" y2="22" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 1" opacity="0.5" />
  </EquipIcon>
);

// Cable machine — tall column + pulley wheel at top + cable + handle.
const equipCable = (active: boolean) => (
  <EquipIcon active={active}>
    <rect x="11" y="4" width="10" height="18" rx="1" fill="currentColor" />
    <circle cx="16" cy="6" r="2.5" fill="currentColor" stroke="var(--b-paper)" strokeWidth="0.5" />
    <line x1="16" y1="8.5" x2="16" y2="22" stroke="currentColor" strokeWidth="0.8" />
    <rect x="13" y="22" width="6" height="2.5" rx="0.4" fill="currentColor" />
    <line x1="2" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.4" />
  </EquipIcon>
);

// Treadmill — running surface + console + side rails.
const equipCardio = (active: boolean) => (
  <EquipIcon active={active}>
    <path d="M3 22l4-3h18l4 3v3H3z" fill="currentColor" />
    <rect x="22" y="17" width="6" height="2.5" fill="currentColor" opacity="0.85" />
    <rect x="23" y="6" width="2" height="11" fill="currentColor" />
    <rect x="20" y="4" width="8" height="5" rx="1" fill="currentColor" />
    <rect x="3" y="14" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.85" />
  </EquipIcon>
);

// Resistance band — stretched band with two D-handles on the ends.
const equipBands = (active: boolean) => (
  <EquipIcon active={active}>
    <path d="M2 12c0-3 4-3 4 0v8c0 3-4 3-4 0z" fill="currentColor" />
    <path d="M30 12c0-3-4-3-4 0v8c0 3 4 3 4 0z" fill="currentColor" />
    <path d="M6 16c4-3 8 3 12 0s4-3 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M6 17c4-3 8 3 12 0s4-3 8 0" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" strokeLinecap="round" />
  </EquipIcon>
);

// Bodyweight — clear standing person with arms up
const equipBodyweight = (active: boolean) => (
  <EquipIcon active={active}>
    <circle cx="16" cy="6" r="2.5" fill="currentColor" />
    <rect x="14.5" y="9" width="3" height="9" rx="0.5" fill="currentColor" />
    <line x1="15" y1="10" x2="9" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="17" y1="10" x2="23" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
    else router.push('/onboard/phase5diet');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase4');
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
    0: 'Continue',
    1: 'Continue',
    2: (draft.equipment?.length ?? 0) > 0 ? 'Continue' : 'No equipment',
    3: 'Continue',
    4: (draft.lastMuscles?.length ?? 0) > 0 ? 'Continue' : 'Skip',
    5: 'Continue',
    6: 'Continue',
    7: 'Continue',
    8: draft.workoutReminderTime ? 'Remind me' : 'Maybe later',
  };

  return (
    <motion.button
      whileTap={{ scale: canProceed ? 0.98 : 1 }}
      onClick={canProceed ? next : undefined}
      disabled={!canProceed}
      className="font-body"
      style={{
        width: '100%',
        padding: '14px 16px',
        background: canProceed ? 'var(--b-ink)' : 'transparent',
        color: canProceed ? 'var(--b-paper)' : 'var(--b-ink-40)',
        border: '1px solid var(--b-ink)',
        cursor: canProceed ? 'pointer' : 'not-allowed',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: canProceed ? 1 : 0.4,
      }}
    >
      {labels[step] || 'Continue'} →
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

// Editorial option-card style — applied to multiple list-style buttons.
function optionCardStyle(active: boolean): React.CSSProperties {
  return {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
    borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
    padding: '14px 18px',
    cursor: 'pointer',
    color: 'var(--b-ink)',
  };
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {[
          { val: true,  label: 'Yes, I have one',     sub: "I'll log my own program." },
          { val: false, label: 'No, build me one',    sub: "Tailor a plan to my goals + equipment." },
        ].map((opt) => {
          const active = value === opt.val;
          return (
            <button
              key={String(opt.val)}
              onClick={() => onChange(opt.val)}
              style={optionCardStyle(active)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="font-display"
                  style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {opt.label}
                </span>
                {active && (
                  <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                    <CheckCircleFullIcon size={16} />
                  </span>
                )}
              </div>
              <p
                className="font-body"
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: active ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
                }}
              >
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        {LOCATION_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={optionCardStyle(active)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="font-display"
                  style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {opt.label}
                </span>
                {active && (
                  <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                    <CheckCircleFullIcon size={16} />
                  </span>
                )}
              </div>
              <p
                className="font-body"
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: active ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
                }}
              >
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginTop: 8,
        }}
      >
        {EQUIPMENT_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              style={{
                aspectRatio: '1 / 1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 6px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
              }}
            >
              {opt.renderIcon(active)}
              <span
                className="font-body"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                }}
              >
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
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 28 }}
      >
        Built around you
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
        We&apos;ll{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>tailor</em>{' '}
        everything.
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginTop: 8,
        }}
      >
        {MUSCLE_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                color: 'var(--b-ink)',
              }}
            >
              <MuscleSilhouette muscle={opt.key} active={active} />
              <span
                className="font-display"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                }}
              >
                {opt.label}
              </span>
              {active && (
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex', marginLeft: 'auto' }}>
                  <CheckCircleFullIcon size={16} />
                </span>
              )}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {DURATION_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              style={{
                ...optionCardStyle(active),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                padding: '12px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
                    display: 'inline-flex',
                  }}
                >
                  <ClockIcon size={20} />
                </span>
                <div>
                  <p
                    className="font-display"
                    style={{
                      fontSize: 16,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                      margin: 0,
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 11,
                      marginTop: 2,
                      color: active ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
                    }}
                  >
                    {opt.sub}
                  </p>
                </div>
              </div>
              {active && (
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                  <CheckCircleFullIcon size={16} />
                </span>
              )}
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
  // Capped at 5 selected days so every plan retains ≥2 rest days.
  // If the user already has 5 picked and tries to add a 6th, ignore.
  const toggleDay = (d: DayKey) => {
    const current = draft.workoutDays || [];
    const isOn = current.includes(d);
    if (!isOn && current.length >= 5) return;
    const next = isOn ? current.filter((x) => x !== d) : [...current, d];
    update({ workoutDays: next, workoutDaysPerWeek: undefined });
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How many days a week do you usually train?" />

      {/* Mode tabs — editorial inline toggle */}
      <div className="flex justify-center" style={{ marginTop: 8, marginBottom: 18 }}>
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid var(--b-ink)',
            background: 'var(--b-paper)',
          }}
        >
          {([
            { val: 'count' as const,    label: 'Just a number' },
            { val: 'specific' as const, label: 'Pick days' },
          ]).map((tab, i) => {
            const active = mode === tab.val;
            return (
              <button
                key={tab.val}
                onClick={() => setMode(tab.val)}
                className="font-body"
                style={{
                  padding: '8px 22px',
                  background: active ? 'var(--b-ink)' : 'transparent',
                  color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--b-ink)' : 'none',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'count' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = draft.workoutDaysPerWeek === n;
            return (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'transparent',
                  border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                  borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                  cursor: 'pointer',
                  color: 'var(--b-ink)',
                }}
              >
                <span
                  className="font-display"
                  style={{
                    fontSize: 32,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {n}
                </span>
                <span
                  className="spread"
                  style={{
                    fontSize: 9,
                    color: active ? 'var(--b-accent)' : 'var(--b-ink-40)',
                  }}
                >
                  {n === 1 ? 'day' : 'days'}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginBottom: 10,
            lineHeight: 1.4,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Pick up to 5 — we always reserve at least 2 rest days for recovery.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
          }}
        >
          {DAY_OPTIONS.map((d) => {
            const active = (draft.workoutDays || []).includes(d.key);
            return (
              <button
                key={d.key}
                onClick={() => toggleDay(d.key)}
                style={{
                  aspectRatio: '2 / 3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                  borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="font-body"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {d.label}
                </span>
              </button>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

function HelpFindTimeStep() {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} />
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 28 }}
      >
        Slotted into your day
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
        We&apos;ll help you{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>find time</em>.
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

      {/* Notification preview — editorial card with hairline */}
      <div
        style={{
          marginTop: 8,
          marginInline: 'auto',
          maxWidth: 384,
          width: '100%',
          padding: 14,
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'transparent',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid var(--b-ink)',
            color: 'var(--b-accent)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <p
              className="font-display"
              style={{
                fontSize: 13,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                margin: 0,
              }}
            >
              Outrank
            </p>
            <p
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-40)', marginLeft: 'auto' }}
            >
              In 2 hr
            </p>
          </div>
          <p
            className="font-body"
            style={{
              fontSize: 12,
              marginTop: 4,
              color: 'var(--b-ink)',
              fontWeight: 500,
            }}
          >
            Time to train
          </p>
          <p
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--b-ink-60)',
              lineHeight: 1.5,
              marginTop: 2,
            }}
          >
            Today: chest + shoulders. Bench Press, DB Shoulder Press, Lateral Raise.
          </p>
        </div>
      </div>

      {/* Time display */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <p
          className="font-display"
          style={{
            fontSize: 64,
            fontStyle: 'italic',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            color: 'var(--b-ink)',
            margin: 0,
          }}
        >
          <span>{hour12}</span>
          <span style={{ color: 'var(--b-accent)' }}>:00</span>
          <span style={{ color: 'var(--b-accent)', fontSize: 28, marginLeft: 8, verticalAlign: 'baseline' }}>
            {period}
          </span>
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

      {/* AM / PM toggle — editorial */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={togglePeriod}
          style={{
            display: 'inline-flex',
            border: '1px solid var(--b-ink)',
            background: 'var(--b-paper)',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          {(['AM', 'PM'] as const).map((p, i) => {
            const active = period === p;
            return (
              <span
                key={p}
                className="font-body"
                style={{
                  padding: '8px 24px',
                  background: active ? 'var(--b-ink)' : 'transparent',
                  color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                  borderLeft: i > 0 ? '1px solid var(--b-ink)' : 'none',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
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
// muscle inked in the editorial accent while the rest stays at ink-40.
// Used in the LastMusclesStep grid so each option visually communicates
// which area it represents.

interface SilhouetteProps {
  muscle: MuscleKey;
  active: boolean;
}

/**
 * Plain standing human silhouette. The muscle the card REPRESENTS is
 * always painted with the accent color so the user doesn't have to tap
 * to see what the card means. Active state controls overall card chrome
 * (handled outside via the accent border + left bar).
 */
function MuscleSilhouette({ muscle, active }: SilhouetteProps) {
  // Editorial palette: dim ink for the body, accent for the represented muscle.
  const dim = 'var(--b-ink-40)';
  const HOT = 'var(--b-accent)';

  // Per-muscle: returns HOT if THIS card represents this muscle.
  const isThis = (m: MuscleKey) => muscle === m;

  // We keep a subtle weight bump on active so the silhouette reads stronger.
  const opacity = active ? 1 : 0.85;

  // The body uses one continuous outline path (head + neck + torso +
  // arms + legs as a single silhouette) so the figure reads as a real
  // human shape, then per-muscle accent overlays paint just the
  // muscle group in the active card's hot colour. Anatomical-ish
  // proportions: head ~1/8 of height, shoulder span ~1/4 figure
  // width, torso tapers to a hip slightly narrower than shoulders.
  const bodyPath =
    // Start: top of head
    'M 28 3 ' +
    // Head right side curving down to jaw
    'C 32 3 35 6 35 10 C 35 13 33 15 31 16 ' +
    // Neck right
    'L 31 18 ' +
    // Right shoulder cap
    'C 36 18 40 21 41 25 ' +
    // Right upper arm down to elbow
    'L 42 38 ' +
    // Right forearm down to wrist
    'L 43 52 ' +
    // Wrist outer
    'C 43 55 41 55 40 53 ' +
    // Forearm inner up to elbow
    'L 38.5 38 ' +
    // Right side of torso — taper to hip
    'L 35 50 ' +
    // Hip line — small inward dip
    'L 34 53 ' +
    // Right leg outer down to ankle
    'L 35 76 ' +
    // Right foot top
    'C 35 78 32 78 31 76 ' +
    // Right inner leg up to crotch
    'L 30 53 ' +
    // Crotch
    'L 26 53 ' +
    // Left inner leg down
    'L 25 76 ' +
    // Left foot
    'C 25 78 21 78 21 76 ' +
    'L 21 53 ' +
    // Left hip dip
    'L 21 50 ' +
    // Left torso side up
    'L 17.5 38 ' +
    // Left forearm inner down
    'L 16 53 ' +
    'C 15 55 13 55 13 52 ' +
    // Left forearm outer up
    'L 14 38 ' +
    // Left upper arm up
    'L 15 25 ' +
    // Left shoulder cap
    'C 16 21 20 18 25 18 ' +
    // Neck left
    'L 25 16 ' +
    // Head left side
    'C 23 15 21 13 21 10 C 21 6 24 3 28 3 ' +
    'Z';

  return (
    <svg width="48" height="80" viewBox="0 0 56 80" fill="none" className="flex-shrink-0" style={{ opacity }}>
      {/* Body outline silhouette */}
      <path d={bodyPath} fill={dim} />

      {/* Per-muscle accent overlays — drawn on top of the dim
          silhouette so only the active muscle group flips to hot. */}
      {isThis('shoulders') && (
        <>
          {/* Left + right deltoid caps */}
          <path d="M 15 25 C 16 21 20 18 25 18 L 25 22 C 22 22 19 24 18 28 Z" fill={HOT} />
          <path d="M 41 25 C 40 21 36 18 31 18 L 31 22 C 34 22 37 24 38 28 Z" fill={HOT} />
        </>
      )}

      {isThis('chest') && (
        <>
          {/* Two pec ovals with a sternum gap down the middle */}
          <ellipse cx="23.5" cy="26" rx="4.2" ry="3.4" fill={HOT} />
          <ellipse cx="32.5" cy="26" rx="4.2" ry="3.4" fill={HOT} />
        </>
      )}

      {isThis('abs') && (
        // Six-pack rectangle with hint of segmentation via two darker dividers
        <g>
          <rect x="24" y="30" width="8" height="18" rx="1.2" fill={HOT} />
          <line x1="28" y1="32" x2="28" y2="46" stroke="var(--b-paper)" strokeOpacity="0.35" strokeWidth="0.6" />
          <line x1="24" y1="36" x2="32" y2="36" stroke="var(--b-paper)" strokeOpacity="0.35" strokeWidth="0.6" />
          <line x1="24" y1="42" x2="32" y2="42" stroke="var(--b-paper)" strokeOpacity="0.35" strokeWidth="0.6" />
        </g>
      )}

      {isThis('back') && (
        // Lat sweep — paint torso area in hot, leave shoulders + arms in dim
        <path d="M 18 22 L 38 22 L 35 50 L 21 50 Z" fill={HOT} />
      )}

      {isThis('arms') && (
        <>
          {/* Right upper + forearm */}
          <path d="M 38.5 25 L 42 25 L 43 52 C 43 55 41 55 40 53 L 38.5 38 Z" fill={HOT} />
          {/* Left upper + forearm */}
          <path d="M 17.5 25 L 14 25 L 13 52 C 13 55 15 55 16 53 L 17.5 38 Z" fill={HOT} />
        </>
      )}

      {isThis('legs') && (
        <>
          {/* Right quad + lower leg */}
          <path d="M 30 53 L 34 53 L 35 76 C 35 78 32 78 31 76 Z" fill={HOT} />
          {/* Left quad + lower leg */}
          <path d="M 22 53 L 26 53 L 25 76 C 25 78 21 78 21 76 Z" fill={HOT} />
        </>
      )}
    </svg>
  );
}
