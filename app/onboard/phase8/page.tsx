'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { registerWithEmail, loginWithGoogle } from '@/lib/auth';
import { seedAllPillars } from '@/lib/seedPillar';
import { setDocument, Timestamp, doc } from '@/lib/firestore';
import { getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeUsername } from '@/lib/security';
import { derivePillarGoals, clearDraft } from '@/lib/onboardingDraft';
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
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
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
          {step === 1 && <RankingExplainerStep onContinue={() => setStep(2)} />}
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
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-6 leading-tight">
        Setting everything<br/><span className="text-orange-400">up for you</span>.
      </h2>
      <p className="text-slate-300/85 mt-3 max-w-sm text-[14px] leading-relaxed">
        Building your profile across <span className="text-orange-400 font-semibold">all 5 pillars</span> — strength, sleep, water, focus, steps.
      </p>

      <div className="mt-9 w-full max-w-sm">
        {/* The single continuous bar */}
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-orange-300/80">
            {activeSub.label}
          </span>
          <span className="text-[13px] font-mono tabular-nums font-bold text-white">
            {displayPct}%
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden relative border border-white/[0.04]">
          <div
            className="h-full rounded-full relative overflow-hidden"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #dc2626, #f97316, #fb923c)',
              boxShadow: '0 0 12px -2px rgba(249,115,22,0.7)',
            }}
          >
            {/* Animated shimmer streak that runs across the filled portion */}
            <div className="absolute inset-0 animate-loader-shimmer pointer-events-none" />
          </div>
        </div>

        {/* 3 macro task lines — checkmarks pop as bar crosses thresholds */}
        <div className="mt-6 space-y-2.5 text-left">
          {TASKS.map((t, i) => {
            const isDone = pct >= t.threshold;
            const isActive = i === currentTask && !isDone;
            return (
              <div key={t.label} className="flex items-center gap-2.5">
                {isDone ? (
                  <CheckCircleFullIcon size={17} className="text-orange-400" />
                ) : (
                  <div
                    className={cn(
                      'w-[17px] h-[17px] rounded-full border-2 flex items-center justify-center',
                      isActive ? 'border-orange-400' : 'border-white/15',
                    )}
                  >
                    {isActive && (
                      <span className="block w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                    )}
                  </div>
                )}
                <span
                  className={cn(
                    'text-[13px] font-bold transition-colors',
                    isDone ? 'text-white/70' : isActive ? 'text-white' : 'text-slate-500',
                  )}
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

function RankingExplainerStep({ onContinue }: { onContinue: () => void }) {
  type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
  const PILLARS: {
    name: string;
    sub: string;
    rank: string;
    tone: string;
    Icon: IconCmp;
    weak?: boolean;
  }[] = [
    { name: 'Strength',  sub: 'Lifts, push-ups, gym time',     rank: 'B+', tone: '#ef4444', Icon: GymIcon as IconCmp },
    { name: 'Sleep',     sub: 'Hours, consistency, recovery',  rank: 'C',  tone: '#a78bfa', Icon: SleepIcon as IconCmp, weak: true },
    { name: 'Hydration', sub: 'Water vs body weight goal',     rank: 'A',  tone: '#3b82f6', Icon: WaterIcon as IconCmp },
    { name: 'Focus',     sub: 'Deep work, less screen time',   rank: 'F',  tone: '#f59e0b', Icon: ScreenIcon as IconCmp, weak: true },
    { name: 'Steps',     sub: 'Daily movement, NEAT activity', rank: 'A+', tone: '#22c55e', Icon: StepsIcon as IconCmp },
  ];

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
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">How Outrank works</p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2.5 leading-tight">
        Every pillar has<br/>its own <span className="text-orange-400">rank</span>.
      </h2>
      <p className="text-slate-300/85 mt-3 max-w-sm mx-auto text-[13px] leading-relaxed">
        Strength is just one of <span className="text-white font-semibold">5 pillars</span>. Sleep, water, focus and steps each get measured separately — your weakest one is what holds you back most.
      </p>

      {/* Ranked pillar stack — all 5 with icons */}
      <div className="mt-6 mx-auto max-w-sm w-full space-y-2">
        {PILLARS.map((p, i) => {
          const visible = i < revealed;
          const Icon = p.Icon;
          return (
            <div
              key={p.name}
              className={cn(
                'rounded-xl border p-3 flex items-center gap-3 transition-all duration-500',
                visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4',
                p.weak
                  ? 'bg-red-500/[0.07] border-red-500/30 shadow-[0_0_24px_-12px_rgba(239,68,68,0.55)]'
                  : 'bg-white/[0.025] border-white/[0.07]',
              )}
            >
              {/* Tone-colored icon tile */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${p.tone}33, ${p.tone}11)`,
                  border: `1px solid ${p.tone}40`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-40"
                  style={{ background: `radial-gradient(circle at 30% 25%, ${p.tone}66, transparent 65%)` }}
                />
                <Icon size={24} className="relative" />
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-bold text-[15px] text-white">{p.name}</span>
                  {p.weak && (
                    <span className="text-[8.5px] font-bold uppercase tracking-widest text-red-300 bg-red-500/15 border border-red-500/30 px-1.5 py-[1px] rounded">
                      Weak
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.sub}</p>
              </div>

              {/* Rank badge */}
              <div
                className="w-12 h-11 rounded-lg flex items-center justify-center shrink-0 font-heading font-black tabular-nums"
                style={{
                  color: p.tone,
                  background: `linear-gradient(180deg, ${p.tone}1f, ${p.tone}08)`,
                  border: `1.4px solid ${p.tone}55`,
                  textShadow: `0 0 14px ${p.tone}66`,
                  fontSize: p.rank.length > 1 ? '17px' : '20px',
                }}
              >
                {p.rank}
              </div>
            </div>
          );
        })}
      </div>

      {/* Average rank synthesis */}
      <div className="mt-4 mx-auto max-w-sm w-full rounded-xl bg-gradient-to-r from-orange-500/[0.08] to-red-500/[0.08] border border-orange-500/25 px-4 py-3 flex items-center gap-3">
        <FireIcon size={20} className="text-orange-400 shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[11px] uppercase tracking-widest font-bold text-orange-300">Overall rank</p>
          <p className="text-[12px] text-slate-300 leading-snug">Average across all 5. Climb the weakest to lift it.</p>
        </div>
        <div className="font-heading font-black text-2xl text-orange-400 tabular-nums" style={{ textShadow: '0 0 16px rgba(251,146,60,0.55)' }}>
          B
        </div>
      </div>

      <p className="text-slate-400 mt-4 max-w-sm mx-auto text-[11.5px] leading-relaxed">
        <BoltFullIcon size={11} className="inline-block text-orange-400 mr-1 -mt-[1px]" />
        Every check-in updates the right pillar. <span className="text-orange-400 font-semibold">Find the weakest. Climb it.</span>
      </p>

      <div className="mt-auto pt-5">
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
        >
          MAKES SENSE
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

    // setDocument's 4th arg is `merge` boolean, not an options object.
    await setDocument('users', uid, draftFields, true);

    // Seed all 5 pillars with derived goals
    const goals = derivePillarGoals(draft);
    await seedAllPillars(uid, goals);
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

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">Last step</p>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2 leading-tight">
          A bigger you is<br/><span className="text-orange-400">closer than you think</span>.
        </h2>
        <p className="text-slate-300/85 mt-3 max-w-sm mx-auto text-[13px] leading-relaxed">
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

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/8" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-[#08080f] px-3 text-slate-500 uppercase tracking-widest font-bold">Or with email</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full bg-[#10101a] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[15px] outline-none transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (8+ chars)"
            autoComplete="new-password"
            className="w-full bg-[#10101a] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[15px] outline-none transition-colors"
          />
          <button
            onClick={handleEmailSignup}
            disabled={loading || !email || password.length < 8}
            className={cn(
              'w-full py-3.5 rounded-xl font-bold text-[15px] text-white transition-all shadow-lg',
              loading || !email || password.length < 8
                ? 'opacity-40 cursor-not-allowed'
                : 'shadow-red-600/30 hover:brightness-110',
            )}
            style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
          >
            {loading ? 'Creating profile…' : 'Create account'}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-4 leading-relaxed">
          By signing up you agree to our terms and privacy policy.<br/>
          Already have an account?{' '}
          <Link href="/auth/login" className="text-orange-400 hover:underline font-semibold">
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
    <div className="min-h-screen bg-[#08080f] flex flex-col relative overflow-hidden">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45), transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.35), transparent 70%)' }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Sparkle accents */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute top-1/4 left-1/4"
        >
          <SparklesIcon size={28} className="text-orange-400 opacity-70" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute top-1/3 right-1/4"
        >
          <TrophyIconFull size={24} className="text-yellow-400 opacity-70" />
        </motion.div>

        <div className="animate-splash-phoenix-in">
          <PhoenixMascot size={180} />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.6 }}
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
              className="text-slate-200 mt-4 text-lg"
            >
              Your profile is ready,{' '}
              <span className="text-orange-400 font-semibold">{name}</span>.
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showName && (
            <motion.p
              key="sub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-slate-400 mt-2 text-[14px] max-w-sm leading-relaxed"
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
              className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
            >
              ENTER OUTRANK
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
