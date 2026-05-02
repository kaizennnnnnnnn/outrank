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

const renderIcon = (shape: IconShape, active: boolean) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id={`bg-${shape.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stopColor={shape.color} stopOpacity={active ? 1 : 0.28} />
        <stop offset="100%" stopColor={shape.color} stopOpacity={active ? 0.7 : 0.12} />
      </linearGradient>
    </defs>
    {/* Rounded square backdrop with gradient — looks more like a real
        app icon than the flat circle */}
    <rect
      x="0.5" y="0.5" width="23" height="23" rx="6"
      fill={`url(#bg-${shape.color.replace('#', '')})`}
      stroke={shape.color}
      strokeOpacity={active ? 0.9 : 0.35}
      strokeWidth="0.8"
    />
    <g
      stroke={active ? '#0c0c14' : '#fef3c7'}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {shape.body}
    </g>
  </svg>
);

// Each silhouette uses cleaner geometric shapes — recognizable at
// 32px chip size without ambiguity.

const STRUGGLE_BACK = Icon('#f97316', (
  <>
    {/* Spine with vertebrae dots */}
    <line x1="12" y1="4" x2="12" y2="20" strokeWidth="2.2" />
    <circle cx="12" cy="6" r="1.3" />
    <circle cx="12" cy="10" r="1.3" />
    <circle cx="12" cy="14" r="1.3" />
    <circle cx="12" cy="18" r="1.3" />
    {/* Lightning bolt — pain indicator */}
    <path d="M16 9l3 1-2 2 2 1" strokeWidth="1.2" />
  </>
));
const STRUGGLE_KNEE = Icon('#fb923c', (
  <>
    {/* Bent leg with knee bend in middle */}
    <line x1="9" y1="3" x2="9" y2="11" strokeWidth="2.2" />
    <line x1="9" y1="11" x2="15" y2="14" strokeWidth="2.2" />
    <line x1="15" y1="14" x2="15" y2="21" strokeWidth="2.2" />
    {/* Knee joint emphasis */}
    <circle cx="12" cy="12.5" r="2.3" strokeWidth="1.5" />
  </>
));
const STRUGGLE_SHOULDER = Icon('#ef4444', (
  <>
    {/* Torso top with shoulders */}
    <path d="M5 9c2-3 5-4 7-4s5 1 7 4" strokeWidth="2" />
    <line x1="12" y1="9" x2="12" y2="20" strokeWidth="2" />
    {/* Shoulder joint highlights */}
    <circle cx="6" cy="9" r="2" strokeWidth="1.5" />
    <circle cx="18" cy="9" r="2" strokeWidth="1.5" />
  </>
));
const STRUGGLE_WRIST = Icon('#f59e0b', (
  <>
    {/* Arm + hand with wrist joint emphasized */}
    <line x1="6" y1="4" x2="11" y2="11" strokeWidth="2" />
    <circle cx="11" cy="12" r="2.3" strokeWidth="1.6" />
    <line x1="13" y1="14" x2="18" y2="20" strokeWidth="2" />
  </>
));
const ICON_SLEEP = Icon('#8b5cf6', (
  <>
    {/* Crescent moon */}
    <path d="M20 13a8 8 0 11-9-9 6.5 6.5 0 009 9z" strokeWidth="2" />
    {/* Z's */}
    <path d="M4 4h3l-3 3h3" strokeWidth="1" />
  </>
));
const ICON_PHONE = Icon('#3b82f6', (
  <>
    {/* Phone outline */}
    <rect x="7" y="3" width="10" height="18" rx="2" strokeWidth="2" />
    {/* Screen content (dots) */}
    <circle cx="11" cy="8" r="0.8" />
    <circle cx="13" cy="8" r="0.8" />
    <circle cx="11" cy="11" r="0.8" />
    <circle cx="13" cy="11" r="0.8" />
    {/* Home button */}
    <circle cx="12" cy="18" r="0.9" />
  </>
));
const ICON_WATER = Icon('#0ea5e9', (
  <>
    {/* Water drop */}
    <path d="M12 3c-3 4-6 8-6 11a6 6 0 0012 0c0-3-3-7-6-11z" strokeWidth="2" />
    {/* Water shine */}
    <path d="M9 13a3 3 0 003 3" strokeWidth="1.2" />
  </>
));
const ICON_ENERGY = Icon('#facc15', (
  <>
    {/* Battery body */}
    <rect x="3" y="8" width="16" height="9" rx="1.5" strokeWidth="2" />
    {/* Battery terminal */}
    <line x1="20" y1="11" x2="20" y2="14" strokeWidth="2" />
    {/* Low charge indicator */}
    <rect x="5" y="10" width="3" height="5" rx="0.4" />
  </>
));
const ICON_STRESS = Icon('#ec4899', (
  <>
    {/* Heart with EKG line through it */}
    <path d="M12 19l-6-5a3.5 3.5 0 015-5 3.5 3.5 0 015 0 3.5 3.5 0 011 5z" strokeWidth="1.8" />
    <path d="M5 12h2l1.5-2 2 4 1-2 2 1" strokeWidth="1.3" />
  </>
));
const ICON_MORNING = Icon('#fbbf24', (
  <>
    {/* Half sun rising over horizon */}
    <circle cx="12" cy="14" r="4" strokeWidth="2" />
    <line x1="3" y1="20" x2="21" y2="20" strokeWidth="2" />
    {/* Sun rays */}
    <line x1="12" y1="4" x2="12" y2="6" strokeWidth="1.6" />
    <line x1="6"  y1="7" x2="7.5" y2="9" strokeWidth="1.6" />
    <line x1="18" y1="7" x2="16.5" y2="9" strokeWidth="1.6" />
    <line x1="4"  y1="14" x2="6"  y2="14" strokeWidth="1.6" />
    <line x1="18" y1="14" x2="20" y2="14" strokeWidth="1.6" />
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
    {/* Circular arrow representing same routine on repeat */}
    <path d="M20 12a8 8 0 11-3-6.2" strokeWidth="2" />
    <polyline points="20 4 20 9 15 9" strokeWidth="2" />
  </>
));
const ICON_LIMIT = Icon('#ef4444', (
  <>
    {/* Barbell flat — "didn't push it" */}
    <rect x="9" y="9" width="6" height="6" rx="1" strokeWidth="2" />
    <line x1="2" y1="12" x2="9" y2="12" strokeWidth="2" />
    <line x1="15" y1="12" x2="22" y2="12" strokeWidth="2" />
    {/* Stoppers each end */}
    <line x1="2"  y1="9" x2="2"  y2="15" strokeWidth="2.2" />
    <line x1="22" y1="9" x2="22" y2="15" strokeWidth="2.2" />
  </>
));
const ICON_INVISIBLE = Icon('#94a3b8', (
  <>
    {/* Crossed-out eye */}
    <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3" strokeWidth="1.6" />
    <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2" />
  </>
));
const ICON_INCONSISTENT = Icon('#a855f7', (
  <>
    {/* Wavy zigzag — "all over the place" */}
    <path d="M3 8l3 4-3 4M9 6l3 6-3 6M15 8l3 4-3 4" strokeWidth="2" />
  </>
));
const ICON_DISTRACTED = Icon('#22d3ee', (
  <>
    {/* Center dot with scattered arrows pointing AWAY */}
    <circle cx="12" cy="12" r="1.5" strokeWidth="1.6" />
    <path d="M12 7l-2 -3M12 17l2 3M7 12l-3 -2M17 12l3 2M7 7l-3 -3M17 17l3 3M7 17l-3 3M17 7l3 -3" strokeWidth="1.4" />
  </>
));
const ICON_BROKEN_CHAIN = Icon('#f59e0b', (
  <>
    {/* Two chain links with break gap */}
    <path d="M9 11a3 3 0 11-3 3" strokeWidth="2" />
    <path d="M15 13a3 3 0 113-3" strokeWidth="2" />
    {/* Break gap — diagonal slash */}
    <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2.2" />
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
function BodyFigure({ highlight = [], weak = [], scale = 1, idSuffix = '' }: BodyFigureProps) {
  const baseId = `bf-base${idSuffix}`;
  const hotId = `bf-hot${idSuffix}`;
  const dimRedId = `bf-dim${idSuffix}`;
  const shineId = `bf-shine${idSuffix}`;
  const isHot = (m: AnatomyMuscle) => highlight.includes(m);
  const isWeak = (m: AnatomyMuscle) => weak.includes(m);
  const fillFor = (m: AnatomyMuscle) =>
    isHot(m) ? `url(#${hotId})` : isWeak(m) ? `url(#${dimRedId})` : `url(#${baseId})`;

  const w = 160 * scale;
  const h = 280 * scale;

  // Single silhouette outline path — one continuous shape covering
  // head + neck + shoulders + arms + torso + legs. Proportional
  // (head ~1/8 of body), smoothly curved transitions.
  const SILHOUETTE = `
    M 80 12
    C 71 12  64 18  64 30
    C 64 38  68 44  72 47
    L 72 50
    C 64 50  56 54  50 60
    C 46 64  46 68  50 70
    L 52 76
    C 50 80  46 90  46 102
    L 50 134
    C 50 142  52 148  54 152
    L 52 158
    C 50 168  50 180  50 196
    L 52 220
    C 52 230  54 240  56 248
    L 56 256
    C 56 260  58 264  62 264
    L 70 264
    C 73 264  74 260  74 256
    L 74 230
    C 74 220  76 200  78 188
    L 80 184
    L 82 188
    C 84 200  86 220  86 230
    L 86 256
    C 86 260  87 264  90 264
    L 98 264
    C 102 264  104 260  104 256
    L 104 248
    C 106 240  108 230  108 220
    L 110 196
    C 110 180  110 168  108 158
    L 106 152
    C 108 148  110 142  110 134
    L 114 102
    C 114 90  110 80  108 76
    L 110 70
    C 114 68  114 64  110 60
    C 104 54  96 50  88 50
    L 88 47
    C 92 44  96 38  96 30
    C 96 18  89 12  80 12
    Z`;

  return (
    <svg width={w} height={h} viewBox="0 0 160 280" fill="none">
      <defs>
        {/* Base — cool slate gradient for the resting silhouette */}
        <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#475569" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        {/* Hot — saturated red→amber for highlighted muscles */}
        <linearGradient id={hotId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fde68a" />
          <stop offset="40%" stopColor="#fb923c" />
          <stop offset="80%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        {/* Weak — desaturated red for blind-spot muscles */}
        <linearGradient id={dimRedId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#7f1d1d" />
          <stop offset="100%" stopColor="#3a0a0a" />
        </linearGradient>
        {/* Body shine */}
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="65%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Clip the muscle overlays to the silhouette so highlights
            never bleed outside the body outline */}
        <clipPath id={`bf-clip${idSuffix}`}>
          <path d={SILHOUETTE} />
        </clipPath>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="80" cy="270" rx="42" ry="4" fill="#000000" opacity="0.4" />

      {/* Base silhouette */}
      <path d={SILHOUETTE} fill={`url(#${baseId})`} />

      {/* Muscle highlight overlays — clipped to silhouette */}
      <g clipPath={`url(#bf-clip${idSuffix})`}>
        {/* Shoulders / deltoids */}
        {(isHot('shoulders') || isWeak('shoulders')) && (
          <>
            <ellipse cx="52" cy="60" rx="11" ry="10" fill={fillFor('shoulders')} />
            <ellipse cx="108" cy="60" rx="11" ry="10" fill={fillFor('shoulders')} />
          </>
        )}
        {/* Chest — pec plates */}
        {(isHot('chest') || isWeak('chest')) && (
          <>
            <path d="M 56 64 Q 78 62 80 66 L 80 92 Q 68 96 60 90 Q 54 80 56 64 Z" fill={fillFor('chest')} />
            <path d="M 104 64 Q 82 62 80 66 L 80 92 Q 92 96 100 90 Q 106 80 104 64 Z" fill={fillFor('chest')} />
          </>
        )}
        {/* Biceps */}
        {(isHot('biceps') || isWeak('biceps')) && (
          <>
            <ellipse cx="50" cy="86" rx="6" ry="14" fill={fillFor('biceps')} />
            <ellipse cx="110" cy="86" rx="6" ry="14" fill={fillFor('biceps')} />
          </>
        )}
        {/* Forearms */}
        {(isHot('forearms') || isWeak('forearms')) && (
          <>
            <ellipse cx="50" cy="120" rx="5" ry="14" fill={fillFor('forearms')} />
            <ellipse cx="110" cy="120" rx="5" ry="14" fill={fillFor('forearms')} />
          </>
        )}
        {/* Lats */}
        {(isHot('lats') || isWeak('lats')) && (
          <>
            <path d="M 56 80 Q 52 110 56 132 L 64 132 Q 64 108 64 80 Z" fill={fillFor('lats')} />
            <path d="M 104 80 Q 108 110 104 132 L 96 132 Q 96 108 96 80 Z" fill={fillFor('lats')} />
          </>
        )}
        {/* Abs */}
        {(isHot('abs') || isWeak('abs')) && (
          <>
            <rect x="68" y="92" width="24" height="46" rx="2" fill={fillFor('abs')} />
            <line x1="80" y1="92" x2="80" y2="138" stroke="#0c1322" strokeWidth="0.8" opacity="0.55" />
            <line x1="68" y1="104" x2="92" y2="104" stroke="#0c1322" strokeWidth="0.7" opacity="0.5" />
            <line x1="68" y1="116" x2="92" y2="116" stroke="#0c1322" strokeWidth="0.7" opacity="0.5" />
            <line x1="68" y1="128" x2="92" y2="128" stroke="#0c1322" strokeWidth="0.7" opacity="0.5" />
          </>
        )}
        {/* Obliques */}
        {(isHot('obliques') || isWeak('obliques')) && (
          <>
            <path d="M 60 110 Q 56 132 60 144 L 68 144 Q 68 122 68 110 Z" fill={fillFor('obliques')} />
            <path d="M 100 110 Q 104 132 100 144 L 92 144 Q 92 122 92 110 Z" fill={fillFor('obliques')} />
          </>
        )}
        {/* Quads */}
        {(isHot('quads') || isWeak('quads')) && (
          <>
            <ellipse cx="64" cy="195" rx="9" ry="32" fill={fillFor('quads')} />
            <ellipse cx="96" cy="195" rx="9" ry="32" fill={fillFor('quads')} />
          </>
        )}
        {/* Calves */}
        {(isHot('calves') || isWeak('calves')) && (
          <>
            <ellipse cx="65" cy="246" rx="6" ry="13" fill={fillFor('calves')} />
            <ellipse cx="95" cy="246" rx="6" ry="13" fill={fillFor('calves')} />
          </>
        )}
      </g>

      {/* Subtle body line markings — chest centerline + ab grid hint
          even on resting state, so the figure has anatomy hints */}
      <line x1="80" y1="56" x2="80" y2="138" stroke="#0c1322" strokeWidth="0.6" opacity="0.45" />
      <path d="M 56 92 Q 70 95 80 95" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 104 92 Q 90 95 80 95" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 60 152 Q 80 155 100 152" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.45" />

      {/* Whole-body specular shine */}
      <path d={SILHOUETTE} fill={`url(#${shineId})`} opacity="0.55" />

      {/* Outline stroke for definition */}
      <path d={SILHOUETTE} fill="none" stroke="#0c1322" strokeWidth="1" opacity="0.4" />
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
