'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { Tier } from '@/types/onboarding';
import { CheckCircleFullIcon, TrophyIconFull, BoltFullIcon, FireIcon } from '@/components/ui/AppIcons';

/**
 * Phase 7 — Plan selection + trial reminder + payment UI.
 *
 * Three steps:
 *   0. Plan picker — Pro (recommended) vs Free
 *   1. Trial reminder — 2 or 3 days before charge (Pro only)
 *   2. Payment UI — looks-only mock; Stripe wires up later
 *
 * The Free path skips the trial reminder + payment entirely and
 * jumps straight to /onboard/phase8.
 */

const TOTAL_STEPS = 3;

export default function OnboardPhase7Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const isPro = draft.tier === 'pro';

  const next = () => {
    // Free users skip the trial + payment steps and go straight to Phase 8.
    if (step === 0 && draft.tier === 'free') {
      router.push('/onboard/phase8');
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase8');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard/phase6');
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
            <PlanPickerStep
              value={draft.tier}
              onChange={(tier) => update({ tier })}
            />
          )}
          {step === 1 && isPro && (
            <TrialReminderStep
              value={draft.trialReminderDays}
              onChange={(trialReminderDays) => update({ trialReminderDays })}
            />
          )}
          {step === 2 && isPro && <PaymentStep />}
        </motion.div>
      </AnimatePresence>
    </WizardShell>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function renderFooter(
  step: number,
  draft: ReturnType<typeof useOnboardingDraft>['draft'],
  next: () => void,
) {
  const canProceed =
    (step === 0 && !!draft.tier) ||
    (step === 1) || // trial-reminder is optional
    (step === 2);

  const labels: Record<number, string> = {
    0: draft.tier === 'pro' ? 'START FREE TRIAL' : 'CONTINUE FREE',
    1: 'CONTINUE',
    2: 'START 7-DAY FREE TRIAL',
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
      style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
    >
      {labels[step] || 'CONTINUE'}
    </motion.button>
  );
}

// ─── Step 0: Plan picker ─────────────────────────────────────────────────────

const PRO_FEATURES = [
  'Compete on global leaderboards',
  'Compare ranks with everyone',
  'Unlock all rank tiers + Mythic orbs',
  'Detailed body + habit progress graphs',
  'Friends Leagues + group competitions',
  'Priority support',
];
const FREE_FEATURES = [
  'Track your 5 core pillars',
  'Build streaks + earn XP',
  'Compete with friends 1-on-1',
  'Basic orb customization',
];

