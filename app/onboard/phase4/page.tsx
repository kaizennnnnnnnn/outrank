'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { SpeechBubble } from '@/components/onboarding/SpeechBubble';
import {
  EnergyLevel,
  ImprovementCadence,
  StatementKey,
  StruggleKey,
} from '@/types/onboarding';
import { CheckCircleFullIcon, SparklesIcon } from '@/components/ui/AppIcons';

/**
 * Phase 4 — Personalization probes + insight cards.
 *
 * Ten steps in order:
 *   0. Improvement cadence (4 options)
 *   1. Struggles (multi-select, gym + habits in two sections)
 *   2. Energy levels
 *   3. "That's okay — we'll adjust" mascot interlude
 *   4. Statements you relate to (multi-select)
 *   5. Insight card — Progress feels invisible
 *   6. Insight card — Blind spot
 *   7. Insight card — Motivation doesn't last
 *   8. The path to building yourself
 *   9. See real progress
 *
 * Hand-off goes to /onboard/phase5 (placeholder until Phase 5 builds).
 */

const TOTAL_STEPS = 10;

const CADENCE_OPTIONS: { key: ImprovementCadence; label: string; sub: string }[] = [
  { key: 'daily',     label: 'Every day',          sub: "It's always on my mind." },
  { key: 'weekly',    label: 'Most weeks',         sub: 'I check in regularly.' },
  { key: 'sometimes', label: 'Once in a while',    sub: "When I'm in the mood." },
  { key: 'rarely',    label: "I'm just starting",  sub: 'This is mostly new.' },
];

// Each struggle/statement icon has a colored fill backdrop + a stroke
// silhouette so the chip pops with color instead of reading as a flat
// outline. The backdrop circle takes the icon's accent color; the
// silhouette renders in white-ish on top.

interface IconShape {
  color: string;
  body: React.ReactNode;
}

const Icon = (color: string, body: React.ReactNode): IconShape => ({ color, body });

