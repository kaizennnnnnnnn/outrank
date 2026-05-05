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
      <div
        className="dir-b min-h-screen flex items-center justify-center"
        style={{ background: 'var(--b-paper)' }}
      >
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
      {labels[step] || 'CONTINUE'} →
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

      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 6 }}>
        Your name
      </div>
      <h2
        className="font-display"
        style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, lineHeight: 1.05, margin: '4px 0 12px' }}
      >
        What should we call you?
      </h2>
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your name"
        maxLength={32}
        className="font-display"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1.5px solid var(--b-ink)',
          padding: '10px 2px',
          fontSize: 22,
          fontStyle: 'italic',
          fontWeight: 500,
          color: 'var(--b-ink)',
          outline: 'none',
        }}
      />
      <p
        className="font-body"
        style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 10, fontStyle: 'italic' }}
      >
        You can change your name later in your profile.
      </p>
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
            style={{
              width: 5,
              height: 28,
              background: on ? 'var(--b-accent)' : 'transparent',
              border: on ? 'none' : '1px solid var(--b-rule)',
            }}
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
            Nice to meet you,{' '}
            <em style={{ color: 'var(--b-accent)', fontStyle: 'italic', fontWeight: 600 }}>{name}</em>.
            How experienced are you with working out?
          </>
        }
      />
      <ul
        style={{
          listStyle: 'none',
          margin: '12px 0 0',
          padding: 0,
          borderTop: '1px solid var(--b-ink)',
        }}
      >
        {EXPERIENCE_OPTIONS.map((opt, i) => {
          const active = value === opt.key;
          return (
            <li key={opt.key}>
              <button
                onClick={() => onChange(opt.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 6px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--b-rule)',
                  borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                  paddingLeft: active ? 8 : 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--b-ink)',
                }}
              >
                <LevelBars filled={EXPERIENCE_BARS[i]} />
                <div style={{ flex: 1, minWidth: 0 }}>
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
                      <span style={{ color: 'var(--b-accent)', display: 'inline-flex', flexShrink: 0 }}>
                        <CheckCircleFullIcon size={16} />
                      </span>
                    )}
                  </div>
                  <p
                    className="font-body"
                    style={{
                      fontSize: 11,
                      color: 'var(--b-ink-60)',
                      marginTop: 2,
                      lineHeight: 1.5,
                    }}
                  >
                    {opt.desc}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
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
        style={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--b-ink)',
        }}
      >
        <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
          <SparklesIcon size={40} />
        </span>
      </div>
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 24 }}
      >
        {labels[level]}
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
        Your plan is built around your{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>experience</em>.
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginTop: 14,
        }}
      >
        {GOAL_OPTIONS.map((opt) => {
          const active = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 80,
                padding: '12px 10px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--b-ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{opt.icon}</span>
                {active && (
                  <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                    <CheckCircleFullIcon size={14} />
                  </span>
                )}
              </div>
              <span
                className="font-display"
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  lineHeight: 1.2,
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

function RightPlaceStep() {
  return (
    <div className="flex flex-col flex-1 justify-center">
      <div className="text-center">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 14 }}
        >
          You&rsquo;re in the right place
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 38,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: 0,
            maxWidth: 440,
            marginInline: 'auto',
          }}
        >
          Real change starts{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>here</em>.
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: 13,
            color: 'var(--b-ink-60)',
            marginTop: 14,
            maxWidth: 360,
            marginInline: 'auto',
            lineHeight: 1.6,
          }}
        >
          Outrank rebuilds the habits that change your life — slowly, then all at once.
        </p>
      </div>

      {/* Testimonial — editorial blockquote */}
      <div
        style={{
          marginTop: 32,
          marginInline: 'auto',
          maxWidth: 460,
          width: '100%',
          padding: '18px 20px',
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
        }}
      >
        <p
          className="font-display"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.45,
            color: 'var(--b-ink)',
            margin: 0,
          }}
        >
          &ldquo;I&rsquo;ve tried every habit app. This is the first one that actually stuck.
          The competition with my friends is what does it.&rdquo;
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="Marcus R."
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid var(--b-rule)',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              className="font-display"
              style={{ fontSize: 12, fontStyle: 'italic', fontWeight: 500 }}
            >
              Marcus R.
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 9, color: 'var(--b-ink-40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              Member since Jan 2026
            </div>
          </div>
          <div style={{ display: 'flex', gap: 1, color: 'var(--b-accent)' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
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
  const [origin, setOrigin] = useState({ x: 50, y: 75 });
  const completedRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Compute the hold button's center relative to the viewport so the
  // awakening spreads outward FROM the button (not from the mascot).
  // Measured on next paint + on resize.
  useEffect(() => {
    function updateOrigin() {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setOrigin({
        x: (cx / window.innerWidth) * 100,
        y: (cy / window.innerHeight) * 100,
      });
    }
    const raf = requestAnimationFrame(updateOrigin);
    window.addEventListener('resize', updateOrigin);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateOrigin);
    };
  }, []);

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
        {/* Summary card — editorial blockquote */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--b-paper)',
            border: '1px solid var(--b-ink)',
            borderTop: '2px solid var(--b-ink)',
            padding: '16px 20px',
            maxWidth: 380,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
          >
            I will use Outrank to
          </div>
          <p
            className="font-display"
            style={{
              fontSize: 18,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.4,
              margin: 0,
              color: 'var(--b-ink)',
            }}
          >
            {summary.join(' & ')}
            {summary.length > 0 && goals.length > 0 ? ', and ' : ''}
            {goals.length > 0 && (
              <span style={{ color: 'var(--b-accent)' }}>{joinWithAnd(goals)}</span>
            )}
            {summary.length === 0 && goals.length === 0 && 'change my life.'}.
          </p>
        </motion.div>

        {/* Phoenix mascot — z-60 keeps it above the awakening overlay
            (z-50) so the phoenix glows inside the spreading energy
            instead of being buried by the dark mask. */}
        <div
          className="relative z-[60]"
          style={{
            filter: glitchStrength > 0
              ? `drop-shadow(0 0 ${8 + glitchStrength * 16}px rgba(254,243,199,${0.6 + glitchStrength * 0.4}))`
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

        {/* Hold button + progress ring. The ref drives the awakening
            overlay's origin so the energy actually spreads OUT from
            this button, not from somewhere on the mascot. z-60 keeps
            it tappable above the overlay. */}
        <div className="mt-8 flex flex-col items-center relative z-[60]">
          <button
            ref={buttonRef}
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
          <p
            className="spread"
            style={{ marginTop: 14, fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            {progress < 0.05 ? 'Hold to awaken' : progress < 1 ? 'Keep holding…' : 'Awakening'}
          </p>
        </div>
      </div>

      {/* ─── Awakening overlay ─── Simple radial spread from the
          hold button. One fire gradient + one shockwave + final
          flash. No cracks, no sunburst, no embers — they were
          tanking mobile perf and reading as cheap. */}
      {progress > 0 && (
        <div
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          style={{ opacity: 1 }}
        >
          {/* Fire gradient growing outward from the button. The whole
              overlay is just this one paint — radial-gradient is GPU-
              composited so it stays smooth even as the radius scales. */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${origin.x}% ${origin.y}%,
                rgba(255,255,255,${0.95 * progress}) 0%,
                rgba(254,243,199,${0.92 * progress}) ${radiusVmax * 0.16}vmax,
                rgba(251,191,36,${0.85 * progress}) ${radiusVmax * 0.32}vmax,
                rgba(249,115,22,${0.78 * progress}) ${radiusVmax * 0.5}vmax,
                rgba(220,38,38,${0.62 * progress}) ${radiusVmax * 0.7}vmax,
                rgba(127,29,29,${0.4 * progress}) ${radiusVmax * 0.86}vmax,
                transparent ${radiusVmax}vmax)`,
            }}
          />

          {/* Single shockwave ring expanding from the button. Loops
              while held — when the user releases and progress drains,
              opacity scales down with progress so it fades out. The
              ring's keyframe carries translate(-50%, -50%) so it
              stays centered on the button regardless of size. */}
          <div
            className="absolute rounded-full animate-awaken-spread-ring"
            style={{
              left: `${origin.x}%`,
              top: `${origin.y}%`,
              width: '14vmin',
              height: '14vmin',
              border: '2px solid rgba(254,243,199,0.95)',
              boxShadow: '0 0 22px rgba(251,146,60,0.85)',
              opacity: progress,
            }}
            aria-hidden
          />

          {/* Final white flash on completion. */}
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
    <div
      className="dir-b min-h-screen flex flex-col relative"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="animate-splash-phoenix-in">
          <PhoenixMascot size={180} />
        </div>

        <div
          className="spread"
          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 32 }}
        >
          Welcome
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.7 }}
          className="font-display"
          style={{
            fontSize: 56,
            fontWeight: 500,
            lineHeight: 1,
            margin: '6px 0 0',
            color: 'var(--b-ink)',
          }}
        >
          to <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>Outrank</em>.
        </motion.h1>

        <AnimatePresence>
          {showName && (
            <motion.p
              key="name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-body"
              style={{
                fontSize: 14,
                color: 'var(--b-ink-60)',
                marginTop: 14,
                fontStyle: 'italic',
              }}
            >
              Glad you&rsquo;re here,{' '}
              <em style={{ color: 'var(--b-accent)', fontWeight: 600 }}>{name}</em>.
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
            style={{
              position: 'relative',
              padding: '12px 22px 32px',
              maxWidth: 480,
              width: '100%',
              margin: '0 auto',
            }}
          >
            <button
              onClick={onContinue}
              className="font-body"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Continue →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a conic-gradient string with `rayCount` evenly-spaced bright
 * rays. Each ray is `rayWidthDeg` wide, centered on its slot, with
 * transparent gaps in between. `alpha` controls peak ray brightness.
 */
function buildSunburstConic(rayCount: number, alpha: number, rayWidthDeg = 8): string {
  const slot = 360 / rayCount;
  const stops: string[] = ['rgba(255,255,255,0) 0deg'];
  for (let i = 0; i < rayCount; i++) {
    const center = i * slot;
    const start = center - rayWidthDeg / 2;
    const end = center + rayWidthDeg / 2;
    if (i > 0) stops.push(`rgba(255,255,255,0) ${start}deg`);
    stops.push(`rgba(255,255,255,${alpha}) ${center}deg`);
    stops.push(`rgba(254,243,199,0) ${end}deg`);
  }
  stops.push('rgba(255,255,255,0) 360deg');
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
