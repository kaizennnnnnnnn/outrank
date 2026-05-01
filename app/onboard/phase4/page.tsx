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

// Tiny inline SVGs for each struggle — kept simple (24x24 viewBox,
// stroke-based) so they read well at the chip's icon-square size.

const Icon = (children: React.ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const STRUGGLE_BACK = Icon(
  <>
    <path d="M9 3a3 3 0 016 0v3" />
    <path d="M7 7c-2 0-2 4 0 7s3 4 5 4 3-1 5-4 2-7 0-7" />
    <path d="M12 21v-4" />
  </>
);
const STRUGGLE_KNEE = Icon(
  <>
    <path d="M10 3v6l-3 6 3 5" />
    <path d="M14 3v6l3 6-3 5" />
    <circle cx="12" cy="11" r="3" />
  </>
);
const STRUGGLE_SHOULDER = Icon(
  <>
    <path d="M5 12c0-3 3-5 7-5s7 2 7 5" />
    <path d="M5 12v6h3v-3" />
    <path d="M19 12v6h-3v-3" />
    <circle cx="6" cy="10" r="1.5" />
    <circle cx="18" cy="10" r="1.5" />
  </>
);
const STRUGGLE_WRIST = Icon(
  <>
    <path d="M6 4v6a4 4 0 008 0V4" />
    <path d="M14 14v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4" />
    <path d="M9 14h6" />
  </>
);
const ICON_SLEEP = Icon(
  <>
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </>
);
const ICON_PHONE = Icon(
  <>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="11" y1="18" x2="13" y2="18" />
    <path d="M9 6l1.5 1.5L13 5" />
  </>
);
const ICON_WATER = Icon(
  <>
    <path d="M12 3s-6 6-6 11a6 6 0 0012 0c0-5-6-11-6-11z" />
  </>
);
const ICON_ENERGY = Icon(
  <>
    <rect x="3" y="8" width="16" height="8" rx="1.5" />
    <line x1="20" y1="11" x2="22" y2="11" />
    <line x1="20" y1="13" x2="22" y2="13" />
    <line x1="6" y1="11" x2="9" y2="11" />
  </>
);
const ICON_STRESS = Icon(
  <>
    <path d="M3 12h3l2-5 4 10 2-5h7" />
  </>
);
const ICON_MORNING = Icon(
  <>
    <path d="M12 4v3" />
    <path d="M5.6 7.6l2.1 2.1" />
    <path d="M16.3 9.7l2.1-2.1" />
    <path d="M2 17h20" />
    <path d="M5 13a7 7 0 0114 0" />
  </>
);

const STRUGGLES_BODY: { key: StruggleKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sensitive_back',      label: 'Sensitive back',      icon: STRUGGLE_BACK },
  { key: 'sensitive_knees',     label: 'Sensitive knees',     icon: STRUGGLE_KNEE },
  { key: 'sensitive_shoulders', label: 'Sensitive shoulders', icon: STRUGGLE_SHOULDER },
  { key: 'sensitive_wrists',    label: 'Sensitive wrists',    icon: STRUGGLE_WRIST },
];

const STRUGGLES_LIFE: { key: StruggleKey; label: string; icon: React.ReactNode }[] = [
  { key: 'trouble_sleeping',       label: 'Trouble sleeping',       icon: ICON_SLEEP },
  { key: 'phone_addiction',        label: 'Phone addiction',        icon: ICON_PHONE },
  { key: 'forget_water',           label: 'Forget to drink water',  icon: ICON_WATER },
  { key: 'energy_crashes',         label: 'Energy crashes',         icon: ICON_ENERGY },
  { key: 'stress_anxiety',         label: 'Stress / anxiety',       icon: ICON_STRESS },
  { key: 'low_morning_motivation', label: 'Low morning motivation', icon: ICON_MORNING },
];

const ENERGY_OPTIONS: { key: EnergyLevel; label: string; sub: string }[] = [
  { key: 'low',    label: 'Low',    sub: "I'm often tired." },
  { key: 'medium', label: 'Medium', sub: 'It depends on the day.' },
  { key: 'high',   label: 'High',   sub: 'I have plenty of energy.' },
];

const ICON_LOOP = Icon(
  <>
    <path d="M21 12a9 9 0 11-3-6.7" />
    <polyline points="21 4 21 11 14 11" />
  </>
);
const ICON_LIMIT = Icon(
  <>
    <rect x="2" y="9" width="20" height="6" rx="1" />
    <rect x="6" y="6" width="2" height="12" rx="0.5" />
    <rect x="16" y="6" width="2" height="12" rx="0.5" />
  </>
);
const ICON_INVISIBLE = Icon(
  <>
    <path d="M3 12s4-7 9-7 9 7 9 7" opacity="0.4" />
    <path d="M2 2l20 20" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const ICON_INCONSISTENT = Icon(
  <>
    <path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7z" opacity="0" />
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    <path d="M2 18l3-2 2 3 3-3 2 2" />
  </>
);
const ICON_DISTRACTED = Icon(
  <>
    <path d="M5 5l3 3" />
    <path d="M19 5l-3 3" />
    <path d="M5 19l3-3" />
    <path d="M19 19l-3-3" />
    <circle cx="12" cy="12" r="3" />
  </>
);
const ICON_BROKEN_CHAIN = Icon(
  <>
    <path d="M9 11l-2 2a3 3 0 010-4l1-1" />
    <path d="M15 13l2-2a3 3 0 000-4l-1-1" />
    <line x1="11" y1="9" x2="9" y2="11" />
    <line x1="13" y1="13" x2="15" y2="11" />
    <line x1="3" y1="3" x2="21" y2="21" opacity="0.5" />
  </>
);

const STATEMENT_OPTIONS: { key: StatementKey; label: string; icon: React.ReactNode }[] = [
  { key: 'follow_same_routine',      label: "I follow the same routine every time and don't know what to change.", icon: ICON_LOOP },
  { key: 'dont_push_limits',         label: "I don't push myself as hard as I want to.",                            icon: ICON_LIMIT },
  { key: 'progress_invisible',       label: 'Progress feels invisible — effort never feels like results.',          icon: ICON_INVISIBLE },
  { key: 'inconsistent_sleep',       label: "My sleep is all over the place.",                                      icon: ICON_INCONSISTENT },
  { key: 'distracted_easily',        label: "I get distracted easily and lose focus.",                              icon: ICON_DISTRACTED },
  { key: 'cant_stick_with_anything', label: "I start strong but can't stick with anything long-term.",              icon: ICON_BROKEN_CHAIN },
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
  options: { key: T; label: string; icon?: React.ReactNode }[];
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
            {opt.icon && (
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  active
                    ? 'bg-orange-500/20 text-orange-200'
                    : 'bg-white/[0.04] text-slate-300',
                )}
              >
                {opt.icon}
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
 * Two anatomically-suggested body silhouettes side-by-side. Both are
 * identical (the whole point — "progress feels invisible"). Built from
 * proper torso + pec + lat + leg shapes with a subtle radial highlight
 * so they read as 3D bodies, not stick figures. An "=" between them
 * with a tiny "?" call-out drives the message home.
 */
function MirrorVisual() {
  return (
    <svg width="260" height="200" viewBox="0 0 260 200" fill="none">
      <defs>
        <linearGradient id="mvBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#475569" />
          <stop offset="60%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="mvShine" cx="35%" cy="20%" r="55%">
          <stop offset="0%"  stopColor="#94a3b8" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#94a3b8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[55, 205].map((cx, idx) => (
        <g key={idx}>
          {/* Head — slightly oval, with a neck */}
          <ellipse cx={cx} cy={32} rx={14} ry={16} fill="url(#mvBody)" />
          <ellipse cx={cx} cy={32} rx={14} ry={16} fill="url(#mvShine)" />
          <rect x={cx-5} y={46} width={10} height={6} fill="url(#mvBody)" />
          {/* Shoulders + traps — wider trapezoid */}
          <path
            d={`M ${cx-30} 60 Q ${cx-32} 56 ${cx-26} 54 Q ${cx-12} 50 ${cx} 50 Q ${cx+12} 50 ${cx+26} 54 Q ${cx+32} 56 ${cx+30} 60 Z`}
            fill="url(#mvBody)"
          />
          {/* Arms — taper from shoulder to wrist */}
          <path
            d={`M ${cx-30} 60 Q ${cx-36} 88 ${cx-32} 116 L ${cx-25} 116 Q ${cx-22} 90 ${cx-22} 64 Z`}
            fill="url(#mvBody)"
          />
          <path
            d={`M ${cx+30} 60 Q ${cx+36} 88 ${cx+32} 116 L ${cx+25} 116 Q ${cx+22} 90 ${cx+22} 64 Z`}
            fill="url(#mvBody)"
          />
          {/* Torso — pecs + lat sweep + waist taper */}
          <path
            d={`M ${cx-26} 60
                Q ${cx-30} 80 ${cx-24} 100
                Q ${cx-22} 116 ${cx-18} 130
                L ${cx+18} 130
                Q ${cx+22} 116 ${cx+24} 100
                Q ${cx+30} 80 ${cx+26} 60 Z`}
            fill="url(#mvBody)"
          />
          {/* Pec line down center */}
          <line x1={cx} y1={64} x2={cx} y2={108} stroke="#0f172a" strokeWidth="1" opacity="0.5" />
          {/* Pec curves */}
          <path d={`M ${cx-20} 70 Q ${cx-10} 86 ${cx} 86`} stroke="#0f172a" strokeWidth="1" fill="none" opacity="0.45" />
          <path d={`M ${cx+20} 70 Q ${cx+10} 86 ${cx} 86`} stroke="#0f172a" strokeWidth="1" fill="none" opacity="0.45" />
          {/* Abs hint */}
          <line x1={cx-6} y1={100} x2={cx+6} y2={100} stroke="#0f172a" strokeWidth="0.8" opacity="0.5" />
          <line x1={cx-6} y1={114} x2={cx+6} y2={114} stroke="#0f172a" strokeWidth="0.8" opacity="0.5" />
          {/* Body shine highlight */}
          <path
            d={`M ${cx-26} 60
                Q ${cx-30} 80 ${cx-24} 100
                Q ${cx-22} 116 ${cx-18} 130
                L ${cx+18} 130
                Q ${cx+22} 116 ${cx+24} 100
                Q ${cx+30} 80 ${cx+26} 60 Z`}
            fill="url(#mvShine)"
          />
          {/* Legs — quad shapes */}
          <path
            d={`M ${cx-18} 130
                Q ${cx-20} 148 ${cx-18} 168
                Q ${cx-16} 178 ${cx-13} 178
                L ${cx-3} 178
                Q ${cx-2} 160 ${cx-2} 130 Z`}
            fill="url(#mvBody)"
          />
          <path
            d={`M ${cx+18} 130
                Q ${cx+20} 148 ${cx+18} 168
                Q ${cx+16} 178 ${cx+13} 178
                L ${cx+3} 178
                Q ${cx+2} 160 ${cx+2} 130 Z`}
            fill="url(#mvBody)"
          />
          {/* Caption */}
          <text x={cx} y={194} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="ui-monospace,monospace" letterSpacing="2">
            {idx === 0 ? 'WEEK 1' : 'WEEK 6'}
          </text>
        </g>
      ))}
      {/* Equals + question */}
      <g transform="translate(130 100)">
        <line x1="-12" y1="-4" x2="12" y2="-4" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
        <line x1="-12" y1="6"  x2="12" y2="6"  stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
        <text x="0" y="-22" textAnchor="middle" fontSize="20" fill="#ef4444" fontWeight="bold">?</text>
      </g>
    </svg>
  );
}

