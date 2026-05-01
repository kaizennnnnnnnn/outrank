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
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill={shape.color} fillOpacity={active ? 0.9 : 0.18} />
    <g
      stroke={active ? '#0c0c14' : shape.color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {shape.body}
    </g>
  </svg>
);

const STRUGGLE_BACK = Icon('#f97316', (
  <>
    <path d="M8 5a4 4 0 018 0v3" />
    <path d="M7 9c-1.5 0-2 3 0 7c1.5 3 3 4 5 4s3.5-1 5-4c2-4 1.5-7 0-7" />
    <line x1="12" y1="11" x2="12" y2="18" />
  </>
));
const STRUGGLE_KNEE = Icon('#fb923c', (
  <>
    <path d="M9 4v5l-2 4 2 5" />
    <path d="M15 4v5l2 4-2 5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.15" />
  </>
));
const STRUGGLE_SHOULDER = Icon('#ef4444', (
  <>
    <path d="M4 12c0-4 4-6 8-6s8 2 8 6" />
    <circle cx="6" cy="9" r="2" fill="currentColor" fillOpacity="0.2" />
    <circle cx="18" cy="9" r="2" fill="currentColor" fillOpacity="0.2" />
    <line x1="6" y1="13" x2="6" y2="20" />
    <line x1="18" y1="13" x2="18" y2="20" />
  </>
));
const STRUGGLE_WRIST = Icon('#f59e0b', (
  <>
    <path d="M7 4v6a5 5 0 0010 0V4" />
    <rect x="8" y="14" width="8" height="6" rx="1.5" fill="currentColor" fillOpacity="0.2" />
  </>
));
const ICON_SLEEP = Icon('#8b5cf6', (
  <>
    <path d="M21 12.5A9 9 0 1111.5 3 7 7 0 0021 12.5z" fill="currentColor" fillOpacity="0.2" />
    <circle cx="14" cy="9" r="0.6" fill="currentColor" />
    <circle cx="17" cy="11" r="0.4" fill="currentColor" />
  </>
));
const ICON_PHONE = Icon('#3b82f6', (
  <>
    <rect x="6" y="3" width="12" height="18" rx="2" fill="currentColor" fillOpacity="0.18" />
    <line x1="11" y1="18" x2="13" y2="18" />
    <path d="M9 7l1.5 1.5L13 6" />
  </>
));
const ICON_WATER = Icon('#0ea5e9', (
  <>
    <path d="M12 3s-6 7-6 12a6 6 0 0012 0c0-5-6-12-6-12z" fill="currentColor" fillOpacity="0.25" />
  </>
));
const ICON_ENERGY = Icon('#facc15', (
  <>
    <rect x="3" y="8" width="14" height="8" rx="1.5" fill="currentColor" fillOpacity="0.15" />
    <rect x="17" y="10" width="2.5" height="4" rx="0.5" fill="currentColor" />
    <rect x="5" y="10" width="3.5" height="4" rx="0.5" fill="currentColor" fillOpacity="0.5" />
  </>
));
const ICON_STRESS = Icon('#ec4899', (
  <>
    <path d="M3 12h3l2-5 4 10 2-5h7" />
  </>
));
const ICON_MORNING = Icon('#fbbf24', (
  <>
    <circle cx="12" cy="13" r="5" fill="currentColor" fillOpacity="0.25" />
    <line x1="12" y1="3" x2="12" y2="6" />
    <line x1="5"  y1="6" x2="7"  y2="8" />
    <line x1="19" y1="6" x2="17" y2="8" />
    <line x1="3" y1="13" x2="5" y2="13" />
    <line x1="19" y1="13" x2="21" y2="13" />
    <line x1="2" y1="20" x2="22" y2="20" />
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
    <path d="M21 12a9 9 0 11-3-6.7" />
    <polyline points="21 4 21 11 14 11" />
  </>
));
const ICON_LIMIT = Icon('#ef4444', (
  <>
    <rect x="2" y="9" width="20" height="6" rx="1" fill="currentColor" fillOpacity="0.18" />
    <rect x="6" y="5" width="2.5" height="14" rx="0.5" fill="currentColor" />
    <rect x="15.5" y="5" width="2.5" height="14" rx="0.5" fill="currentColor" />
  </>
));
const ICON_INVISIBLE = Icon('#94a3b8', (
  <>
    <path d="M3 12s4-7 9-7 9 7 9 7" opacity="0.5" />
    <line x1="3" y1="3" x2="21" y2="21" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.3" />
  </>
));
const ICON_INCONSISTENT = Icon('#a855f7', (
  <>
    <path d="M21 12.5A9 9 0 1111.5 3 7 7 0 0021 12.5z" fill="currentColor" fillOpacity="0.2" />
    <path d="M3 18l2-2 2 3 3-3 2 2 3-2 2 2" />
  </>
));
const ICON_DISTRACTED = Icon('#22d3ee', (
  <>
    <line x1="5" y1="5" x2="9" y2="9" />
    <line x1="19" y1="5" x2="15" y2="9" />
    <line x1="5" y1="19" x2="9" y2="15" />
    <line x1="19" y1="19" x2="15" y2="15" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.3" />
  </>
));
const ICON_BROKEN_CHAIN = Icon('#f59e0b', (
  <>
    <path d="M10 11l-2 2a2.5 2.5 0 010-3.5l1.5-1.5a2.5 2.5 0 013.5 0L14 9" />
    <path d="M14 13l2-2a2.5 2.5 0 010 3.5l-1.5 1.5a2.5 2.5 0 01-3.5 0L10 15" />
    <line x1="3" y1="3" x2="21" y2="21" />
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

function BodyFigure({ highlight = [], weak = [], scale = 1, idSuffix = '' }: BodyFigureProps) {
  const baseId = `bf-base${idSuffix}`;
  const hotId = `bf-hot${idSuffix}`;
  const dimRedId = `bf-dim${idSuffix}`;
  const shineId = `bf-shine${idSuffix}`;
  const isHot = (m: AnatomyMuscle) => highlight.includes(m);
  const isWeak = (m: AnatomyMuscle) => weak.includes(m);
  const fillFor = (m: AnatomyMuscle) =>
    isHot(m) ? `url(#${hotId})` : isWeak(m) ? `url(#${dimRedId})` : `url(#${baseId})`;

  const w = 110 * scale;
  const h = 220 * scale;

  return (
    <svg width={w} height={h} viewBox="0 0 110 220" fill="none">
      <defs>
        {/* Base muscle (cool, dim) — light slate to dark navy */}
        <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#475569" />
          <stop offset="55%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0c1322" />
        </linearGradient>
        {/* Hot muscle — bright amber to deep red */}
        <linearGradient id={hotId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fde68a" />
          <stop offset="35%" stopColor="#fb923c" />
          <stop offset="80%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        {/* Weak muscle — desaturated dark red */}
        <linearGradient id={dimRedId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#7f1d1d" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3a0a0a" stopOpacity="0.85" />
        </linearGradient>
        {/* Specular sheen — top-left quarter */}
        <radialGradient id={shineId} cx="32%" cy="22%" r="60%">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Head + neck */}
      <ellipse cx="55" cy="18" rx="11" ry="13" fill={`url(#${baseId})`} />
      <ellipse cx="55" cy="18" rx="11" ry="13" fill={`url(#${shineId})`} />
      <rect x="50" y="29" width="10" height="7" fill={`url(#${baseId})`} />

      {/* Trapezius — slope from neck to shoulders */}
      <path d="M 50 36 Q 38 38 30 44 Q 28 46 30 48 L 80 48 Q 82 46 80 44 Q 72 38 60 36 Z" fill={`url(#${baseId})`} />

      {/* Shoulders / deltoids */}
      <ellipse cx="22" cy="50" rx="10" ry="12" fill={fillFor('shoulders')} />
      <ellipse cx="88" cy="50" rx="10" ry="12" fill={fillFor('shoulders')} />

      {/* Pecs — two distinct chest plates */}
      <path d="M 32 48 Q 50 50 54 52 L 54 76 Q 46 78 38 76 Q 30 72 30 60 Z" fill={fillFor('chest')} />
      <path d="M 78 48 Q 60 50 56 52 L 56 76 Q 64 78 72 76 Q 80 72 80 60 Z" fill={fillFor('chest')} />
      {/* Pec separation line */}
      <line x1="55" y1="50" x2="55" y2="76" stroke="#0c1322" strokeWidth="0.8" opacity="0.6" />

      {/* Biceps */}
      <path d="M 14 56 Q 10 70 14 86 L 22 86 Q 24 70 22 56 Z" fill={fillFor('biceps')} />
      <path d="M 96 56 Q 100 70 96 86 L 88 86 Q 86 70 88 56 Z" fill={fillFor('biceps')} />
      {/* Bicep peak hint */}
      <ellipse cx="18" cy="68" rx="3" ry="6" fill={fillFor('biceps')} opacity="0.55" />
      <ellipse cx="92" cy="68" rx="3" ry="6" fill={fillFor('biceps')} opacity="0.55" />

      {/* Forearms */}
      <path d="M 14 88 Q 12 102 16 114 L 22 114 Q 24 102 22 88 Z" fill={fillFor('forearms')} />
      <path d="M 96 88 Q 98 102 94 114 L 88 114 Q 86 102 88 88 Z" fill={fillFor('forearms')} />

      {/* Lats — visible side panels under armpit */}
      <path d="M 30 60 Q 26 80 30 100 L 36 100 Q 36 78 36 60 Z" fill={fillFor('lats')} opacity="0.85" />
      <path d="M 80 60 Q 84 80 80 100 L 74 100 Q 74 78 74 60 Z" fill={fillFor('lats')} opacity="0.85" />

      {/* Torso fill (under pecs) */}
      <path d="M 32 76 L 78 76 L 76 100 Q 70 110 55 110 Q 40 110 34 100 Z" fill={`url(#${baseId})`} />

      {/* Obliques — diagonal cuts at sides of waist */}
      <path d="M 34 100 Q 30 110 32 120 L 40 120 Q 40 108 40 100 Z" fill={fillFor('obliques')} />
      <path d="M 76 100 Q 80 110 78 120 L 70 120 Q 70 108 70 100 Z" fill={fillFor('obliques')} />

      {/* Abs — 6-pack grid */}
      <g>
        <rect x="46" y="78" width="18" height="34" rx="1" fill={fillFor('abs')} />
        <line x1="55" y1="78" x2="55" y2="112" stroke="#0c1322" strokeWidth="0.5" opacity={isHot('abs') || isWeak('abs') ? '0.7' : '0.4'} />
        <line x1="46" y1="86" x2="64" y2="86" stroke="#0c1322" strokeWidth="0.5" opacity={isHot('abs') || isWeak('abs') ? '0.7' : '0.4'} />
        <line x1="46" y1="96" x2="64" y2="96" stroke="#0c1322" strokeWidth="0.5" opacity={isHot('abs') || isWeak('abs') ? '0.7' : '0.4'} />
        <line x1="46" y1="106" x2="64" y2="106" stroke="#0c1322" strokeWidth="0.5" opacity={isHot('abs') || isWeak('abs') ? '0.7' : '0.4'} />
      </g>

      {/* Hip waistband */}
      <path d="M 32 118 Q 36 122 55 122 Q 74 122 78 118 L 80 132 Q 70 134 55 134 Q 40 134 30 132 Z" fill={`url(#${baseId})`} />

      {/* Quads */}
      <path d="M 36 134 Q 32 156 32 184 L 44 184 Q 50 156 50 134 Z" fill={fillFor('quads')} />
      <path d="M 74 134 Q 78 156 78 184 L 66 184 Q 60 156 60 134 Z" fill={fillFor('quads')} />
      {/* Quad inner separation */}
      <line x1="46" y1="138" x2="46" y2="180" stroke="#0c1322" strokeWidth="0.6" opacity="0.5" />
      <line x1="64" y1="138" x2="64" y2="180" stroke="#0c1322" strokeWidth="0.6" opacity="0.5" />

      {/* Knees */}
      <ellipse cx="40" cy="186" rx="5" ry="3" fill={`url(#${baseId})`} />
      <ellipse cx="70" cy="186" rx="5" ry="3" fill={`url(#${baseId})`} />

      {/* Calves */}
      <path d="M 36 190 Q 32 206 38 218 L 44 218 Q 46 204 44 190 Z" fill={fillFor('calves')} />
      <path d="M 74 190 Q 78 206 72 218 L 66 218 Q 64 204 66 190 Z" fill={fillFor('calves')} />

      {/* Specular sheen across whole body */}
      <ellipse cx="55" cy="100" rx="55" ry="120" fill={`url(#${shineId})`} opacity="0.4" />
    </svg>
  );
}

/**
 * Two anatomically-detailed body figures side-by-side, both dim — the
 * point being there's no visible difference between Week 1 and Week 6.
 * "?" + "=" between them drives the message home.
 */
function MirrorVisual() {
  return (
    <div className="flex items-end justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <BodyFigure scale={0.85} idSuffix="-l" />
        <span className="text-[9px] uppercase tracking-[2px] text-slate-500 font-mono">Week 1</span>
      </div>
      <div className="flex flex-col items-center gap-1 mb-6">
        <span className="text-2xl text-red-400 font-bold leading-none">?</span>
        <div className="flex flex-col gap-0.5">
          <span className="block w-7 h-0.5 rounded-full bg-orange-400" />
          <span className="block w-7 h-0.5 rounded-full bg-orange-400" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <BodyFigure scale={0.85} idSuffix="-r" />
        <span className="text-[9px] uppercase tracking-[2px] text-slate-500 font-mono">Week 6</span>
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

/** Mountain with a path zigzagging up to a glowing rank crystal at the peak. */
function PathVisual() {
  return (
    <svg width="220" height="180" viewBox="0 0 220 180" fill="none">
      <defs>
        <linearGradient id="mountainBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="crystalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Back mountain */}
      <path d="M 20 160 L 70 70 L 110 110 L 150 60 L 200 160 Z" fill="url(#mountainBg)" />
      {/* Front mountain */}
      <path d="M 30 160 L 90 80 L 130 130 L 170 90 L 210 160 Z" fill="#0c0c14" stroke="#1e293b" strokeWidth="1" />
      {/* Snow caps on peaks */}
      <path d="M 85 86 L 92 78 L 100 90 Z" fill="#475569" opacity="0.6" />
      <path d="M 165 96 L 170 88 L 178 100 Z" fill="#475569" opacity="0.6" />
      {/* Path winding up — dashed */}
      <path
        d="M 110 160 Q 100 145 115 130 Q 130 115 120 100 Q 105 88 115 80"
        stroke="#fb923c"
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Crystal glow */}
      <circle cx={115} cy={68} r={28} fill="url(#crystalGlow)" />
      {/* Crystal — hex shape */}
      <path
        d="M 115 50 L 128 60 L 128 76 L 115 86 L 102 76 L 102 60 Z"
        fill="url(#crystalGrad)"
        stroke="#fef3c7"
        strokeWidth="0.8"
      />
      {/* Crystal facets */}
      <path d="M 115 50 L 115 86 M 102 60 L 128 76 M 102 76 L 128 60" stroke="#fef3c7" strokeWidth="0.4" opacity="0.6" />
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