const renderIcon = (shape: IconShape, active: boolean) => {
  const safeColor = shape.color.replace('#', '');
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={`bg-${safeColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={shape.color} stopOpacity={active ? 0.95 : 0.32} />
          <stop offset="100%" stopColor={shape.color} stopOpacity={active ? 0.6 : 0.12} />
        </linearGradient>
      </defs>
      <rect
        x="0.5" y="0.5" width="23" height="23" rx="6"
        fill={`url(#bg-${safeColor})`}
        stroke={shape.color}
        strokeOpacity={active ? 1 : 0.5}
        strokeWidth="1"
      />
      <g style={{ color: active ? '#0c0c14' : shape.color }}>
        {shape.body}
      </g>
    </svg>
  );
};

// Each silhouette uses cleaner geometric shapes — recognizable at
// 32px chip size without ambiguity.

// Each icon is a FILLED illustration in `currentColor`. Backdrop
// gives it color context; an inner red "pain dot" marks the affected
// joint where applicable.

const STRUGGLE_BACK = Icon('#f97316', (
  <>
    {/* Standing torso side-view with spine */}
    <path d="M 9 3h6v3h-6z" fill="currentColor" opacity="0.6" />
    <rect x="11" y="3" width="2" height="17" fill="currentColor" />
    {/* Vertebrae bumps */}
    <circle cx="12" cy="7" r="1.4" fill="currentColor" />
    <circle cx="12" cy="11" r="1.4" fill="currentColor" />
    <circle cx="12" cy="15" r="1.4" fill="currentColor" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    {/* Pain marker — red glow on lower back */}
    <circle cx="12" cy="15" r="3" fill="#ef4444" fillOpacity="0.55" />
    <circle cx="12" cy="15" r="1.3" fill="#ef4444" />
  </>
));
const STRUGGLE_KNEE = Icon('#fb923c', (
  <>
    {/* Bent leg, side view: thigh down to bent knee, calf out */}
    <rect x="9" y="3" width="3" height="9" rx="1" fill="currentColor" />
    {/* Knee joint kneecap */}
    <circle cx="11" cy="12.5" r="2.2" fill="currentColor" />
    <rect x="11" y="12" width="3" height="9" rx="1" fill="currentColor" />
    {/* Pain marker */}
    <circle cx="11" cy="12.5" r="3.5" fill="#ef4444" fillOpacity="0.5" />
    <circle cx="11" cy="12.5" r="1.4" fill="#ef4444" />
  </>
));
const STRUGGLE_SHOULDER = Icon('#ef4444', (
  <>
    {/* Front-view torso top — head + shoulders + arms hanging */}
    <circle cx="12" cy="6" r="2.5" fill="currentColor" />
    <rect x="11" y="8.5" width="2" height="2" fill="currentColor" />
    {/* Shoulders */}
    <circle cx="7" cy="11" r="2.5" fill="currentColor" />
    <circle cx="17" cy="11" r="2.5" fill="currentColor" />
    {/* Torso */}
    <path d="M 8 12 L 16 12 L 15 19 L 9 19 Z" fill="currentColor" />
    {/* Arms hanging */}
    <rect x="5.5" y="11" width="2" height="7" rx="0.8" fill="currentColor" />
    <rect x="16.5" y="11" width="2" height="7" rx="0.8" fill="currentColor" />
    {/* Pain on right shoulder */}
    <circle cx="17" cy="11" r="3.5" fill="#ef4444" fillOpacity="0.45" />
    <circle cx="17" cy="11" r="1.5" fill="#ef4444" />
  </>
));
const STRUGGLE_WRIST = Icon('#f59e0b', (
  <>
    {/* Forearm + hand */}
    <rect x="4" y="9" width="9" height="3.5" rx="1" fill="currentColor" />
    {/* Wrist joint */}
    <circle cx="13" cy="10.5" r="2" fill="currentColor" />
    {/* Hand (palm + fingers stub) */}
    <path d="M 14 9 L 19 8 L 20 12 L 14 12 Z" fill="currentColor" />
    {/* Fingers hint */}
    <line x1="19" y1="8" x2="20" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    {/* Pain on wrist */}
    <circle cx="13" cy="10.5" r="3" fill="#ef4444" fillOpacity="0.55" />
    <circle cx="13" cy="10.5" r="1.3" fill="#ef4444" />
  </>
));
const ICON_SLEEP = Icon('#8b5cf6', (
  <>
    {/* Crescent moon — filled */}
    <path d="M 20 13 A 8 8 0 1 1 11 4 A 6 6 0 0 0 20 13 Z" fill="currentColor" />
    {/* Z's */}
    <path d="M 5 5 L 8 5 L 5 8 L 8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Star */}
    <circle cx="14" cy="8" r="0.8" fill="currentColor" />
  </>
));
const ICON_PHONE = Icon('#3b82f6', (
  <>
    {/* Filled phone */}
    <rect x="7" y="2.5" width="10" height="19" rx="2" fill="currentColor" />
    {/* Screen */}
    <rect x="8.5" y="5" width="7" height="13" rx="0.5" fill="#0c0c14" opacity="0.5" />
    {/* App grid dots on screen */}
    <circle cx="10.5" cy="8" r="0.8" fill="currentColor" />
    <circle cx="13.5" cy="8" r="0.8" fill="currentColor" />
    <circle cx="10.5" cy="11" r="0.8" fill="currentColor" />
    <circle cx="13.5" cy="11" r="0.8" fill="currentColor" />
    {/* Home button */}
    <circle cx="12" cy="20" r="0.7" fill="#0c0c14" opacity="0.6" />
  </>
));
const ICON_WATER = Icon('#0ea5e9', (
  <>
    {/* Filled water drop */}
    <path d="M 12 3 C 9 7 6 11 6 14 A 6 6 0 0 0 18 14 C 18 11 15 7 12 3 Z" fill="currentColor" />
    {/* Shine highlight */}
    <ellipse cx="9.5" cy="13" rx="1.3" ry="2" fill="#ffffff" opacity="0.4" />
  </>
));
const ICON_ENERGY = Icon('#facc15', (
  <>
    {/* Battery */}
    <rect x="3" y="8" width="16" height="9" rx="1.5" fill="currentColor" />
    <rect x="20" y="10.5" width="2.5" height="4" rx="0.6" fill="currentColor" />
    {/* Battery cells (low charge — only one filled) */}
    <rect x="4.5" y="9.5" width="3" height="6" rx="0.3" fill="#0c0c14" opacity="0.45" />
    <rect x="8.5" y="9.5" width="3" height="6" rx="0.3" fill="#0c0c14" opacity="0.45" />
    <rect x="12.5" y="9.5" width="3" height="6" rx="0.3" fill="#0c0c14" opacity="0.45" />
    {/* Low-charge highlight on first cell */}
    <rect x="4.5" y="9.5" width="3" height="6" rx="0.3" fill="#ef4444" />
  </>
));
const ICON_STRESS = Icon('#ec4899', (
  <>
    {/* Filled heart */}
    <path
      d="M 12 20 L 5 14 A 4 4 0 0 1 11 8 A 4 4 0 0 1 19 14 Z"
      fill="currentColor"
    />
    {/* EKG line through */}
    <path d="M 4 13 L 7 13 L 9 9 L 11 17 L 13 11 L 16 13 L 20 13"
      stroke="#fef3c7" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
));
const ICON_MORNING = Icon('#fbbf24', (
  <>
    {/* Sun (filled circle) */}
    <circle cx="12" cy="14" r="4.5" fill="currentColor" />
    {/* Horizon line */}
    <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="21" x2="21" y2="21" stroke="#fef3c7" strokeWidth="0.5" strokeLinecap="round" />
    {/* Rays */}
    <line x1="12" y1="3" x2="12" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="5"  y1="7" x2="7"  y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="19" y1="7" x2="17" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="3" y1="14" x2="5" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="19" y1="14" x2="21" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </>
));

const STRUGGLES_BODY: { key: StruggleKey; label: string; shape: IconShape }[] = [
  { key: 'sensitive_back',      label: 'Sensitive back',      shape: STRUGGLE_BACK },
  { key: 'sensitive_knees',     label: 'Sensitive knees',     shape: STRUGGLE_KNEE },
  { key: 'sensitive_shoulders', label: 'Sensitive shoulders', shape: STRUGGLE_SHOULDER },
  { key: 'sensitive_wrists',    label: 'Sensitive wrists',    shape: STRUGGLE_WRIST },
];

const STRUGGLES_LIFE: { key: StruggleKey; label: string; shape: IconShape }[] = [
  { key: 'trouble_sleeping',       label: 'Trouble sleeping',       shape: ICON_SLEEP },
  { key: 'phone_addiction',        label: 'Phone addiction',        shape: ICON_PHONE },
  { key: 'forget_water',           label: 'Forget to drink water',  shape: ICON_WATER },
  { key: 'energy_crashes',         label: 'Energy crashes',         shape: ICON_ENERGY },
  { key: 'stress_anxiety',         label: 'Stress / anxiety',       shape: ICON_STRESS },
  { key: 'low_morning_motivation', label: 'Low morning motivation', shape: ICON_MORNING },
];

const ENERGY_OPTIONS: { key: EnergyLevel; label: string; sub: string }[] = [
  { key: 'low',    label: 'Low',    sub: "I'm often tired." },
  { key: 'medium', label: 'Medium', sub: 'It depends on the day.' },
  { key: 'high',   label: 'High',   sub: 'I have plenty of energy.' },
];

const ICON_LOOP = Icon('#06b6d4', (
  <>
    {/* Filled circular arrow */}
    <path d="M 12 4 A 8 8 0 1 0 18.5 17 L 16 15 A 5 5 0 1 1 12 7 V 4 Z" fill="currentColor" />
    {/* Arrow head */}
    <path d="M 11 1 L 16 4 L 11 7 Z" fill="currentColor" />
  </>
));
const ICON_LIMIT = Icon('#ef4444', (
  <>
    {/* Barbell with light weight (not pushed) */}
    <rect x="2" y="9" width="20" height="6" rx="0.5" fill="currentColor" opacity="0.18" />
    {/* Bar */}
    <rect x="6" y="11" width="12" height="2" fill="currentColor" />
    {/* Light plates */}
    <rect x="3" y="9.5" width="3" height="5" rx="0.5" fill="currentColor" />
    <rect x="18" y="9.5" width="3" height="5" rx="0.5" fill="currentColor" />
    {/* Down arrow indicating "limit" */}
    <path d="M 12 17 L 14 20 L 10 20 Z" fill="currentColor" />
  </>
));
const ICON_INVISIBLE = Icon('#94a3b8', (
  <>
    {/* Eye filled */}
    <path d="M 3 12 C 6 6 18 6 21 12 C 18 18 6 18 3 12 Z" fill="currentColor" />
    {/* Iris */}
    <circle cx="12" cy="12" r="3" fill="#0c0c14" />
    {/* Cross-out slash */}
    <line x1="4" y1="4" x2="20" y2="20" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
  </>
));
const ICON_INCONSISTENT = Icon('#a855f7', (
  <>
    {/* Wavy bumpy zigzag, filled-style */}
    <path
      d="M 2 12 L 4 8 L 6 14 L 9 6 L 12 16 L 15 7 L 18 14 L 22 9"
      stroke="currentColor"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));
const ICON_DISTRACTED = Icon('#22d3ee', (
  <>
    {/* Center dot */}
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    {/* 8 chevron arrows pointing OUT */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <g key={a} transform={`rotate(${a} 12 12)`}>
        <path d="M 12 6 L 14 8 L 10 8 Z" fill="currentColor" />
      </g>
    ))}
  </>
));
const ICON_BROKEN_CHAIN = Icon('#f59e0b', (
  <>
    {/* Left link */}
    <path d="M 5 14 A 3 3 0 0 1 5 8 L 9 8 L 9 14 Z" fill="currentColor" />
    {/* Right link */}
    <path d="M 19 10 A 3 3 0 0 1 19 16 L 15 16 L 15 10 Z" fill="currentColor" />
    {/* Connection bar (broken) */}
    <rect x="8" y="11" width="3" height="2" fill="currentColor" opacity="0.5" />
    <rect x="13" y="11" width="3" height="2" fill="currentColor" opacity="0.5" />
    {/* Break gap zigzag */}
    <path d="M 11 9 L 13 12 L 11 14" stroke="#ef4444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M 13 9 L 11 12 L 13 14" stroke="#ef4444" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>
));

