'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { SpeechBubble } from '@/components/onboarding/SpeechBubble';
import { ExperienceLevel, GoalKey } from '@/types/onboarding';
import {
  FireIcon,
  BoltFullIcon,
  HeartFullIcon,
  TargetFullIcon,
  SparklesIcon,
  CheckCircleFullIcon,
  ShieldCheckFullIcon,
} from '@/components/ui/AppIcons';
import { SleepIcon } from '@/components/ui/CategoryIcons';

/**
 * Phase 2 of the onboarding funnel — identity + experience block.
 *
 * Eight steps in order:
 *   0. Intro question — mascot greets, asks for permission to ask questions
 *   1. Name — text input
 *   2. Experience level — single-select (never / beginner / intermediate / advanced)
 *   3. "Plan is built around your experience" — full-page hero
 *   4. Goals — multi-select chips
 *   5. "You're in the right place" — testimonial card
 *   6. Summary + corruption — mascot center, "I will use Outrank to ___" recap,
 *      hold-to-corrupt gesture spreads dark glitch across the screen
 *   7. Welcome — phoenix splash + "Welcome to Outrank, {name}"
 *
 * Answers persist via useOnboardingDraft. Phase 3 picks up at /onboard/phase3
 * (placeholder for now until that phase is built).
 */

const TOTAL_STEPS = 8;

const EXPERIENCE_OPTIONS: { key: ExperienceLevel; label: string; desc: string }[] = [
  { key: 'never',        label: 'Never',        desc: "I'm starting from zero." },
  { key: 'beginner',     label: 'Beginner',     desc: 'A few months of training.' },
  { key: 'intermediate', label: 'Intermediate', desc: '1–3 years of consistent work.' },
  { key: 'advanced',     label: 'Advanced',     desc: '3+ years, dialed in.' },
];

const GOAL_OPTIONS: { key: GoalKey; label: string; icon: React.ReactNode }[] = [
  { key: 'build_muscle', label: 'Build muscle',    icon: <FireIcon size={20} className="text-red-400" /> },
  { key: 'lose_fat',     label: 'Lose fat',        icon: <BoltFullIcon size={20} className="text-orange-400" /> },
  { key: 'energy',       label: 'More energy',     icon: <SparklesIcon size={20} className="text-yellow-400" /> },
  { key: 'sleep_better', label: 'Sleep better',    icon: <SleepIcon size={20} className="text-violet-400" /> },
  { key: 'discipline',   label: 'Build discipline',icon: <ShieldCheckFullIcon size={20} className="text-emerald-400" /> },
  { key: 'focus',        label: 'Sharper focus',   icon: <TargetFullIcon size={20} className="text-amber-400" /> },
  { key: 'consistency',  label: 'Stay consistent', icon: <HeartFullIcon size={20} className="text-rose-400" /> },
];

