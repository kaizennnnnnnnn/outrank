'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { useAuth } from '@/hooks/useAuth';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { registerWithEmail, loginWithGoogle } from '@/lib/auth';
import { seedAllPillars } from '@/lib/seedPillar';
import { setDocument, Timestamp, doc } from '@/lib/firestore';
import { getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeUsername } from '@/lib/security';
import { derivePillarGoals, derivePillarRanks, clearDraft } from '@/lib/onboardingDraft';
import { recommendCalories } from '@/lib/dietCalculator';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';
import { CheckCircleFullIcon, SparklesIcon, TrophyIconFull, FireIcon, BoltFullIcon } from '@/components/ui/AppIcons';
import { GymIcon, WaterIcon, SleepIcon, ScreenIcon, StepsIcon } from '@/components/ui/CategoryIcons';

/**
 * Phase 8 — Final phase. Setup loader, ranking explainer, signup,
 * welcome → dashboard hand-off. After successful auth we write the
 * onboarding draft fields to users/{uid} and seed pillars from the
 * derived goals, then clear the draft so the user starts clean.
 */

const TOTAL_STEPS = 4;

export default function OnboardPhase8Page() {
  const router = useRouter();
  const { draft, hydrated, reset } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase7');
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

  // Step 3 (welcome) renders standalone — no shell, special layout.
  if (step === 3) {
    return (
      <WelcomeFinalStep
        name={draft.name || 'friend'}
        onContinue={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={step >= 2 ? back : undefined}
      showBack={step >= 2}
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
          {step === 0 && <SetupLoaderStep onDone={() => setStep(1)} />}
          {step === 1 && <RankingExplainerStep draft={draft} onContinue={() => setStep(2)} />}
          {step === 2 && (
            <SignupStep
              draft={draft}
              onSuccess={() => {
                reset();
                clearDraft();
                setStep(3);
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Step 0: Setup loader ────────────────────────────────────────────────────

/**
 * One continuous progress bar that fills realistically — alternating
 * between smooth runs, sprints, and "stuck" pauses. Drives a phased
 * timeline (rAF) so each phase eases from one percentage to another
 * over a fixed duration; "stuck" phases barely advance, "sprints"
 * jump fast, and the classic "stuck at 99%" pause is included.
 *
 * The 3 task labels (Compiling profile / Calculating ranks /
 * Personalizing plan) check off at 33%, 66%, 100%. A live sub-label
 * cycles through pillar work (strength / sleep / hydration / focus /
 * steps) as the bar moves through each band.
 */
function SetupLoaderStep({ onDone }: { onDone: () => void }) {
  // Phased timeline: each entry says "go from current% to `to` over
  // `ms`". The variation between fast / slow / stuck phases is what
  // makes it look like real work. Total ~13s.
  const PHASES: { to: number; ms: number }[] = [
    { to: 6,   ms: 700  }, // quick start
    { to: 11,  ms: 1300 }, // slowing
    { to: 13,  ms: 1500 }, // stuck (only 2% in 1.5s)
    { to: 28,  ms: 900  }, // sprint
    { to: 31,  ms: 1700 }, // stuck again
    { to: 47,  ms: 1100 }, // smooth
    { to: 52,  ms: 1500 }, // crawl
    { to: 68,  ms: 950  }, // sprint
    { to: 71,  ms: 1400 }, // stuck
    { to: 86,  ms: 1100 }, // smooth
    { to: 91,  ms: 1300 }, // crawl
    { to: 99,  ms: 850  }, // near-done
    { to: 99,  ms: 1500 }, // CLASSIC stuck-at-99
    { to: 100, ms: 450  }, // pop to done
  ];

  const TASKS = [
    { label: 'Compiling your profile',   threshold: 33 },
    { label: 'Calculating your ranks',   threshold: 66 },
    { label: 'Personalizing your plan',  threshold: 100 },
  ];

  // Sub-labels grouped by % band so they cycle naturally as the bar
  // moves. All 5 pillars represented in band 2.
  const SUBS: { from: number; to: number; label: string }[] = [
    { from: 0,  to: 8,   label: 'Reading your body stats…' },
    { from: 8,  to: 16,  label: 'Mapping your goals…' },
    { from: 16, to: 24,  label: 'Cataloging your equipment…' },
    { from: 24, to: 33,  label: 'Saving your baseline…' },
    { from: 33, to: 41,  label: 'Calculating your Strength rank…' },
    { from: 41, to: 48,  label: 'Calculating your Sleep rank…' },
    { from: 48, to: 55,  label: 'Calculating your Hydration rank…' },
    { from: 55, to: 61,  label: 'Calculating your Focus rank…' },
    { from: 61, to: 66,  label: 'Calculating your Steps rank…' },
    { from: 66, to: 75,  label: 'Building your weekly schedule…' },
    { from: 75, to: 83,  label: 'Setting your habit targets…' },
    { from: 83, to: 91,  label: 'Calibrating your reminders…' },
    { from: 91, to: 99,  label: 'Linking your pillars together…' },
    { from: 99, to: 101, label: 'Finalizing your plan…' },
  ];

  const [pct, setPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let raf: number;
    let phaseIdx = 0;
    let phaseStart = performance.now();
    let phaseFrom = 0;

    function tick(now: number) {
      if (cancelled) return;
      if (phaseIdx >= PHASES.length) {
        setPct(100);
        setTimeout(() => !cancelled && onDone(), 600);
        return;
      }
      const phase = PHASES[phaseIdx];
      const elapsed = now - phaseStart;
      const t = Math.min(elapsed / phase.ms, 1);
      // Slight ease-out so each phase decelerates into its endpoint
      // (makes the "stuck" phases feel like real I/O wind-down).
      const eased = 1 - Math.pow(1 - t, 1.4);
      const cur = phaseFrom + (phase.to - phaseFrom) * eased;
      setPct(cur);

      if (t >= 1) {
        phaseFrom = phase.to;
        phaseIdx += 1;
        phaseStart = now;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSub = SUBS.find((s) => pct >= s.from && pct < s.to) ?? SUBS[SUBS.length - 1];
  const activeTaskIdx = TASKS.findIndex((t) => pct < t.threshold);
  const currentTask = activeTaskIdx === -1 ? TASKS.length - 1 : activeTaskIdx;
  const displayPct = Math.min(100, Math.floor(pct));

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={130} />
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 24 }}
      >
        Setup in progress
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 28,
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 1.05,
          margin: '8px 0 0',
          maxWidth: 440,
        }}
      >
        Setting everything{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>up for you</em>.
      </h2>
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-ink-60)',
          marginTop: 12,
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        Building your profile across{' '}
        <em style={{ color: 'var(--b-accent)', fontStyle: 'italic', fontWeight: 600 }}>all 5 pillars</em> — strength, sleep, water, focus, steps.
      </p>

      <div className="mt-9 w-full max-w-sm">
        {/* The single continuous bar */}
        <div className="flex items-baseline justify-between mb-2">
          <span
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            {activeSub.label}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono, ui-monospace)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--b-ink)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayPct}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--b-paper)',
            border: '1px solid var(--b-rule)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--b-ink)',
              transition: 'width 0.05s linear',
            }}
          />
        </div>

        {/* 3 macro task lines — checkmarks pop as bar crosses thresholds */}
        <div className="mt-6 space-y-2.5 text-left">
          {TASKS.map((t, i) => {
            const isDone = pct >= t.threshold;
            const isActive = i === currentTask && !isDone;
            return (
              <div key={t.label} className="flex items-center gap-2.5">
                {isDone ? (
                  <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                    <CheckCircleFullIcon size={17} />
                  </span>
                ) : (
                  <div
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: '50%',
                      border: isActive ? '2px solid var(--b-accent)' : '1px solid var(--b-rule)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isActive && (
                      <span
                        className="animate-pulse"
                        style={{
                          display: 'block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--b-accent)',
                        }}
                      />
                    )}
                  </div>
                )}
                <span
                  className="font-display"
                  style={{
                    fontSize: 13,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: isDone ? 'var(--b-ink-60)' : isActive ? 'var(--b-ink)' : 'var(--b-ink-40)',
                    transition: 'color 0.2s',
                  }}
                >
                  {t.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Ranking explainer ───────────────────────────────────────────────

function RankingExplainerStep({
  draft,
  onContinue,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  onContinue: () => void;
}) {
  type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
  type PillarKey = 'strength' | 'sleep' | 'hydration' | 'focus' | 'steps';

  // Real ranks derived from the user's actual onboarding answers.
  // (See derivePillarRanks for the heuristics.)
  const ranks = derivePillarRanks(draft);
  const isWeak = (k: PillarKey) => ranks.weak.includes(k);

  const PILLARS: {
    key: PillarKey;
    name: string;
    sub: string;
    rank: string;
    Icon: IconCmp;
    weak?: boolean;
  }[] = [
    { key: 'strength',  name: 'Strength',  sub: 'Lifts, push-ups, gym time',     rank: ranks.strength,  Icon: GymIcon   as IconCmp, weak: isWeak('strength') },
    { key: 'sleep',     name: 'Sleep',     sub: 'Hours, consistency, recovery',  rank: ranks.sleep,     Icon: SleepIcon as IconCmp, weak: isWeak('sleep') },
    { key: 'hydration', name: 'Hydration', sub: 'Water vs body weight goal',     rank: ranks.hydration, Icon: WaterIcon as IconCmp, weak: isWeak('hydration') },
    { key: 'focus',     name: 'Focus',     sub: 'Deep work, less screen time',   rank: ranks.focus,     Icon: ScreenIcon as IconCmp, weak: isWeak('focus') },
    { key: 'steps',     name: 'Steps',     sub: 'Daily movement, NEAT activity', rank: ranks.steps,     Icon: StepsIcon as IconCmp, weak: isWeak('steps') },
  ];

  // Overall: average the 5 pillars on the same 8-tier ladder, then
  // map back to a letter so the synthesis card reads consistently.
  const LETTERS: string[] = ['F', 'D', 'C', 'C+', 'B', 'B+', 'A', 'A+'];
  const overallIdx = Math.round(
    PILLARS.reduce((sum, p) => sum + LETTERS.indexOf(p.rank), 0) / PILLARS.length,
  );
  const overall = LETTERS[Math.max(0, Math.min(LETTERS.length - 1, overallIdx))];

  // Light entrance stagger so the list feels alive.
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= PILLARS.length) clearInterval(id);
    }, 110);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col flex-1 text-center">
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
      >
        How Outrank works
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 28,
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 1.05,
          margin: '8px 0 0',
          maxWidth: 440,
          marginInline: 'auto',
        }}
      >
        Every pillar has its own{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>rank</em>.
      </h2>
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-ink-60)',
          marginTop: 12,
          maxWidth: 360,
          marginInline: 'auto',
          lineHeight: 1.6,
        }}
      >
        Strength is just one of{' '}
        <em style={{ color: 'var(--b-ink)', fontWeight: 600, fontStyle: 'italic' }}>5 pillars</em>. Sleep, water, focus and steps each get measured separately — your weakest one is what holds you back most.
      </p>

      {/* Ranked pillar stack — all 5 with icons */}
      <div className="mt-6 mx-auto max-w-sm w-full" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PILLARS.map((p, i) => {
          const visible = i < revealed;
          const Icon = p.Icon;
          return (
            <div
              key={p.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                background: 'transparent',
                border: p.weak ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: p.weak ? '3px solid var(--b-accent)' : '3px solid transparent',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(16px)',
                transition: 'opacity 0.5s, transform 0.5s',
              }}
            >
              {/* Icon tile — hairline frame */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--b-rule)',
                  color: p.weak ? 'var(--b-accent)' : 'var(--b-ink-60)',
                }}
              >
                <Icon size={24} />
              </div>

              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    className="font-display"
                    style={{
                      fontSize: 15,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      color: 'var(--b-ink)',
                    }}
                  >
                    {p.name}
                  </span>
                  {p.weak && (
                    <span
                      className="spread"
                      style={{
                        fontSize: 8,
                        color: 'var(--b-accent)',
                        border: '1px solid var(--b-accent)',
                        padding: '1px 5px',
                      }}
                    >
                      Weak
                    </span>
                  )}
                </div>
                <p
                  className="font-body"
                  style={{
                    fontSize: 11,
                    color: 'var(--b-ink-60)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.sub}
                </p>
              </div>

              {/* Rank badge — typographic, no glow */}
              <div
                className="font-display"
                style={{
                  width: 48,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontStyle: 'italic',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: p.weak ? 'var(--b-accent)' : 'var(--b-ink)',
                  border: '1px solid var(--b-rule)',
                  borderTop: '2px solid var(--b-ink)',
                  fontSize: p.rank.length > 1 ? 17 : 20,
                }}
              >
                {p.rank}
              </div>
            </div>
          );
        })}
      </div>

      {/* Average rank synthesis */}
      <div
        className="mt-4 mx-auto max-w-sm w-full"
        style={{
          padding: '12px 16px',
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ color: 'var(--b-accent)', display: 'inline-flex', flexShrink: 0 }}>
          <FireIcon size={20} />
        </span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            Overall rank
          </div>
          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: 'var(--b-ink-60)',
              lineHeight: 1.4,
              marginTop: 2,
            }}
          >
            Average across all 5. Climb the weakest to lift it.
          </p>
        </div>
        <div
          className="font-display"
          style={{
            fontSize: 24,
            fontStyle: 'italic',
            fontWeight: 700,
            color: 'var(--b-accent)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {overall}
        </div>
      </div>

      <p
        className="font-body"
        style={{
          fontSize: 11.5,
          color: 'var(--b-ink-60)',
          marginTop: 16,
          maxWidth: 360,
          marginInline: 'auto',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: 'var(--b-accent)', display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
          <BoltFullIcon size={11} />
        </span>
        Every check-in updates the right pillar.{' '}
        <em style={{ color: 'var(--b-accent)', fontWeight: 600, fontStyle: 'italic' }}>Find the weakest. Climb it.</em>
      </p>

      <div className="mt-auto pt-5">
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
          Makes sense →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Sign up ─────────────────────────────────────────────────────────

function SignupStep({
  draft,
  onSuccess,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  onSuccess: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Existing users (re-onboarding to fill in the new tailoring
  // questions) hit this step already authenticated. The signup
  // form would fail for them — instead we offer a single "save my
  // answers" button that applies the draft to their existing user
  // doc and continues to the welcome step.
  const { user: authUser } = useAuth();
  const reonboarding = !!authUser;

  // Apply onboarding draft to a fresh user doc + seed pillars. Runs
  // after either email/password OR Google auth completes.
  const applyDraft = async (uid: string) => {
    // Update users/{uid} doc with onboarding fields. Auth helpers
    // already created a base profile; we layer the onboarding-
    // specific fields (body stats, goals, etc) on top via merge.
    const draftFields: Record<string, unknown> = {
      onboardingCompleted: true,
      onboardingCompletedAt: Timestamp.now(),
    };
    if (draft.name)             draftFields.displayName = draft.name;
    if (draft.experienceLevel)  draftFields.experienceLevel = draft.experienceLevel;
    if (draft.goals)            draftFields.goals = draft.goals;
    if (draft.sex)              draftFields.sex = draft.sex;
    if (draft.height)           draftFields.height = draft.height;
    if (draft.weight)           draftFields.weight = draft.weight;
    if (typeof draft.age === 'number') draftFields.age = draft.age;
    if (draft.struggles)        draftFields.struggles = draft.struggles;
    if (draft.energyLevels)     draftFields.energyLevels = draft.energyLevels;
    if (draft.exerciseLocation) draftFields.exerciseLocation = draft.exerciseLocation;
    if (draft.equipment)        draftFields.equipment = draft.equipment;
    if (typeof draft.workoutDuration === 'number') draftFields.workoutDuration = draft.workoutDuration;
    if (typeof draft.workoutDaysPerWeek === 'number') draftFields.workoutDaysPerWeek = draft.workoutDaysPerWeek;
    if (draft.workoutDays)      draftFields.workoutDays = draft.workoutDays;
    if (draft.workoutReminderTime) draftFields.workoutReminderTime = draft.workoutReminderTime;
    if (draft.bestLifts)        draftFields.bestLifts = draft.bestLifts;
    if (draft.tier)             draftFields.tier = draft.tier;

    // Diet — store the user's chosen activity/goal/target weight, then
    // compute their calorieGoal + macroGoals if we have everything we
    // need (height, weight, age, sex, activity, goal). The diet page
    // reads these flat fields off users/{uid}.
    if (draft.activityLevel)    draftFields.activityLevel = draft.activityLevel;
    if (draft.dietGoal)         draftFields.dietGoal = draft.dietGoal;
    if (draft.targetWeight)     draftFields.targetWeight = draft.targetWeight;

    if (
      draft.height && draft.weight && typeof draft.age === 'number'
      && draft.sex && draft.activityLevel && draft.dietGoal
    ) {
      const rec = recommendCalories({
        height:        draft.height,
        weight:        draft.weight,
        age:           draft.age,
        sex:           draft.sex,
        activityLevel: draft.activityLevel,
        dietGoal:      draft.dietGoal,
      });
      draftFields.calorieGoal = rec.calorieGoal;
      draftFields.macroGoals  = rec.macroGoals;
      draftFields.bmr         = rec.bmr;
      draftFields.tdee        = rec.tdee;
    }

    // setDocument's 4th arg is `merge` boolean, not an options object.
    await setDocument('users', uid, draftFields, true);

    // Seed all 5 pillars with derived goals
    const goals = derivePillarGoals(draft);
    await seedAllPillars(uid, goals);

    // Build a routine tailored from the FULL onboarding draft —
    // duration, equipment, goals, struggles, last-worked muscles
    // are all consumed by buildTailoredProgram. The result is saved
    // as the user's customProgram and set as their active program,
    // so the first /gym visit shows a routine they can already
    // recognise as theirs.
    try {
      const { selectCustomProgram, buildTailoredProgram } = await import('@/lib/gym');
      const { program } = buildTailoredProgram(draft);
      await selectCustomProgram(uid, program);
    } catch {
      // Non-fatal: the user can still pick from /gym manually.
    }
  };

  const handleEmailSignup = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Generate a unique username from the user's name + random suffix.
      const baseName = sanitizeUsername(draft.name || 'lifter').toLowerCase().slice(0, 14) || 'lifter';
      let username = baseName;
      // Quick collision check — pick another suffix if taken.
      let attempt = 0;
      while (attempt < 5) {
        const taken = await getDoc(doc(db, 'usernames', username));
        if (!taken.exists()) break;
        attempt += 1;
        username = `${baseName}_${Math.random().toString(36).slice(2, 6)}`;
      }

      const user = await registerWithEmail(email, password, username);
      await applyDraft(user.uid);
      addToast({ type: 'success', message: "You're in! Let's go." });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { user } = await loginWithGoogle();
      await applyDraft(user.uid);
      addToast({ type: 'success', message: "You're in! Let's go." });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!email && password.length >= 8;

  // Existing-user path — they're already signed in, so just write the
  // draft fields to their user doc + flip onboardingCompleted, no
  // account creation needed. This is what runs when an existing user
  // gets pushed through the funnel by the AuthGuard re-onboarding gate.
  const handleReonboardingSave = async () => {
    if (loading || !authUser) return;
    setLoading(true);
    try {
      await applyDraft(authUser.uid);
      addToast({ type: 'success', message: 'Plan updated. Welcome back.' });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save your answers';
      addToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (reonboarding) {
    return (
      <div className="flex flex-col flex-1">
        <div className="text-center mt-2">
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Last step
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1.05,
              margin: '8px 0 0',
              maxWidth: 440,
              marginInline: 'auto',
            }}
          >
            Your plan is{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>ready to be saved</em>.
          </h2>
          <p
            className="font-body"
            style={{
              fontSize: 13,
              color: 'var(--b-ink-60)',
              marginTop: 12,
              maxWidth: 360,
              marginInline: 'auto',
              lineHeight: 1.6,
            }}
          >
            We&apos;ll write your answers to your existing account, rebuild your routine, and recompute your calories. No new account needed.
          </p>
        </div>

        <div className="mt-8 max-w-md mx-auto w-full">
          <Button
            className="w-full h-12"
            onClick={handleReonboardingSave}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save & continue →'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          Last step
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '8px 0 0',
            maxWidth: 440,
            marginInline: 'auto',
          }}
        >
          A bigger you is{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>closer than you think</em>.
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: 13,
            color: 'var(--b-ink-60)',
            marginTop: 12,
            maxWidth: 360,
            marginInline: 'auto',
            lineHeight: 1.6,
          }}
        >
          Save your profile so you don&apos;t lose all the answers.
        </p>
      </div>

      <div className="mt-6 space-y-3 max-w-md mx-auto w-full">
        {/* Google button — primary visual */}
        <Button
          variant="secondary"
          className="w-full h-12"
          onClick={handleGoogle}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <div style={{ position: 'relative', margin: '8px 0' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%', borderTop: '1px solid var(--b-rule)' }} />
          </div>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <span
              className="spread"
              style={{
                background: 'var(--b-paper)',
                padding: '0 12px',
                fontSize: 9,
                color: 'var(--b-ink-60)',
              }}
            >
              Or with email
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="font-body"
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--b-rule)',
              padding: '12px 16px',
              color: 'var(--b-ink)',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (8+ chars)"
            autoComplete="new-password"
            className="font-body"
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--b-rule)',
              padding: '12px 16px',
              color: 'var(--b-ink)',
              fontSize: 15,
              outline: 'none',
            }}
          />
          <button
            onClick={handleEmailSignup}
            disabled={!canSubmit}
            className="font-body"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: canSubmit ? 'var(--b-ink)' : 'transparent',
              color: canSubmit ? 'var(--b-paper)' : 'var(--b-ink-40)',
              border: '1px solid var(--b-ink)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: canSubmit ? 1 : 0.4,
            }}
          >
            {loading ? 'Creating profile…' : 'Create account →'}
          </button>
        </div>

        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 1.6,
          }}
        >
          By signing up you agree to our terms and privacy policy.<br/>
          Already have an account?{' '}
          <Link
            href="/auth/login"
            style={{
              color: 'var(--b-accent)',
              fontWeight: 600,
              fontStyle: 'italic',
              textDecoration: 'underline',
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Welcome (post-signup) ──────────────────────────────────────────

function WelcomeFinalStep({ name, onContinue }: { name: string; onContinue: () => void }) {
  const [showName, setShowName] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowName(true), 900);
    const t2 = setTimeout(() => setShowCTA(true), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className="dir-b min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Subtle accent flourishes — quiet, not aurora */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute top-1/4 left-1/4"
          style={{ color: 'var(--b-accent)', opacity: 0.7 }}
        >
          <SparklesIcon size={28} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute top-1/3 right-1/4"
          style={{ color: 'var(--b-ink-60)', opacity: 0.7 }}
        >
          <TrophyIconFull size={24} />
        </motion.div>

        <div className="animate-splash-phoenix-in">
          <PhoenixMascot size={180} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.55 }}
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 28 }}
        >
          Welcome
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6 }}
          className="font-display"
          style={{
            fontSize: 38,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '8px 0 0',
            maxWidth: 440,
            color: 'var(--b-ink)',
          }}
        >
          Welcome to{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>Outrank</em>
        </motion.h1>

        <AnimatePresence>
          {showName && (
            <motion.div
              key="quote"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                marginTop: 24,
                maxWidth: 380,
                width: '100%',
                padding: '18px 20px 16px',
                background: 'var(--b-paper)',
                borderTop: '2px solid var(--b-ink)',
                borderLeft: '1px solid var(--b-rule)',
                borderRight: '1px solid var(--b-rule)',
                borderBottom: '1px solid var(--b-rule)',
                textAlign: 'left',
              }}
            >
              <p
                className="font-display"
                style={{
                  fontSize: 16,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: 'var(--b-ink)',
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                Your profile is ready,{' '}
                <em style={{ color: 'var(--b-accent)', fontWeight: 600, fontStyle: 'italic' }}>{name}</em>.
              </p>
              <p
                className="spread"
                style={{
                  fontSize: 9,
                  color: 'var(--b-ink-60)',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px solid var(--b-rule)',
                }}
              >
                — Your first day awaits
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showName && (
            <motion.p
              key="sub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-body"
              style={{
                fontSize: 13,
                color: 'var(--b-ink-60)',
                marginTop: 14,
                maxWidth: 360,
                lineHeight: 1.6,
              }}
            >
              Time to log your first day and watch your orb come to life.
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
              Enter Outrank →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