const STATEMENT_OPTIONS: { key: StatementKey; label: string; shape: IconShape }[] = [
  { key: 'follow_same_routine',      label: "I follow the same routine every time and don't know what to change.", shape: ICON_LOOP },
  { key: 'dont_push_limits',         label: "I don't push myself as hard as I want to.",                            shape: ICON_LIMIT },
  { key: 'progress_invisible',       label: 'Progress feels invisible — effort never feels like results.',          shape: ICON_INVISIBLE },
  { key: 'inconsistent_sleep',       label: "My sleep is all over the place.",                                      shape: ICON_INCONSISTENT },
  { key: 'distracted_easily',        label: "I get distracted easily and lose focus.",                              shape: ICON_DISTRACTED },
  { key: 'cant_stick_with_anything', label: "I start strong but can't stick with anything long-term.",              shape: ICON_BROKEN_CHAIN },
];

export default function OnboardPhase4Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase5');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase3');
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
            <CadenceStep
              value={draft.improvementCadence}
              onChange={(improvementCadence) => update({ improvementCadence })}
            />
          )}
          {step === 1 && (
            <StrugglesStep
              value={draft.struggles || []}
              onChange={(struggles) => update({ struggles })}
            />
          )}
          {step === 2 && (
            <EnergyStep
              value={draft.energyLevels}
              onChange={(energyLevels) => update({ energyLevels })}
            />
          )}
          {step === 3 && <ThatsOkayStep />}
          {step === 4 && (
            <StatementsStep
              value={draft.statementsRelating || []}
              onChange={(statementsRelating) => update({ statementsRelating })}
            />
          )}
          {step === 5 && <InsightInvisibleStep />}
          {step === 6 && <InsightBlindSpotStep />}
          {step === 7 && <InsightMotivationStep />}
          {step === 8 && <PathToBuildingStep />}
          {step === 9 && <SeeRealProgressStep />}
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
  const canProceed =
    (step === 0 && !!draft.improvementCadence) ||
    (step === 1) || // struggles can be empty
    (step === 2 && !!draft.energyLevels) ||
    (step === 3) ||
    (step === 4) || // statements can be empty
    (step === 5) ||
    (step === 6) ||
    (step === 7) ||
    (step === 8) ||
    (step === 9);

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
      {step === 1 ? (draft.struggles?.length ? 'CONTINUE' : 'NONE OF THESE') : 'CONTINUE'}
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

