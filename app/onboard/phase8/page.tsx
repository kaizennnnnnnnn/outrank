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
import { CheckCircleFullIcon, SparklesIcon, TrophyIconFull } from '@/components/ui/AppIcons';

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

function SetupLoaderStep({ onDone }: { onDone: () => void }) {
  const tasks = [
    { label: 'Compiling your profile', sub: 'Body, goals, equipment' },
    { label: 'Calculating your ranks', sub: 'Across every category' },
    { label: 'Personalizing your plan', sub: 'Tailored to your goals' },
  ];
  const [progress, setProgress] = useState(0); // 0..3 — index of currently filling task
  const [bars, setBars] = useState([0, 0, 0]); // 0-1 fill % per bar

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const STEP_DUR = 1400; // ms per bar
    function tick(now: number) {
      const elapsed = now - start;
      const newBars = [0, 0, 0];
      let advancingTo = 0;
      for (let i = 0; i < 3; i++) {
        const taskStart = i * STEP_DUR;
        const taskEnd = taskStart + STEP_DUR;
        if (elapsed >= taskEnd) {
          newBars[i] = 1;
        } else if (elapsed >= taskStart) {
          newBars[i] = (elapsed - taskStart) / STEP_DUR;
          advancingTo = i;
        } else {
          newBars[i] = 0;
        }
      }
      setBars(newBars);
      setProgress(advancingTo);
      if (elapsed < STEP_DUR * 3) {
        raf = requestAnimationFrame(tick);
      } else {
        // Hold the "all done" state briefly
        setProgress(3);
        setTimeout(onDone, 600);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={130} />
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-6 leading-tight">
        Setting everything<br/><span className="text-orange-400">up for you</span>.
      </h2>
      <p className="text-slate-300/85 mt-3 max-w-sm text-[14px] leading-relaxed">
        Building your profile based on every answer you gave us.
      </p>

      <div className="mt-10 w-full max-w-sm space-y-4">
        {tasks.map((t, i) => {
          const isDone = bars[i] >= 1;
          const isActive = i === progress;
          return (
            <div key={t.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircleFullIcon size={16} className="text-orange-400" />
                  ) : (
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2',
                      isActive ? 'border-orange-400 animate-pulse' : 'border-white/15',
                    )} />
                  )}
                  <span className={cn(
                    'text-[13px] font-bold transition-colors',
                    isDone || isActive ? 'text-white' : 'text-slate-500',
                  )}>
                    {t.label}
                  </span>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {Math.floor(bars[i] * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear"
                  style={{
                    width: `${bars[i] * 100}%`,
                    background: 'linear-gradient(90deg, #dc2626, #f97316)',
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1">{t.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1: Ranking explainer ───────────────────────────────────────────────

function RankingExplainerStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col flex-1 justify-center text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">How Outrank works</p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight">
        Every part has<br/>its own <span className="text-orange-400">rank</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm mx-auto text-[14px] leading-relaxed">
        Your body and habits each get measured separately. Train the weak ones to climb.
      </p>

      {/* Ranked muscle stack visual */}
      <div className="mt-8 mx-auto max-w-sm w-full space-y-2">
        {[
          { name: 'Chest', rank: 'A', tone: '#fb923c', dim: false },
          { name: 'Arms', rank: 'A+', tone: '#fde047', dim: false },
          { name: 'Back', rank: 'B', tone: '#cbd5e1', dim: false },
          { name: 'Abs', rank: 'C', tone: '#94a3b8', dim: true },
          { name: 'Legs', rank: 'F', tone: '#ef4444', dim: true, weak: true },
        ].map((m) => (
          <div
            key={m.name}
            className={cn(
              'rounded-xl border px-4 py-3 flex items-center justify-between transition-all',
              m.weak
                ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_20px_-10px_rgba(239,68,68,0.6)]'
                : m.dim
                ? 'bg-white/[0.02] border-white/[0.06]'
                : 'bg-orange-500/5 border-orange-500/20',
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-7 rounded-full" style={{ background: m.tone }} />
              <span className={cn('font-bold text-[14px]', m.dim ? 'text-slate-400' : 'text-white')}>
                {m.name}
              </span>
              {m.weak && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded">
                  Train me
                </span>
              )}
            </div>
            <div
              className="px-3 py-1 rounded-md font-mono text-[14px] font-bold"
              style={{
                color: m.tone,
                background: m.weak ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1.2px solid ${m.tone}40`,
              }}
            >
              {m.rank}
            </div>
          </div>
        ))}
      </div>

      <p className="text-slate-400 mt-6 max-w-sm mx-auto text-[12px] leading-relaxed">
        Every habit gets the same treatment — sleep, water, focus, steps. <span className="text-orange-400 font-semibold">Find the weakest. Climb it.</span>
      </p>

      {/* Footer is rendered by WizardShell — but we need our own CTA here */}
      <div className="mt-auto pt-6">
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