export default function OnboardPhase2Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase3');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/welcome/intro');
  };

  // Wait for localStorage hydration before rendering — otherwise the
  // mascot prompts may flash with empty data, then re-render once the
  // draft loads.
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <PhoenixMascot size={100} paused />
      </div>
    );
  }

  // Welcome step renders standalone — no shell chrome.
  if (step === 7) {
    return <WelcomeStep name={draft.name || 'friend'} onContinue={next} />;
  }

  // Corruption step has its own layout (mascot center, hold gesture,
  // overlay). Still uses the shell for back navigation.
  if (step === 6) {
    return (
      <SummaryCorruptionStep
        draft={draft}
        onBack={back}
        onCorruptionComplete={() => setStep(7)}
        step={step}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={back}
      showBack
      footer={renderFooter(step, draft, update, next)}
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
          {step === 0 && <IntroQuestionStep />}
          {step === 1 && <NameStep value={draft.name || ''} onChange={(name) => update({ name })} />}
          {step === 2 && <ExperienceStep
            name={draft.name || 'there'}
            value={draft.experienceLevel}
            onChange={(experienceLevel) => update({ experienceLevel })}
          />}
          {step === 3 && <PlanBuiltStep level={draft.experienceLevel ?? 'beginner'} />}
          {step === 4 && <GoalsStep
            value={draft.goals || []}
            onChange={(goals) => update({ goals })}
          />}
          {step === 5 && <RightPlaceStep />}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Footer rendering — varies by step (which need primary CTA, validation) ──

function renderFooter(
  step: number,
  draft: ReturnType<typeof useOnboardingDraft>['draft'],
  _update: ReturnType<typeof useOnboardingDraft>['update'],
  next: () => void,
) {
  const trimmedName = (draft.name || '').trim();
  const canProceed =
    (step === 0) ||
    (step === 1 && trimmedName.length >= 2) ||
    (step === 2 && !!draft.experienceLevel) ||
    (step === 3) ||
    (step === 4 && (draft.goals || []).length > 0) ||
    (step === 5);

  const labels: Record<number, string> = {
    0: "SOUNDS GOOD",
    1: "NEXT",
    2: "CONTINUE",
    3: "CONTINUE",
    4: "CONTINUE",
    5: "CONTINUE",
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
      style={{
        background: 'linear-gradient(90deg, #dc2626, #f97316)',
      }}
    >
      {labels[step] || 'CONTINUE'}
    </motion.button>
  );
}

// ─── Step components ─────────────────────────────────────────────────────────

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

function IntroQuestionStep() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <PhoenixMascot size={170} greeting />
      <SpeechBubble tail="top-center" className="mt-8 max-w-sm text-center">
        I just have a few questions for you and we can get started!
      </SpeechBubble>
    </div>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="What should we call you?" />

      <h2 className="font-heading text-2xl font-bold text-white mt-2 mb-3">
        What&apos;s your name?
      </h2>
      <div className="relative">
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your name"
          maxLength={32}
          className="w-full bg-[#10101a] border-2 border-orange-400/60 focus:border-orange-400 rounded-2xl px-12 py-4 text-white text-lg font-medium outline-none transition-colors"
        />
        <svg
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
      <p className="text-[12px] text-slate-500 mt-3">You can change your name later in your profile.</p>
    </div>
  );
}

/**
 * Four equal-height vertical level bars. `filled` is the count of
 * activated bars (0–4). Used on the experience step as a clean signal
 * gauge — Never=0, Beginner=2, Intermediate=3, Advanced=4.
 */
function LevelBars({ filled }: { filled: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-end gap-[3px] flex-shrink-0">
      {[0, 1, 2, 3].map((i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className={cn(
              'w-[5px] h-7 rounded-sm transition-colors',
              on
                ? 'bg-gradient-to-t from-red-500 to-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.55)]'
                : 'bg-white/[0.08] border border-white/[0.06]',
            )}
          />
        );
      })}
    </div>
  );
}

const EXPERIENCE_BARS: Record<number, 0 | 1 | 2 | 3 | 4> = {
  0: 0, // Never        — all empty
  1: 2, // Beginner     — 2 filled
  2: 3, // Intermediate — 3 filled
  3: 4, // Advanced     — all filled
};

function ExperienceStep({
  name,
  value,
  onChange,
}: {
  name: string;
  value?: ExperienceLevel;
  onChange: (v: ExperienceLevel) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow
        message={
          <>
            Nice to meet you, <span className="text-orange-400 font-semibold">{name}</span>. How experienced are you with working out?
          </>
        }
      />
      <div className="space-y-2.5 mt-2">
        {EXPERIENCE_OPTIONS.map((opt, i) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-4 py-3.5 transition-all flex items-center gap-4',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_24px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <LevelBars filled={EXPERIENCE_BARS[i]} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                    {opt.label}
                  </span>
                  {active && <CheckCircleFullIcon size={18} className="text-orange-400 flex-shrink-0" />}
                </div>
                <p className={cn('text-[13px] mt-0.5', active ? 'text-orange-200/80' : 'text-slate-500')}>
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanBuiltStep({ level }: { level: ExperienceLevel }) {
  const labels: Record<ExperienceLevel, string> = {
    never:        'Starting fresh',
    beginner:     'Building the base',
    intermediate: 'Sharpening the edge',
    advanced:     'Going for mastery',
  };
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <div
        className="w-32 h-32 rounded-full flex items-center justify-center relative"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.25), transparent 70%)',
        }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-orange-400/30 animate-ping" />
        <SparklesIcon size={56} className="text-orange-400 relative z-10" />
      </div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-orange-400 font-bold mt-8">
        {labels[level]}
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight max-w-md">
        Your plan is built<br/>around your <span className="text-orange-400">experience</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Outrank tunes the difficulty, the targets, and the pace based on what you tell us.
        No copy-paste programs.
      </p>
    </div>
  );
}

