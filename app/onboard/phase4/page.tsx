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
  const shadowId = `bf-shadow${idSuffix}`;
  const isHot = (m: AnatomyMuscle) => highlight.includes(m);
  const isWeak = (m: AnatomyMuscle) => weak.includes(m);
  const fillFor = (m: AnatomyMuscle) =>
    isHot(m) ? `url(#${hotId})` : isWeak(m) ? `url(#${dimRedId})` : `url(#${baseId})`;

  const w = 140 * scale;
  const h = 280 * scale;

  return (
    <svg width={w} height={h} viewBox="0 0 140 280" fill="none">
      <defs>
        {/* Base muscle — slate to navy. Lighter top, darker bottom for
            depth. */}
        <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#64748b" />
          <stop offset="40%" stopColor="#334155" />
          <stop offset="80%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0c1322" />
        </linearGradient>
        {/* Hot muscle — saturated amber to deep red */}
        <linearGradient id={hotId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#fef3c7" />
          <stop offset="20%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="85%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        {/* Weak muscle — desaturated dark red */}
        <linearGradient id={dimRedId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#9a1717" />
          <stop offset="50%" stopColor="#5c0c0c" />
          <stop offset="100%" stopColor="#2a0606" />
        </linearGradient>
        {/* Specular sheen */}
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* Drop shadow under figure */}
        <radialGradient id={shadowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Floor shadow */}
      <ellipse cx="70" cy="274" rx="36" ry="5" fill={`url(#${shadowId})`} />

      {/* Head — oval with a soft jawline */}
      <path
        d="M 70 6 Q 56 6 54 18 Q 53 28 56 35 Q 60 42 70 42 Q 80 42 84 35 Q 87 28 86 18 Q 84 6 70 6 Z"
        fill={`url(#${baseId})`}
      />
      {/* Cheek shadow */}
      <path d="M 56 24 Q 60 32 70 36 Q 80 32 84 24" stroke="#0c1322" strokeWidth="0.4" fill="none" opacity="0.5" />

      {/* Neck */}
      <path d="M 63 38 Q 63 44 60 50 Q 70 52 80 50 Q 77 44 77 38 Z" fill={`url(#${baseId})`} />

      {/* Trapezius (back of neck to shoulders) */}
      <path
        d="M 56 50 Q 42 52 28 58 Q 22 60 22 64 L 118 64 Q 118 60 112 58 Q 98 52 84 50 Q 78 53 70 54 Q 62 53 56 50 Z"
        fill={`url(#${baseId})`}
      />

      {/* Deltoids — wider and more rounded */}
      <ellipse cx="24" cy="68" rx="14" ry="14" fill={fillFor('shoulders')} />
      <ellipse cx="116" cy="68" rx="14" ry="14" fill={fillFor('shoulders')} />
      {/* Delt fiber striations */}
      <path d="M 14 64 Q 22 60 30 65" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 110 64 Q 118 60 126 65" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 14 72 Q 22 76 30 73" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 110 72 Q 118 76 126 73" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />

      {/* Upper chest — pec plates with anatomical shape */}
      <path
        d="M 38 64 Q 60 62 68 66 L 68 100 Q 56 102 44 96 Q 34 90 34 80 Z"
        fill={fillFor('chest')}
      />
      <path
        d="M 102 64 Q 80 62 72 66 L 72 100 Q 84 102 96 96 Q 106 90 106 80 Z"
        fill={fillFor('chest')}
      />
      {/* Pec separation crease */}
      <line x1="70" y1="66" x2="70" y2="100" stroke="#0c1322" strokeWidth="1.2" opacity="0.65" />
      {/* Pec underline */}
      <path d="M 36 90 Q 50 98 68 98" stroke="#0c1322" strokeWidth="0.7" fill="none" opacity="0.45" />
      <path d="M 104 90 Q 90 98 72 98" stroke="#0c1322" strokeWidth="0.7" fill="none" opacity="0.45" />

      {/* Biceps — pronounced peaks */}
      <path
        d="M 12 76 Q 8 96 14 116 L 28 116 Q 32 96 28 74 Q 20 70 12 76 Z"
        fill={fillFor('biceps')}
      />
      <path
        d="M 128 76 Q 132 96 126 116 L 112 116 Q 108 96 112 74 Q 120 70 128 76 Z"
        fill={fillFor('biceps')}
      />
      {/* Bicep peak highlight */}
      <ellipse cx="20" cy="90" rx="4" ry="9" fill={fillFor('biceps')} opacity="0.5" />
      <ellipse cx="120" cy="90" rx="4" ry="9" fill={fillFor('biceps')} opacity="0.5" />
      {/* Bicep/tricep separation */}
      <path d="M 14 80 Q 18 94 16 110" stroke="#0c1322" strokeWidth="0.6" fill="none" opacity="0.5" />
      <path d="M 126 80 Q 122 94 124 110" stroke="#0c1322" strokeWidth="0.6" fill="none" opacity="0.5" />

      {/* Forearms — tapered */}
      <path
        d="M 14 116 Q 11 134 14 150 L 26 150 Q 30 134 28 116 Z"
        fill={fillFor('forearms')}
      />
      <path
        d="M 126 116 Q 129 134 126 150 L 114 150 Q 110 134 112 116 Z"
        fill={fillFor('forearms')}
      />
      {/* Forearm muscle definition */}
      <path d="M 18 122 Q 20 134 18 146" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />
      <path d="M 122 122 Q 120 134 122 146" stroke="#0c1322" strokeWidth="0.5" fill="none" opacity="0.4" />

      {/* Lats — visible from front along the sides */}
      <path
        d="M 34 80 Q 28 110 32 130 L 40 130 Q 40 110 40 80 Z"
        fill={fillFor('lats')}
      />
      <path
        d="M 106 80 Q 112 110 108 130 L 100 130 Q 100 110 100 80 Z"
        fill={fillFor('lats')}
      />

      {/* Mid torso — serratus + transition */}
      <path d="M 40 100 L 100 100 L 96 130 Q 86 138 70 138 Q 54 138 44 130 Z" fill={`url(#${baseId})`} />

      {/* Obliques — V-cut at the waist */}
      <path d="M 44 130 Q 38 142 40 154 L 52 154 Q 52 138 52 130 Z" fill={fillFor('obliques')} />
      <path d="M 96 130 Q 102 142 100 154 L 88 154 Q 88 138 88 130 Z" fill={fillFor('obliques')} />

      {/* Abs — 6-pack grid with deeper separations */}
      <g>
        <rect x="55" y="100" width="30" height="44" rx="2" fill={fillFor('abs')} />
        <line x1="70" y1="100" x2="70" y2="144" stroke="#0c1322" strokeWidth="1" opacity={isHot('abs') ? 0.7 : 0.55} />
        <line x1="55" y1="112" x2="85" y2="112" stroke="#0c1322" strokeWidth="0.8" opacity={isHot('abs') ? 0.7 : 0.5} />
        <line x1="55" y1="124" x2="85" y2="124" stroke="#0c1322" strokeWidth="0.8" opacity={isHot('abs') ? 0.7 : 0.5} />
        <line x1="55" y1="136" x2="85" y2="136" stroke="#0c1322" strokeWidth="0.8" opacity={isHot('abs') ? 0.7 : 0.5} />
        {/* Ab brightness highlights when hot */}
        {isHot('abs') && (
          <>
            <rect x="56" y="101" width="13" height="10" rx="1" fill="#ffffff" opacity="0.18" />
            <rect x="71" y="101" width="13" height="10" rx="1" fill="#ffffff" opacity="0.18" />
          </>
        )}
      </g>

      {/* Hip waistband / pelvis */}
      <path d="M 40 152 Q 46 158 70 158 Q 94 158 100 152 L 102 168 Q 88 172 70 172 Q 52 172 38 168 Z" fill={`url(#${baseId})`} />

      {/* Quads — distinct outer + inner separation */}
      <path d="M 44 170 Q 38 200 38 234 L 56 234 Q 64 200 64 170 Z" fill={fillFor('quads')} />
      <path d="M 96 170 Q 102 200 102 234 L 84 234 Q 76 200 76 170 Z" fill={fillFor('quads')} />
      {/* Vastus lateralis (outer thigh ridge) */}
      <path d="M 42 178 Q 40 200 42 226" stroke="#0c1322" strokeWidth="0.6" fill="none" opacity="0.45" />
      <path d="M 98 178 Q 100 200 98 226" stroke="#0c1322" strokeWidth="0.6" fill="none" opacity="0.45" />
      {/* Inner-thigh separation */}
      <path d="M 58 178 Q 58 200 58 230" stroke="#0c1322" strokeWidth="0.7" fill="none" opacity="0.55" />
      <path d="M 82 178 Q 82 200 82 230" stroke="#0c1322" strokeWidth="0.7" fill="none" opacity="0.55" />

      {/* Knee caps */}
      <ellipse cx="50" cy="237" rx="6" ry="3.5" fill={`url(#${baseId})`} />
      <ellipse cx="90" cy="237" rx="6" ry="3.5" fill={`url(#${baseId})`} />

      {/* Calves — diamond shape */}
      <path d="M 44 242 Q 38 256 44 272 L 56 272 Q 60 256 56 242 Z" fill={fillFor('calves')} />
      <path d="M 96 242 Q 102 256 96 272 L 84 272 Q 80 256 84 242 Z" fill={fillFor('calves')} />
      {/* Calf muscle bulge highlight */}
      <ellipse cx="50" cy="252" rx="3" ry="6" fill={fillFor('calves')} opacity="0.55" />
      <ellipse cx="90" cy="252" rx="3" ry="6" fill={fillFor('calves')} opacity="0.55" />

      {/* Whole-body shine — narrow vertical strip down the middle */}
      <ellipse cx="70" cy="140" rx="50" ry="130" fill={`url(#${shineId})`} opacity="0.7" />
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