function MultiSelectGrid<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { key: T; label: string; shape?: IconShape }[];
  value: T[];
  onChange: (v: T[]) => void;
  cols?: 1 | 2;
}) {
  const toggle = (key: T) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };
  return (
    <div className={cn('grid gap-2.5', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
      {options.map((opt) => {
        const active = value.includes(opt.key);
        return (
          <button
            key={opt.key}
            onClick={() => toggle(opt.key)}
            className={cn(
              'rounded-2xl border-2 px-3 py-3 text-left transition-all flex items-center gap-3 min-h-[56px]',
              active
                ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                : 'bg-[#10101a] border-white/8 hover:border-white/20',
            )}
          >
            {opt.shape && (
              <div className="flex-shrink-0">
                {renderIcon(opt.shape, active)}
              </div>
            )}
            <span className={cn('flex-1 font-semibold text-[13px] leading-snug', active ? 'text-white' : 'text-slate-200')}>
              {opt.label}
            </span>
            {active && <CheckCircleFullIcon size={16} className="text-orange-400 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function CadenceStep({
  value,
  onChange,
}: {
  value?: ImprovementCadence;
  onChange: (v: ImprovementCadence) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How often do you think about improving your life?" />
      <div className="space-y-2.5 mt-2">
        {CADENCE_OPTIONS.map((opt) => {
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

function StrugglesStep({
  value,
  onChange,
}: {
  value: StruggleKey[];
  onChange: (v: StruggleKey[]) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Do you struggle with any of the following? Pick anything that applies." />
      <div className="mt-2 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-orange-400 mb-2.5">Body</p>
          <MultiSelectGrid options={STRUGGLES_BODY} value={value} onChange={onChange} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-orange-400 mb-2.5">Daily life</p>
          <MultiSelectGrid options={STRUGGLES_LIFE} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function EnergyStep({
  value,
  onChange,
}: {
  value?: EnergyLevel;
  onChange: (v: EnergyLevel) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How are your energy levels usually?" />
      <div className="space-y-2.5 mt-2">
        {ENERGY_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-5 py-4 transition-all flex items-center gap-4',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <EnergyBars level={opt.key} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                    {opt.label}
                  </span>
                  {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
                </div>
                <p className={cn('text-[13px] mt-0.5', active ? 'text-orange-200/80' : 'text-slate-500')}>
                  {opt.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Three vertical bars of increasing height visualizing low/medium/high. */
function EnergyBars({ level }: { level: EnergyLevel }) {
  const filled = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
  return (
    <div className="flex items-end gap-1 h-8 flex-shrink-0">
      {[8, 18, 28].map((h, i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className={cn(
              'w-1.5 rounded-sm transition-colors',
              on
                ? 'bg-gradient-to-t from-red-500 to-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.55)]'
                : 'bg-white/[0.08] border border-white/[0.06]',
            )}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

function ThatsOkayStep() {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} greeting />
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        That&apos;s okay.<br/><span className="text-orange-400">We&apos;ve got you.</span>
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Outrank adapts your training and habits to your body and energy — sensitive joints, low days, and busy stretches all factored in.
      </p>
    </div>
  );
}

function StatementsStep({
  value,
  onChange,
}: {
  value: StatementKey[];
  onChange: (v: StatementKey[]) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Do you relate to any of these?" />
      <div className="mt-2">
        <MultiSelectGrid options={STATEMENT_OPTIONS} value={value} onChange={onChange} cols={1} />
      </div>
    </div>
  );
}

// ─── Insight cards ───────────────────────────────────────────────────────────

interface InsightCardProps {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  fix: string;
  visual: React.ReactNode;
}

function InsightCard({ eyebrow, title, body, fix, visual }: InsightCardProps) {
  return (
    <div className="flex flex-col flex-1 justify-center text-center">
      <div className="flex justify-center mb-8">{visual}</div>
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">
        {eyebrow}
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight max-w-md mx-auto">
        {title}
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm mx-auto text-[15px] leading-relaxed">
        {body}
      </p>
      <div className="mt-6 mx-auto max-w-sm rounded-2xl bg-orange-500/10 border border-orange-500/30 px-4 py-3">
        <p className="text-[13px] font-semibold text-orange-200 leading-relaxed">
          {fix}
        </p>
      </div>
    </div>
  );
}

function InsightInvisibleStep() {
  return (
    <InsightCard
      eyebrow="The honest truth"
      title={<>Progress feels<br/><span className="text-orange-400">invisible</span>.</>}
      body="You show up. You log. You sweat. But the mirror doesn't change fast enough — and effort that doesn't feel like results gets harder to keep doing."
      fix="Outrank tracks the wins your eyes can't see, every day."
      visual={<MirrorVisual />}
    />
  );
}

function InsightBlindSpotStep() {
  return (
    <InsightCard
      eyebrow="Working blind"
      title={<>You can&apos;t fix<br/>what you <span className="text-orange-400">can&apos;t see</span>.</>}
      body="When you don't know which muscle is lagging — or which habit is breaking your sleep — you train and live in circles. Weak points stay weak."
      fix="Outrank ranks every part so you know exactly what to work on next."
      visual={<BlindSpotVisual />}
    />
  );
}

function InsightMotivationStep() {
  return (
    <InsightCard
      eyebrow="Why most people quit"
      title={<>Motivation<br/><span className="text-orange-400">runs out</span>.</>}
      body="Streaks die. Goals get fuzzy. The version of you who started Sunday doesn't always show up next Tuesday."
      fix="Outrank gives you the structure motivation alone can't."
      visual={<MotivationVisual />}
    />
  );
}

function PathToBuildingStep() {
  return (
    <div className="flex flex-col flex-1 justify-center text-center">
      <div className="flex justify-center mb-8">
        <PathVisual />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">
        How Outrank works
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight">
        The path to<br/>building <span className="text-orange-400">yourself</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm mx-auto text-[15px] leading-relaxed">
        Ranks turn effort into clear progress and show you what to improve next — across gym, sleep, water, focus, and steps. No more guessing.
      </p>
    </div>
  );
}

function SeeRealProgressStep() {
  return (
    <div className="flex flex-col flex-1 justify-center text-center">
      <div className="flex justify-center mb-8">
        <ProgressGraphVisual />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">
        Visible transformation
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight">
        See <span className="text-orange-400">real</span> progress.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm mx-auto text-[15px] leading-relaxed">
        Outrank charts every metric — strength, sleep, hydration, focus, steps — so you can watch the version of you that&apos;s actually being built.
      </p>
    </div>
  );
}

// ─── Visuals ─────────────────────────────────────────────────────────────────

/**
 * Detailed anatomical body figure used as the visual base for the
 * mirror + blind-spot illustrations. `highlight` is a list of muscle
 * group ids that get painted with the active orange-red gradient; the
 * rest stay in the dim slate base color. `tone` switches the base —
 * 'dim' for the mirror (both figures dim, no progress visible) and
 * 'mixed' for the blind-spot (some bright, some dim).
 */
type AnatomyMuscle = 'shoulders' | 'chest' | 'biceps' | 'forearms' | 'abs' | 'obliques' | 'lats' | 'quads' | 'calves';

interface BodyFigureProps {
  highlight?: AnatomyMuscle[];
  weak?: AnatomyMuscle[];
  scale?: number;
  /** Append a unique gradient suffix when rendering more than one
   *  figure on the same page so SVG <defs> ids don't collide. */
  idSuffix?: string;
}

/**
 * Natural-proportions athletic body silhouette. Single continuous
 * outline (no chunky disjoint limbs), smooth curves, and proper
 * head-to-body ratio. Muscle highlight overlays sit on top of the
 * base silhouette where applicable. Reads as a clean human figure
 * rather than a robotic mannequin.
 */
/**
 * Standing human silhouette built from SEPARATE body parts (head,
 * torso, arms each as their own shape) so arms read clearly as
 * limbs hanging at the sides instead of getting absorbed into the
 * torso. Each part can be highlighted hot (red gradient) or weak
 * (dim red) independently.
 */
function BodyFigure({ highlight = [], weak = [], scale = 1, idSuffix = '' }: BodyFigureProps) {
  const baseId = `bf-base${idSuffix}`;
  const hotId = `bf-hot${idSuffix}`;
  const dimRedId = `bf-dim${idSuffix}`;
  const isHot = (m: AnatomyMuscle) => highlight.includes(m);
  const isWeak = (m: AnatomyMuscle) => weak.includes(m);
  const fillFor = (m: AnatomyMuscle) =>
    isHot(m) ? `url(#${hotId})` : isWeak(m) ? `url(#${dimRedId})` : `url(#${baseId})`;

  const w = 200 * scale;
  const h = 300 * scale;

  return (
    <svg width={w} height={h} viewBox="0 0 200 300" fill="none">
      <defs>
        <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#64748b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={hotId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id={dimRedId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#3a0a0a" />
        </linearGradient>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="100" cy="288" rx="50" ry="5" fill="#000000" opacity="0.4" />

      {/* Head */}
      <ellipse cx="100" cy="30" rx="16" ry="18" fill={`url(#${baseId})`} />
      {/* Neck */}
      <rect x="92" y="46" width="16" height="8" fill={`url(#${baseId})`} />

      {/* Shoulders/deltoids — distinct rounded caps */}
      <ellipse cx="68" cy="62" rx="14" ry="13" fill={fillFor('shoulders')} />
      <ellipse cx="132" cy="62" rx="14" ry="13" fill={fillFor('shoulders')} />

      {/* Trapezius */}
      <path d="M 78 56 L 122 56 L 132 64 L 68 64 Z" fill={`url(#${baseId})`} />

      {/* Torso — V-taper, clearly separate from arms */}
      <path
        d="M 70 64 L 130 64 L 124 130 L 76 130 Z"
        fill={`url(#${baseId})`}
      />

      {/* Pecs (chest) — sit on top of torso */}
      {(isHot('chest') || isWeak('chest')) && (
        <>
          <ellipse cx="86" cy="80" rx="14" ry="11" fill={fillFor('chest')} />
          <ellipse cx="114" cy="80" rx="14" ry="11" fill={fillFor('chest')} />
        </>
      )}

      {/* Lats — sides of torso */}
      {(isHot('lats') || isWeak('lats')) && (
        <>
          <path d="M 70 70 L 80 70 L 80 130 L 76 130 Z" fill={fillFor('lats')} />
          <path d="M 130 70 L 120 70 L 120 130 L 124 130 Z" fill={fillFor('lats')} />
        </>
      )}

      {/* Abs — 6-pack grid */}
      {(isHot('abs') || isWeak('abs')) && (
        <>
          <rect x="86" y="92" width="28" height="38" rx="2" fill={fillFor('abs')} />
          <line x1="100" y1="92" x2="100" y2="130" stroke="#0c1322" strokeWidth="1" opacity="0.6" />
          <line x1="86" y1="104" x2="114" y2="104" stroke="#0c1322" strokeWidth="0.8" opacity="0.5" />
          <line x1="86" y1="116" x2="114" y2="116" stroke="#0c1322" strokeWidth="0.8" opacity="0.5" />
        </>
      )}

      {/* Obliques — diagonal edges of waist */}
      {(isHot('obliques') || isWeak('obliques')) && (
        <>
          <path d="M 76 110 L 86 110 L 84 134 L 78 134 Z" fill={fillFor('obliques')} />
          <path d="M 124 110 L 114 110 L 116 134 L 122 134 Z" fill={fillFor('obliques')} />
        </>
      )}

      {/* Pec separation crease (always drawn for anatomical hint) */}
      <line x1="100" y1="68" x2="100" y2="92" stroke="#0c1322" strokeWidth="0.6" opacity="0.5" />
      {/* Pec underline */}
      <path d="M 72 92 Q 86 96 100 96" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 128 92 Q 114 96 100 96" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />

      {/* === ARMS — clearly separate from torso === */}
      {/* Left bicep */}
      <path
        d="M 56 64 Q 50 90 54 116 L 64 116 Q 68 90 70 64 Z"
        fill={fillFor('biceps')}
      />
      {/* Right bicep */}
      <path
        d="M 144 64 Q 150 90 146 116 L 136 116 Q 132 90 130 64 Z"
        fill={fillFor('biceps')}
      />
      {/* Left forearm */}
      <path
        d="M 54 116 Q 50 140 54 160 L 64 160 Q 66 140 64 116 Z"
        fill={fillFor('forearms')}
      />
      {/* Right forearm */}
      <path
        d="M 146 116 Q 150 140 146 160 L 136 160 Q 134 140 136 116 Z"
        fill={fillFor('forearms')}
      />
      {/* Hands hint */}
      <ellipse cx="59" cy="166" rx="5" ry="3" fill={`url(#${baseId})`} />
      <ellipse cx="141" cy="166" rx="5" ry="3" fill={`url(#${baseId})`} />

      {/* Hip waist */}
      <path d="M 76 134 L 124 134 L 128 154 L 72 154 Z" fill={`url(#${baseId})`} />

      {/* === LEGS === */}
      {/* Left quad */}
      <path
        d="M 78 156 Q 70 200 74 240 L 92 240 Q 96 200 96 156 Z"
        fill={fillFor('quads')}
      />
      {/* Right quad */}
      <path
        d="M 122 156 Q 130 200 126 240 L 108 240 Q 104 200 104 156 Z"
        fill={fillFor('quads')}
      />
      {/* Knees */}
      <ellipse cx="83" cy="244" rx="9" ry="4" fill={`url(#${baseId})`} />
      <ellipse cx="117" cy="244" rx="9" ry="4" fill={`url(#${baseId})`} />
      {/* Calves */}
      <path
        d="M 76 250 Q 70 270 78 285 L 90 285 Q 92 270 90 250 Z"
        fill={fillFor('calves')}
      />
      <path
        d="M 124 250 Q 130 270 122 285 L 110 285 Q 108 270 110 250 Z"
        fill={fillFor('calves')}
      />
    </svg>
  );
}

/**
 * Two stacked sparklines that tell the message without humans:
 * EFFORT trends up sharply (steep, glowing orange line, 47 logged
 * sessions) while RESULTS stays nearly flat (dim, barely lifting,
 * "no visible change" tag). The divergence between the two lines
 * IS the visual idea — effort meter pegged, mirror still says zero.
 */
function MirrorVisual() {
  // 8-point sparklines from x=0..280, y in 0..70 (lower y = higher on chart)
  const effortPoints: [number, number][] = [
    [0, 64], [40, 58], [80, 50], [120, 40], [160, 30], [200, 22], [240, 14], [280, 8],
  ];
  const resultPoints: [number, number][] = [
    [0, 60], [40, 58], [80, 60], [120, 56], [160, 58], [200, 55], [240, 56], [280, 54],
  ];
  const toPath = (pts: [number, number][]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const toAreaPath = (pts: [number, number][]) =>
    `${toPath(pts)} L ${pts[pts.length - 1][0]} 70 L ${pts[0][0]} 70 Z`;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="space-y-3">
        {/* EFFORT card */}
        <div className="rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-300">Effort</span>
            <span className="font-heading text-xl font-bold text-white tabular-nums">47<span className="text-[10px] text-slate-400 ml-1">SESSIONS</span></span>
          </div>
          <svg viewBox="0 0 280 76" className="w-full h-16" preserveAspectRatio="none">
            <defs>
              <linearGradient id="effortFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={toAreaPath(effortPoints)} fill="url(#effortFill)" />
            <path d={toPath(effortPoints)} stroke="#fb923c" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(251,146,60,0.6))' }} />
            <circle cx={effortPoints[effortPoints.length - 1][0]} cy={effortPoints[effortPoints.length - 1][1]} r="3.5" fill="#fef3c7" />
          </svg>
        </div>

        {/* RESULTS card — dim, barely moving */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500">Visible results</span>
            <span className="font-heading text-xl font-bold text-slate-400 tabular-nums">~0%</span>
          </div>
          <svg viewBox="0 0 280 76" className="w-full h-16" preserveAspectRatio="none">
            <path d={toPath(resultPoints)} stroke="#475569" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={resultPoints[resultPoints.length - 1][0]} cy={resultPoints[resultPoints.length - 1][1]} r="3" fill="#64748b" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * Reuses BodyFigure for anatomical accuracy. Strong groups
 * (shoulders, chest, biceps) are highlighted; weak groups (abs,
 * right-side quads) painted in dim red. Rank badges float around the
 * figure with leader lines pointing at their muscle group.
 */
function BlindSpotVisual() {
  return (
    <div className="relative">
      <BodyFigure
        highlight={['shoulders', 'chest', 'biceps']}
        weak={['abs', 'quads']}
        scale={0.95}
        idSuffix="-bs"
      />
      {/* Floating rank badges — absolutely positioned around the
          figure with leader lines pointing at their groups. */}
      <RankBadge label="A+" tone="strong" pos={{ left: -8, top: 38 }} />
      <RankBadge label="A"  tone="strong" pos={{ right: -8, top: 60 }} />
      <RankBadge label="F"  tone="weak"   pos={{ left: -8, top: 96 }} />
      <RankBadge label="D"  tone="weak"   pos={{ right: -8, top: 152 }} />
    </div>
  );
}

function RankBadge({
  label,
  tone,
  pos,
}: {
  label: string;
  tone: 'strong' | 'weak';
  pos: { left?: number; right?: number; top: number };
}) {
  const color = tone === 'strong' ? '#fb923c' : '#ef4444';
  return (
    <div
      className="absolute flex items-center gap-1"
      style={{ ...pos, fontFamily: 'ui-monospace,monospace' }}
    >
      <div
        className="px-2 py-0.5 rounded-md font-bold text-[11px] tracking-wider"
        style={{
          color,
          background: '#10101a',
          border: `1.2px solid ${color}`,
          boxShadow: `0 0 10px -2px ${color}`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/** A descending sparkline + a fading flame at the end — "motivation runs out." */
function MotivationVisual() {
  return (
    <svg width="220" height="140" viewBox="0 0 220 140" fill="none">
      <defs>
        <linearGradient id="lineFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" stopOpacity="1" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="flameFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      <line x1="10" y1="20"  x2="210" y2="20"  stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="10" y1="60"  x2="210" y2="60"  stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
      <line x1="10" y1="100" x2="210" y2="100" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
      {/* Descending zigzag */}
      <polyline
        points="10,30 35,28 60,40 85,38 110,55 135,68 160,80 185,98 210,108"
        fill="none"
        stroke="url(#lineFade)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dots at each peak */}
      {[[10,30],[35,28],[60,40],[85,38],[110,55],[135,68],[160,80],[185,98]].map(([x,y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fb923c" opacity={1 - i*0.1} />
      ))}
      {/* Fading flame at the end */}
      <path
        d="M 200 90 Q 196 80 198 70 Q 200 76 202 80 Q 204 76 206 70 Q 208 80 204 90 Z"
        fill="url(#flameFade)"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Dramatic mountain scene: starry sky, three layered mountains with
 * atmospheric perspective (back ones bluer/dimmer), snow-cap shading,
 * a winding ascending path with footprint markers, and a glowing
 * faceted rank crystal at the peak with rays + scattered sparks.
 */
function PathVisual() {
  return (
    <svg width="280" height="220" viewBox="0 0 280 220" fill="none">
      <defs>
        {/* Sky — deep navy fading to lighter at horizon */}
        <linearGradient id="pvSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0c1322" />
          <stop offset="60%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        {/* Back mountain — desaturated blue (atmospheric perspective) */}
        <linearGradient id="pvBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        {/* Mid mountain */}
        <linearGradient id="pvMid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        {/* Front mountain — darkest */}
        <linearGradient id="pvFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1e293b" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        {/* Snow */}
        <linearGradient id="pvSnow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        {/* Crystal — heroic gold/orange/red */}
        <linearGradient id="pvCrystal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fef3c7" />
          <stop offset="35%" stopColor="#fde047" />
          <stop offset="65%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        {/* Big halo behind crystal */}
        <radialGradient id="pvHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#fde047" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#fb923c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        {/* Crystal sparkle rays */}
        <radialGradient id="pvRays" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#fef3c7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky background */}
      <rect x="0" y="0" width="280" height="220" fill="url(#pvSky)" rx="14" />

      {/* Stars — small white dots scattered in the sky */}
      {[
        [20, 26, 1.2], [55, 18, 0.8], [88, 32, 1.4], [128, 14, 1],
        [175, 28, 1.2], [218, 16, 0.8], [248, 38, 1], [42, 50, 0.7],
        [200, 50, 0.9], [262, 60, 1], [12, 78, 0.8], [104, 50, 1],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fef3c7" opacity={0.55 + (i % 3) * 0.15} />
      ))}

      {/* Back mountain range — multiple distant peaks */}
      <path d="M -10 200 L 30 110 L 60 130 L 95 80 L 130 120 L 165 75 L 200 110 L 240 90 L 280 130 L 290 200 Z" fill="url(#pvBack)" opacity="0.7" />

      {/* Mid mountain range */}
      <path d="M -10 210 L 25 145 L 60 165 L 100 110 L 140 150 L 180 100 L 220 140 L 260 120 L 290 200 Z" fill="url(#pvMid)" />

      {/* Front mountain — main feature peak slightly off-center */}
      <path d="M 0 220 L 60 175 L 110 130 L 150 60 L 195 130 L 240 175 L 280 220 Z" fill="url(#pvFront)" />

      {/* Snow cap on the main peak */}
      <path d="M 132 90 L 140 78 L 150 60 L 162 84 L 170 102 Q 158 96 150 100 Q 140 98 132 90 Z" fill="url(#pvSnow)" />
      {/* Snow shading */}
      <path d="M 142 90 L 150 60 L 158 90" stroke="#94a3b8" strokeWidth="0.6" fill="none" opacity="0.6" />

      {/* Snow on side peak */}
      <path d="M 105 138 L 110 130 L 117 142 Q 110 142 105 138 Z" fill="url(#pvSnow)" opacity="0.85" />

      {/* Path zigzagging up the mountain — gradient stroke for fade */}
      <defs>
        <linearGradient id="pvPath" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"  stopColor="#fb923c" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fde047" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M 80 215 Q 100 195 120 180 Q 130 168 110 160 Q 90 150 110 134 Q 130 122 145 110 Q 158 100 150 84 Q 144 70 150 60"
        stroke="url(#pvPath)"
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Footprint markers along the path */}
      {[
        [80, 215], [105, 195], [122, 180], [110, 160], [108, 140], [128, 124], [148, 100], [148, 78],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill="#fde047" opacity={0.4 + (i / 8) * 0.6} />
      ))}

      {/* Big halo behind crystal */}
      <circle cx="150" cy="48" r="48" fill="url(#pvHalo)" />

      {/* Sparkle rays bursting outward */}
      <g stroke="#fef3c7" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
        <line x1="150" y1="14" x2="150" y2="20" />
        <line x1="150" y1="76" x2="150" y2="82" />
        <line x1="116" y1="48" x2="122" y2="48" />
        <line x1="178" y1="48" x2="184" y2="48" />
        <line x1="124" y1="22" x2="128" y2="26" />
        <line x1="176" y1="22" x2="172" y2="26" />
        <line x1="124" y1="74" x2="128" y2="70" />
        <line x1="176" y1="74" x2="172" y2="70" />
      </g>

      {/* Crystal — hex with internal facet shading */}
      <g style={{ filter: 'drop-shadow(0 0 12px rgba(251,146,60,0.85))' }}>
        <path
          d="M 150 28 L 168 40 L 168 60 L 150 72 L 132 60 L 132 40 Z"
          fill="url(#pvCrystal)"
          stroke="#fef3c7"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Inner facet lines */}
        <path d="M 150 28 L 150 72 M 132 40 L 168 60 M 132 60 L 168 40" stroke="#fef3c7" strokeWidth="0.5" opacity="0.5" />
        {/* Bright highlight on top-left facet */}
        <path d="M 150 28 L 168 40 L 150 50 Z" fill="#ffffff" opacity="0.4" />
      </g>

      {/* Wing flourishes flanking the crystal (echoes the rank icon idea) */}
      <g fill="#fbbf24" opacity="0.7">
        <path d="M 110 50 Q 122 48 132 52 Q 122 56 110 56 Z" />
        <path d="M 168 52 Q 178 48 190 50 Q 178 56 168 56 Z" />
      </g>

      {/* Two small "Spark" markers near top of path - feels like progression markers */}
      <circle cx="150" cy="60" r="2.5" fill="#fef3c7" />
      <circle cx="150" cy="80" r="1.6" fill="#fde047" opacity="0.85" />
    </svg>
  );
}

/** Multi-line ascending graph showing 5 different metrics climbing. */
function ProgressGraphVisual() {
  const lines = [
    { color: '#ef4444', label: 'Strength', points: [[10,100],[40,92],[70,80],[100,72],[130,55],[160,40],[190,30]] },
    { color: '#22c55e', label: 'Steps',    points: [[10,108],[40,100],[70,90],[100,85],[130,70],[160,58],[190,46]] },
    { color: '#3b82f6', label: 'Water',    points: [[10,116],[40,110],[70,98],[100,88],[130,80],[160,70],[190,60]] },
    { color: '#8b5cf6', label: 'Sleep',    points: [[10,112],[40,108],[70,95],[100,84],[130,78],[160,66],[190,54]] },
    { color: '#f59e0b', label: 'Focus',    points: [[10,118],[40,112],[70,104],[100,94],[130,86],[160,76],[190,66]] },
  ];
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
      {/* Grid baseline */}
      <line x1="10" y1="130" x2="210" y2="130" stroke="#1e293b" strokeWidth="1" />
      {/* Each metric line */}
      {lines.map((line) => (
        <g key={line.label}>
          <SparkPath points={line.points} color={line.color} />
        </g>
      ))}
      {/* Legend chips at top */}
      <g transform="translate(10, 8)">
        {lines.map((line, i) => (
          <g key={i} transform={`translate(${i * 42}, 0)`}>
            <circle cx={4} cy={4} r={3} fill={line.color} />
            <text x={11} y={7} fontSize="7" fill="#94a3b8" fontFamily="ui-monospace,monospace">
              {line.label}
            </text>
          </g>
        ))}
      </g>
      {/* Axis labels */}
      <text x={10} y={150} fontSize="8" fill="#475569" fontFamily="ui-monospace,monospace">JAN</text>
      <text x={185} y={150} fontSize="8" fill="#475569" fontFamily="ui-monospace,monospace">JUN</text>
    </svg>
  );
}

function SparkPath({ points, color }: { points: number[][]; color: string }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return (
    <>
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
    </>
  );
}