function GoalsStep({ value, onChange }: { value: GoalKey[]; onChange: (v: GoalKey[]) => void }) {
  const toggle = (key: GoalKey) => {
    if (value.includes(key)) onChange(value.filter((k) => k !== key));
    else onChange([...value, key]);
  };
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="What's your goal here? Pick everything that fits." />
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        {GOAL_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={cn(
                'rounded-2xl border-2 px-3 py-3.5 text-left transition-all flex flex-col gap-2 min-h-[80px]',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_24px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span>{opt.icon}</span>
                {active && <CheckCircleFullIcon size={16} className="text-orange-400" />}
              </div>
              <span className={cn('font-semibold text-[13px] leading-tight', active ? 'text-white' : 'text-slate-200')}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RightPlaceStep() {
  return (
    <div className="flex flex-col flex-1 justify-center">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 mb-6">
          <CheckCircleFullIcon size={14} className="text-orange-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">
            You&apos;re in the right place
          </span>
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight max-w-md mx-auto">
          Real change<br/>starts <span className="text-orange-400">here</span>.
        </h2>
        <p className="text-slate-300/85 mt-4 max-w-sm mx-auto text-base leading-relaxed">
          Outrank rebuilds the habits that change your life — slowly, then all at once.
        </p>
      </div>

      {/* Testimonial card */}
      <div className="mt-10 mx-auto max-w-md">
        <div className="rounded-2xl bg-[#10101a] border border-white/10 p-5">
          <div className="flex items-center gap-3 mb-3">
            {/* Real-looking testimonial portrait — randomuser.me serves
                free photo-realistic stock avatars commonly used in
                pre-launch product testimonials. eslint-disable next/img
                is fine here since this is an external CDN URL outside
                next/image's optimization scope. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://randomuser.me/api/portraits/men/32.jpg"
              alt="Marcus R."
              className="w-11 h-11 rounded-full object-cover ring-2 ring-orange-400/40"
            />
            <div>
              <p className="font-bold text-white text-sm">Marcus R.</p>
              <p className="text-[11px] text-slate-500">Member since Jan 2026</p>
            </div>
            <div className="ml-auto flex gap-0.5 text-yellow-400">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ))}
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            &ldquo;I&apos;ve tried every habit app. This is the first one that actually stuck. The competition with my friends is what does it.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: Summary + hold-to-corrupt ───────────────────────────────────────

/**
 * Eight jagged crack paths radiating from the mascot center (50%, 45%
 * of viewport in a 100×100 viewBox) outward to beyond the edges. Each
 * path has a few zig-zag segments so it reads as a fissure, not a
 * straight line. Drawn with stroke-dashoffset tied to corruption
 * progress so the cracks "split open" as the user holds.
 */
const CRACK_PATHS: string[] = [
  // Right
  'M50 45 L 58 47 L 67 42 L 78 48 L 90 44 L 105 47',
  // Down-right
  'M50 45 L 58 53 L 67 64 L 78 76 L 90 90 L 105 105',
  // Down
  'M50 45 L 52 56 L 48 70 L 53 84 L 49 100 L 52 115',
  // Down-left
  'M50 45 L 42 53 L 33 64 L 22 76 L 10 90 L -5 105',
  // Left
  'M50 45 L 42 47 L 33 42 L 22 48 L 10 44 L -5 47',
  // Up-left
  'M50 45 L 42 37 L 33 26 L 22 14 L 10 0 L -5 -15',
  // Up
  'M50 45 L 52 33 L 48 20 L 53 6 L 49 -10 L 52 -25',
  // Up-right
  'M50 45 L 58 37 L 67 26 L 78 14 L 90 0 L 105 -15',
];


function SummaryCorruptionStep({
  draft,
  onBack,
  onCorruptionComplete,
  step,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  onBack: () => void;
  onCorruptionComplete: () => void;
  step: number;
}) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  // RAF-driven hold/release. While holding, progress fills toward 1
  // over ~2.4s. While released, it drains back over ~1s. Once it
  // reaches 1 we trigger completion (only once).
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      setProgress((p) => {
        if (completedRef.current) return p;
        const fillRate = 1 / 2.4;   // 2.4s to fill
        const drainRate = 1 / 1.0;  // 1.0s to drain
        const next = holding
          ? Math.min(1, p + fillRate * dt)
          : Math.max(0, p - drainRate * dt);
        if (next >= 1 && !completedRef.current) {
          completedRef.current = true;
          // Let the white flash play, then advance
          setTimeout(onCorruptionComplete, 480);
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [holding, onCorruptionComplete]);

  // Build a compact summary string from the draft.
  const summary: string[] = [];
  if (draft.experienceLevel) {
    const levelMap: Record<ExperienceLevel, string> = {
      never:        'start from zero',
      beginner:     'build a strong base',
      intermediate: 'level up my training',
      advanced:     'reach mastery',
    };
    summary.push(levelMap[draft.experienceLevel]);
  }
  const goalLabels: Partial<Record<GoalKey, string>> = {
    build_muscle: 'build muscle',
    lose_fat:     'lose fat',
    energy:       'gain energy',
    sleep_better: 'sleep better',
    discipline:   'build discipline',
    focus:        'sharpen focus',
    consistency:  'stay consistent',
  };
  const goals = (draft.goals || []).map((g) => goalLabels[g]).filter(Boolean) as string[];

  // Corruption mask radius — grows from mascot center (~50% / ~45%
  // viewport coords) outward as progress increases. We use vmax so it
  // covers any aspect ratio at full progress.
  const radiusVmax = progress * 160;
  // Glitch & shake start kicking in around p=0.15
  const glitchStrength = Math.max(0, (progress - 0.15) / 0.85);
  // White flash only at the very tail, p=0.97-1.0
  const flashOpacity = progress > 0.97 ? (progress - 0.97) / 0.03 : 0;

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={progress === 0 && !completedRef.current ? onBack : undefined}
      showBack={progress === 0}
    >
      <div
        className={cn(
          'relative flex flex-col items-center justify-center flex-1 select-none',
          glitchStrength > 0.4 && 'animate-corruption-jitter',
        )}
        style={{
          // Dim the content as corruption takes over
          opacity: 1 - progress * 0.3,
          transition: 'opacity 0.1s linear',
        }}
      >
        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#10101a]/90 border border-white/10 px-5 py-4 max-w-sm text-center mb-8"
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
            I will use Outrank to
          </p>
          <p className="text-white font-medium text-base leading-relaxed">
            {summary.join(' & ')}
            {summary.length > 0 && goals.length > 0 ? ', and ' : ''}
            {goals.length > 0 && (
              <span className="text-orange-400">{joinWithAnd(goals)}</span>
            )}
            {summary.length === 0 && goals.length === 0 && 'change my life.'}.
          </p>
        </motion.div>

        {/* Phoenix mascot — pulse + glitch when held */}
        <div
          className="relative"
          style={{
            filter: glitchStrength > 0
              ? `drop-shadow(${glitchStrength * 4}px 0 0 rgba(220,38,38,0.7)) drop-shadow(-${glitchStrength * 4}px 0 0 rgba(56,189,248,0.7))`
              : undefined,
          }}
        >
          {/* Aura ring that glows brighter the longer you hold */}
          <div
            className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
            style={{
              background: `radial-gradient(circle, rgba(249,115,22, ${0.3 + progress * 0.5}), transparent 70%)`,
              transform: `scale(${1 + progress * 0.5})`,
            }}
          />
          <PhoenixMascot size={180} />
        </div>

        {/* Hold button + progress ring */}
        <div className="mt-8 flex flex-col items-center">
          <button
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            disabled={completedRef.current}
            className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-orange-500 shadow-lg shadow-red-600/40 active:scale-95 transition-transform touch-none flex items-center justify-center"
            aria-label="Hold to awaken"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {/* Progress ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 80 80"
            >
              <circle cx="40" cy="40" r="37" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
              <circle
                cx="40" cy="40" r="37" fill="none"
                stroke="#fef3c7"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 37}
                strokeDashoffset={2 * Math.PI * 37 * (1 - progress)}
                style={{ filter: 'drop-shadow(0 0 4px rgba(254,243,199,0.8))' }}
              />
            </svg>
          </button>
          <p className="mt-4 text-[11px] uppercase tracking-[0.3em] font-bold text-slate-400">
            {progress < 0.05 ? 'Hold to awaken' : progress < 1 ? 'Keep holding…' : 'Awakening'}
          </p>
        </div>
      </div>

      {/* ─── Awakening overlay ─── A phoenix-themed energy explosion:
          rotating sunburst rays, expanding shockwave rings, hot fire
          gradient sweeping outward, white-gold lightning cracks, and
          floating embers rising from the mascot. Climaxes in a blinding
          flash that hands off to the welcome screen. */}
      {progress > 0 && (
        <div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          style={{ opacity: 1 }}
        >
          {/* 1. Outer dim layer — desaturates the un-awakened screen
              beyond the shockwave so the eye locks onto the bright core. */}
          <div
            className="absolute inset-0 transition-opacity duration-100"
            style={{ background: '#08080f', opacity: progress * 0.6 }}
          />

          {/* 2. Hot core gradient — bright white/gold center, fading
              out through orange and red toward the edges as progress
              grows. The whole screen eventually burns. */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 45%,
                rgba(255,255,255,${0.9 * progress}) 0%,
                rgba(254,243,199,${0.85 * progress}) ${radiusVmax * 0.18}vmax,
                rgba(251,191,36,${0.8 * progress}) ${radiusVmax * 0.32}vmax,
                rgba(249,115,22,${0.75 * progress}) ${radiusVmax * 0.5}vmax,
                rgba(220,38,38,${0.65 * progress}) ${radiusVmax * 0.7}vmax,
                rgba(127,29,29,${0.45 * progress}) ${radiusVmax * 0.85}vmax,
                transparent ${radiusVmax}vmax)`,
            }}
          />

          {/* 3. Sunburst rays — 16 light rays fanning out from the
              mascot, slowly rotating. Length grows with progress. */}
          <div
            className="absolute left-1/2 top-[45%] animate-awaken-sunburst"
            style={{
              width: `${progress * 240}vmax`,
              height: `${progress * 240}vmax`,
            }}
            aria-hidden
          >
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `conic-gradient(from 0deg,
                  rgba(255,255,255,${0.0}) 0deg,
                  rgba(255,255,255,${0.6 * progress}) 4deg,
                  rgba(254,243,199,${0.0}) 8deg,
                  rgba(255,255,255,${0.0}) 22.5deg,
                  rgba(255,255,255,${0.6 * progress}) 26.5deg,
                  rgba(254,243,199,${0.0}) 30.5deg,
                  rgba(255,255,255,${0.0}) 45deg,
                  rgba(255,255,255,${0.6 * progress}) 49deg,
                  rgba(254,243,199,${0.0}) 53deg,
                  rgba(255,255,255,${0.0}) 67.5deg,
                  rgba(255,255,255,${0.6 * progress}) 71.5deg,
                  rgba(254,243,199,${0.0}) 75.5deg,
                  rgba(255,255,255,${0.0}) 90deg,
                  rgba(255,255,255,${0.6 * progress}) 94deg,
                  rgba(254,243,199,${0.0}) 98deg,
                  rgba(255,255,255,${0.0}) 112.5deg,
                  rgba(255,255,255,${0.6 * progress}) 116.5deg,
                  rgba(254,243,199,${0.0}) 120.5deg,
                  rgba(255,255,255,${0.0}) 135deg,
                  rgba(255,255,255,${0.6 * progress}) 139deg,
                  rgba(254,243,199,${0.0}) 143deg,
                  rgba(255,255,255,${0.0}) 157.5deg,
                  rgba(255,255,255,${0.6 * progress}) 161.5deg,
                  rgba(254,243,199,${0.0}) 165.5deg,
                  rgba(255,255,255,${0.0}) 180deg,
                  rgba(255,255,255,${0.6 * progress}) 184deg,
                  rgba(254,243,199,${0.0}) 188deg,
                  rgba(255,255,255,${0.0}) 202.5deg,
                  rgba(255,255,255,${0.6 * progress}) 206.5deg,
                  rgba(254,243,199,${0.0}) 210.5deg,
                  rgba(255,255,255,${0.0}) 225deg,
                  rgba(255,255,255,${0.6 * progress}) 229deg,
                  rgba(254,243,199,${0.0}) 233deg,
                  rgba(255,255,255,${0.0}) 247.5deg,
                  rgba(255,255,255,${0.6 * progress}) 251.5deg,
                  rgba(254,243,199,${0.0}) 255.5deg,
                  rgba(255,255,255,${0.0}) 270deg,
                  rgba(255,255,255,${0.6 * progress}) 274deg,
                  rgba(254,243,199,${0.0}) 278deg,
                  rgba(255,255,255,${0.0}) 292.5deg,
                  rgba(255,255,255,${0.6 * progress}) 296.5deg,
                  rgba(254,243,199,${0.0}) 300.5deg,
                  rgba(255,255,255,${0.0}) 315deg,
                  rgba(255,255,255,${0.6 * progress}) 319deg,
                  rgba(254,243,199,${0.0}) 323deg,
                  rgba(255,255,255,${0.0}) 337.5deg,
                  rgba(255,255,255,${0.6 * progress}) 341.5deg,
                  rgba(254,243,199,${0.0}) 345.5deg,
                  rgba(255,255,255,${0.0}) 360deg)`,
                maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                opacity: glitchStrength,
              }}
            />
          </div>

          {/* 4. Shockwave rings — three expanding concentric circles
              that radiate from the mascot. Mounted only when held so
              the keyframe loops while the user is committing. */}
          {[0, 0.55, 1.1].map((delay, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-[45%] w-32 h-32 rounded-full animate-awaken-shockwave"
              style={{
                border: '3px solid rgba(254,243,199,0.95)',
                boxShadow: '0 0 28px rgba(251,146,60,0.9), inset 0 0 12px rgba(254,243,199,0.7)',
                animationDelay: `${delay}s`,
                opacity: progress,
              }}
              aria-hidden
            />
          ))}

          {/* 5. Lightning cracks — same SVG paths as before but in
              white-gold so they read as electric energy rather than
              fire fissures. Glowing filter for an ethereal feel. */}
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <filter id="awakenGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {CRACK_PATHS.map((d, i) => (
              <path
                key={i}
                d={d}
                stroke={i % 2 === 0 ? '#fef3c7' : '#fde047'}
                strokeWidth={0.5 + (i % 3) * 0.2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 * (1 - progress)}
                filter="url(#awakenGlow)"
                style={{ vectorEffect: 'non-scaling-stroke' }}
              />
            ))}
          </svg>

          {/* 6. Floating embers — 14 small dots rising from the mascot.
              Each gets a random target offset via CSS custom property
              so the ember spread looks organic. */}
          {Array.from({ length: 14 }).map((_, i) => {
            const xJitter = (i * 73 + 31) % 280 - 140;        // -140..140 vw
            const yTarget = -(((i * 53 + 17) % 60) + 60);     // -60..-120 vh
            const delay = (i % 7) * 0.18;
            const startX = 48 + ((i * 13) % 8) - 4;           // 44..52 % (mascot wide)
            return (
              <div
                key={i}
                className="absolute rounded-full animate-awaken-ember"
                style={{
                  left: `${startX}%`,
                  top: '45%',
                  width: 6 + (i % 3) * 2,
                  height: 6 + (i % 3) * 2,
                  background: i % 2 === 0
                    ? 'radial-gradient(circle, #fef3c7, #fb923c 60%, transparent)'
                    : 'radial-gradient(circle, #fde047, #ef4444 60%, transparent)',
                  filter: 'blur(0.5px)',
                  ['--ember-x' as string]: `${xJitter}vw`,
                  ['--ember-y' as string]: `${yTarget}vh`,
                  animationDelay: `${delay}s`,
                  opacity: progress,
                }}
                aria-hidden
              />
            );
          })}

          {/* 7. Scanlines glitch — kept for the "system overload" feel. */}
          <div
            className="absolute inset-0 corruption-scanlines"
            style={{ opacity: glitchStrength * 0.55 }}
          />

          {/* 8. White flash on completion — covers everything for the
              hand-off to the welcome screen. */}
          <div
            className="absolute inset-0 bg-white"
            style={{ opacity: flashOpacity }}
          />
        </div>
      )}
    </WizardShell>
  );
}

// ─── Step 7: Welcome — phoenix splash + name ─────────────────────────────────

function WelcomeStep({ name, onContinue }: { name: string; onContinue: () => void }) {
  const [showName, setShowName] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowName(true), 1100);
    const t2 = setTimeout(() => setShowCTA(true), 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col relative overflow-hidden">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45), transparent 65%)' }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Phoenix splash entrance — uses the existing keyframe shared
            with the brand splash screen for visual continuity. */}
        <div className="animate-splash-phoenix-in">
          <PhoenixMascot size={180} />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.7 }}
          className="font-heading text-4xl sm:text-5xl font-bold text-white mt-8 leading-tight"
        >
          Welcome to{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(90deg, #fb923c, #ef4444, #fb923c)' }}
          >
            Outrank
          </span>
        </motion.h1>

        <AnimatePresence>
          {showName && (
            <motion.p
              key="name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-slate-300/90 mt-3 text-lg"
            >
              Glad you&apos;re here, <span className="text-orange-400 font-semibold">{name}</span>.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCTA && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative px-6 pb-10 max-w-md w-full mx-auto"
          >
            <button
              onClick={onContinue}
              className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all"
              style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
            >
              CONTINUE
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
