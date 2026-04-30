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

const STRUGGLES_BODY: { key: StruggleKey; label: string }[] = [
  { key: 'sensitive_back',      label: 'Sensitive back' },
  { key: 'sensitive_knees',     label: 'Sensitive knees' },
  { key: 'sensitive_shoulders', label: 'Sensitive shoulders' },
  { key: 'sensitive_wrists',    label: 'Sensitive wrists' },
];

const STRUGGLES_LIFE: { key: StruggleKey; label: string }[] = [
  { key: 'trouble_sleeping',       label: 'Trouble sleeping' },
  { key: 'phone_addiction',        label: 'Phone addiction' },
  { key: 'forget_water',           label: 'Forget to drink water' },
  { key: 'energy_crashes',         label: 'Energy crashes' },
  { key: 'stress_anxiety',         label: 'Stress / anxiety' },
  { key: 'low_morning_motivation', label: 'Low morning motivation' },
];

const ENERGY_OPTIONS: { key: EnergyLevel; label: string; sub: string }[] = [
  { key: 'low',    label: 'Low',    sub: "I'm often tired." },
  { key: 'medium', label: 'Medium', sub: 'It depends on the day.' },
  { key: 'high',   label: 'High',   sub: 'I have plenty of energy.' },
];

const STATEMENT_OPTIONS: { key: StatementKey; label: string }[] = [
  { key: 'follow_same_routine',     label: "I follow the same routine every time and don't know what to change." },
  { key: 'dont_push_limits',        label: "I don't push myself as hard as I want to." },
  { key: 'progress_invisible',      label: 'Progress feels invisible — effort never feels like results.' },
  { key: 'inconsistent_sleep',      label: "My sleep is all over the place." },
  { key: 'distracted_easily',       label: "I get distracted easily and lose focus." },
  { key: 'cant_stick_with_anything',label: "I start strong but can't stick with anything long-term." },
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
  options: { key: T; label: string }[];
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
              'rounded-2xl border-2 px-3 py-3 text-left transition-all flex items-start justify-between gap-3 min-h-[56px]',
              active
                ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                : 'bg-[#10101a] border-white/8 hover:border-white/20',
            )}
          >
            <span className={cn('font-semibold text-[13px] leading-snug', active ? 'text-white' : 'text-slate-200')}>
              {opt.label}
            </span>
            {active && <CheckCircleFullIcon size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />}
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

/** Two identical body silhouettes side-by-side — "before/after?" */
function MirrorVisual() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
      <defs>
        <linearGradient id="mirrorBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {[40, 140].map((cx, i) => (
        <g key={i}>
          {/* Head */}
          <circle cx={cx} cy={28} r={14} fill="url(#mirrorBody)" />
          {/* Torso */}
          <path
            d={`M ${cx-22} 50 L ${cx+22} 50 L ${cx+18} 110 L ${cx-18} 110 Z`}
            fill="url(#mirrorBody)"
          />
          {/* Arms */}
          <rect x={cx-32} y={50} width={10} height={42} rx={5} fill="url(#mirrorBody)" />
          <rect x={cx+22} y={50} width={10} height={42} rx={5} fill="url(#mirrorBody)" />
          {/* Legs */}
          <rect x={cx-15} y={112} width={12} height={36} rx={5} fill="url(#mirrorBody)" />
          <rect x={cx+3}  y={112} width={12} height={36} rx={5} fill="url(#mirrorBody)" />
          {/* Caption */}
          <text x={cx} y={158} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="ui-monospace,monospace">
            {i === 0 ? 'WEEK 1' : 'WEEK 6'}
          </text>
        </g>
      ))}
      {/* Equals sign between */}
      <text x={110} y={86} textAnchor="middle" fontSize="32" fill="#ef4444" fontWeight="bold">
        =
      </text>
    </svg>
  );
}

/** Body silhouette with one part highlighted dim — the "blind spot." */
function BlindSpotVisual() {
  return (
    <svg width="120" height="180" viewBox="0 0 120 180" fill="none">
      <defs>
        <linearGradient id="bodyBright" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="bodyDim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      {/* Head */}
      <circle cx={60} cy={26} r={16} fill="url(#bodyBright)" />
      {/* Shoulders */}
      <ellipse cx={60} cy={56} rx={32} ry={12} fill="url(#bodyBright)" />
      {/* Chest — bright */}
      <path d="M 32 60 L 88 60 L 86 90 L 34 90 Z" fill="url(#bodyBright)" />
      {/* Arms — bright */}
      <rect x={20}  y={56} width={12} height={50} rx={6} fill="url(#bodyBright)" />
      <rect x={88}  y={56} width={12} height={50} rx={6} fill="url(#bodyBright)" />
      {/* Lower back — DIM (the blind spot) */}
      <path d="M 34 90 L 86 90 L 84 120 L 36 120 Z" fill="url(#bodyDim)" />
      {/* Legs — left bright, right dim (another blind spot) */}
      <rect x={36} y={122} width={20} height={50} rx={6} fill="url(#bodyBright)" />
      <rect x={64} y={122} width={20} height={50} rx={6} fill="url(#bodyDim)" />

      {/* Question marks pointing at dim parts */}
      <text x={104} y={108} fontSize="20" fill="#ef4444" fontWeight="bold">?</text>
      <text x={92}  y={155} fontSize="20" fill="#ef4444" fontWeight="bold">?</text>
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