function PlanPickerStep({
  value,
  onChange,
}: {
  value?: Tier;
  onChange: (v: Tier) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">Choose your path</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
          How do you want to <span className="text-orange-400">start</span>?
        </h2>
      </div>

      <div className="space-y-3 mt-6">
        {/* PRO card — featured */}
        <button
          onClick={() => onChange('pro')}
          className={cn(
            'relative w-full text-left rounded-2xl border-2 p-5 transition-all overflow-hidden',
            value === 'pro'
              ? 'border-orange-400 bg-orange-500/10 shadow-[0_0_28px_-6px_rgba(249,115,22,0.6)]'
              : 'border-white/10 bg-[#10101a] hover:border-orange-400/50',
          )}
        >
          {/* Recommended ribbon */}
          <span
            className="absolute -top-px right-4 px-3 py-1 rounded-b-md text-[9px] font-bold uppercase tracking-widest text-white"
            style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
          >
            Recommended
          </span>

          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #fb923c, #dc2626)' }}
            >
              <TrophyIconFull size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-xl font-bold text-white">Outrank Pro</p>
              <p className="text-[12px] text-orange-300 font-semibold">
                7 days free, then $9.99/month
              </p>
            </div>
            {value === 'pro' && <CheckCircleFullIcon size={22} className="text-orange-400" />}
          </div>

          <ul className="space-y-1.5 mt-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-slate-200">
                <CheckCircleFullIcon size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </button>

        {/* FREE card */}
        <button
          onClick={() => onChange('free')}
          className={cn(
            'w-full text-left rounded-2xl border-2 p-5 transition-all',
            value === 'free'
              ? 'border-orange-400 bg-orange-500/10 shadow-[0_0_20px_-6px_rgba(249,115,22,0.5)]'
              : 'border-white/10 bg-[#10101a] hover:border-white/20',
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04]">
              <BoltFullIcon size={20} className="text-slate-300" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-lg font-bold text-white">Free</p>
              <p className="text-[12px] text-slate-500">Forever, no card needed</p>
            </div>
            {value === 'free' && <CheckCircleFullIcon size={20} className="text-orange-400" />}
          </div>
          <ul className="space-y-1 mt-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12px] text-slate-400">
                <CheckCircleFullIcon size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </button>
      </div>

      <p className="text-[11px] text-slate-500 text-center mt-4">
        Cancel anytime. No charge during your free trial.
      </p>
    </div>
  );
}

// ─── Step 1: Trial reminder ──────────────────────────────────────────────────

function TrialReminderStep({
  value,
  onChange,
}: {
  value?: 2 | 3;
  onChange: (v: 2 | 3) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">No surprises</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
          We&apos;ll <span className="text-orange-400">remind you</span> before<br/>your trial ends.
        </h2>
        <p className="text-slate-300/85 mt-3 max-w-sm mx-auto text-[14px] leading-relaxed">
          Pick a reminder so you can decide if Pro is for you — or cancel before any charge.
        </p>
      </div>

      {/* Timeline visual */}
      <div className="mt-8 mx-auto max-w-md w-full">
        <TrialTimeline reminderDays={value ?? 2} />
      </div>

      <div className="space-y-2.5 mt-8">
        {([
          { val: 3 as const, label: '3 days before', sub: 'Lots of time to decide' },
          { val: 2 as const, label: '2 days before', sub: 'A focused heads-up' },
        ]).map((opt) => {
          const active = value === opt.val;
          return (
            <button
              key={opt.val}
              onClick={() => onChange(opt.val)}
              className={cn(
                'w-full text-left rounded-2xl border-2 px-5 py-4 transition-all',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_20px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/10 hover:border-white/20',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
                  {opt.label}
                </span>
                {active && <CheckCircleFullIcon size={18} className="text-orange-400" />}
              </div>
              <p className={cn('text-[13px] mt-0.5', active ? 'text-orange-200/80' : 'text-slate-500')}>
                {opt.sub}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrialTimeline({ reminderDays }: { reminderDays: 2 | 3 }) {
  const reminderDay = 7 - reminderDays; // Day 4 if 3-day, Day 5 if 2-day
  return (
    <div className="relative">
      {/* Track */}
      <div className="absolute left-0 right-0 top-7 h-1 rounded-full bg-white/[0.08]" />
      {/* Filled portion (free trial) */}
      <div
        className="absolute left-0 top-7 h-1 rounded-full"
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #fb923c, #dc2626)',
        }}
      />

      {/* Markers */}
      <div className="relative flex justify-between">
        <Marker label="Today" sub="Sign up" filled tone="orange" />
        <Marker
          label={`Day ${reminderDay}`}
          sub="Reminder"
          filled
          tone="orange"
          highlight
        />
        <Marker label="Day 7" sub="Trial ends" filled tone="orange" />
      </div>
    </div>
  );
}

function Marker({
  label,
  sub,
  filled,
  tone,
  highlight,
}: {
  label: string;
  sub: string;
  filled: boolean;
  tone: 'orange' | 'slate';
  highlight?: boolean;
}) {
  const color = tone === 'orange' ? '#fb923c' : '#475569';
  return (
    <div className="flex flex-col items-center" style={{ width: 80 }}>
      <div
        className={cn(
          'w-4 h-4 rounded-full border-2 mb-2 mt-5',
          highlight && 'ring-4 ring-orange-400/30',
        )}
        style={{
          background: filled ? color : 'transparent',
          borderColor: color,
        }}
      />
      <span className="text-[11px] font-bold text-white">{label}</span>
      <span className="text-[10px] text-slate-500 mt-0.5">{sub}</span>
    </div>
  );
}

// ─── Step 2: Payment UI (looks-only) ─────────────────────────────────────────

function PaymentStep() {
  const [method, setMethod] = useState<'card' | 'apple' | 'google'>('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400">Free trial</p>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
          7 days <span className="text-orange-400">free</span>.<br/>Then $9.99/month.
        </h2>
        <p className="text-slate-300/85 mt-3 max-w-sm mx-auto text-[12px] leading-relaxed">
          You won&apos;t be charged until your trial ends. Cancel anytime in settings.
        </p>
      </div>

      {/* Method tabs */}
      <div className="flex p-1 mt-5 rounded-full bg-[#10101a] border border-white/10">
        {([
          { val: 'card' as const,   label: 'Card' },
          { val: 'apple' as const,  label: 'Apple Pay' },
          { val: 'google' as const, label: 'Google Pay' },
        ]).map((tab) => {
          const active = method === tab.val;
          return (
            <button
              key={tab.val}
              onClick={() => setMethod(tab.val)}
              className={cn(
                'flex-1 py-2 rounded-full text-xs font-bold transition-all',
                active
                  ? 'bg-orange-500 text-white shadow-[0_0_14px_-4px_rgba(249,115,22,0.7)]'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Method panel */}
      <div className="mt-4 flex-1">
        {method === 'card' && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                Card number
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1234 1234 1234 1234"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                className="w-full mt-1.5 bg-[#10101a] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[15px] font-mono outline-none transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  Expiry
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM / YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  className="w-full mt-1.5 bg-[#10101a] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[15px] font-mono outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">
                  CVC
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="•••"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  className="w-full mt-1.5 bg-[#10101a] border border-white/10 focus:border-orange-400 rounded-xl px-4 py-3 text-white text-[15px] font-mono outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        )}
        {method === 'apple' && (
          <div className="rounded-2xl bg-[#10101a] border border-white/10 p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black border border-white/15 mb-3">
              <span className="text-white text-2xl font-bold"></span>
            </div>
            <p className="text-white font-bold text-base">Apple Pay</p>
            <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed max-w-xs mx-auto">
              You&apos;ll confirm your purchase with Face ID or Touch ID on the next screen.
            </p>
          </div>
        )}
        {method === 'google' && (
          <div className="rounded-2xl bg-[#10101a] border border-white/10 p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-3">
              <span className="text-base font-bold tracking-tighter text-slate-900">
                <span className="text-blue-500">G</span>
                <span className="text-red-500">o</span>
                <span className="text-yellow-500">o</span>
                <span className="text-blue-500">g</span>
                <span className="text-green-500">l</span>
                <span className="text-red-500">e</span>
              </span>
            </div>
            <p className="text-white font-bold text-base">Google Pay</p>
            <p className="text-slate-400 text-[13px] mt-1.5 leading-relaxed max-w-xs mx-auto">
              Continue to confirm your purchase with your Google account.
            </p>
          </div>
        )}
      </div>

      {/* Summary card */}
      <div className="mt-5 rounded-2xl bg-[#10101a] border border-white/10 p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-slate-400">Today (free trial)</span>
          <span className="font-bold text-white">$0.00</span>
        </div>
        <div className="flex items-center justify-between text-[13px] mt-2">
          <span className="text-slate-400">After 7 days</span>
          <span className="font-bold text-white">$9.99 / month</span>
        </div>
        <div className="border-t border-white/[0.06] my-3" />
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <FireIcon size={14} className="text-orange-400" />
          <span>No charge today. Cancel anytime in Settings.</span>
        </div>
      </div>
    </div>
  );
}