/**
 * Anatomically-detailed body diagram: front-facing torso with discrete
 * muscle groups (chest, arms, abs, legs). Some are bright (strong),
 * some are dim red (weak). Floating rank badges call out the "A+" /
 * "F" / "B" tier of each muscle group with a leader line. A dotted
 * x-ray scan-band runs across the body so it reads as a diagnostic
 * scan, not a coloring book.
 */
function BlindSpotVisual() {
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
      <defs>
        <linearGradient id="bsBright" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="60%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="bsBrightShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bsDim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="bsScanGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body silhouette outline — base layer */}
      <g stroke="#475569" strokeWidth="0.5" fill="url(#bsDim)">
        {/* Head */}
        <circle cx={120} cy={28} r={14} />
        {/* Neck */}
        <rect x={115} y={40} width={10} height={6} />
        {/* Torso silhouette */}
        <path d="M 92 56 Q 88 52 96 50 Q 110 46 120 46 Q 130 46 144 50 Q 152 52 148 56 L 152 90 Q 148 110 146 130 L 94 130 Q 92 110 88 90 Z" />
        {/* Arms */}
        <path d="M 92 56 Q 80 80 76 110 L 86 110 Q 88 88 96 64 Z" />
        <path d="M 148 56 Q 160 80 164 110 L 154 110 Q 152 88 144 64 Z" />
        {/* Legs */}
        <path d="M 94 130 Q 90 160 92 200 L 110 200 Q 114 168 116 130 Z" />
        <path d="M 146 130 Q 150 160 148 200 L 130 200 Q 126 168 124 130 Z" />
      </g>

      {/* === STRONG groups (orange) === */}
      {/* Chest */}
      <g>
        <path d="M 96 60 Q 110 64 118 64 L 118 84 Q 102 82 96 76 Z" fill="url(#bsBright)" />
        <path d="M 96 60 Q 110 64 118 64 L 118 84 Q 102 82 96 76 Z" fill="url(#bsBrightShine)" />
        <path d="M 144 60 Q 130 64 122 64 L 122 84 Q 138 82 144 76 Z" fill="url(#bsBright)" />
        <path d="M 144 60 Q 130 64 122 64 L 122 84 Q 138 82 144 76 Z" fill="url(#bsBrightShine)" />
      </g>
      {/* Arms — bicep + forearm */}
      <g>
        <path d="M 84 64 Q 80 80 82 96 L 92 96 Q 92 78 92 64 Z" fill="url(#bsBright)" />
        <path d="M 156 64 Q 160 80 158 96 L 148 96 Q 148 78 148 64 Z" fill="url(#bsBright)" />
      </g>

      {/* === WEAK groups (dim red, this is the blind spot) === */}
      {/* Abs */}
      <g>
        <rect x={108} y={88} width={24} height={36} rx={2} fill="#3a0a0a" />
        <line x1={108} y1={100} x2={132} y2={100} stroke="#1e293b" strokeWidth="0.6" />
        <line x1={108} y1={112} x2={132} y2={112} stroke="#1e293b" strokeWidth="0.6" />
        <line x1={120} y1={88} x2={120} y2={124} stroke="#1e293b" strokeWidth="0.6" />
      </g>
      {/* Right thigh — weak */}
      <g>
        <path d="M 124 132 Q 124 158 128 184 L 142 184 Q 144 160 142 132 Z" fill="#3a0a0a" />
      </g>

      {/* Scan band — animated horizontal slice */}
      <rect x="74" y="100" width="92" height="22" fill="url(#bsScanGlow)" opacity="0.75">
        <animate
          attributeName="y"
          values="20; 200; 20"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </rect>

      {/* Strong rank badges */}
      <g transform="translate(30 64)">
        <rect width="34" height="20" rx="4" fill="#10101a" stroke="#fb923c" strokeWidth="1.2" />
        <text x="17" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fb923c" fontFamily="ui-monospace,monospace">A+</text>
        <line x1="34" y1="10" x2="48" y2="10" stroke="#fb923c" strokeWidth="0.8" />
      </g>
      <g transform="translate(174 76)">
        <rect width="34" height="20" rx="4" fill="#10101a" stroke="#fb923c" strokeWidth="1.2" />
        <text x="17" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fb923c" fontFamily="ui-monospace,monospace">A</text>
        <line x1="0" y1="10" x2="-12" y2="10" stroke="#fb923c" strokeWidth="0.8" />
      </g>
      {/* Weak rank badges */}
      <g transform="translate(30 102)">
        <rect width="34" height="20" rx="4" fill="#10101a" stroke="#ef4444" strokeWidth="1.2" />
        <text x="17" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444" fontFamily="ui-monospace,monospace">F</text>
        <line x1="34" y1="10" x2="106" y2="106" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2 2" />
      </g>
      <g transform="translate(174 162)">
        <rect width="34" height="20" rx="4" fill="#10101a" stroke="#ef4444" strokeWidth="1.2" />
        <text x="17" y="14" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444" fontFamily="ui-monospace,monospace">D</text>
        <line x1="0" y1="10" x2="-40" y2="-2" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2 2" />
      </g>
    </svg>
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
