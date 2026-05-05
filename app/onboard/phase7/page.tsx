'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div
        className="dir-b min-h-screen flex items-center justify-center"
        style={{ background: 'var(--b-paper)' }}
      >
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
    0: draft.tier === 'pro' ? 'Start free trial' : 'Continue free',
    1: 'Continue',
    2: 'Start 7-day free trial',
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
      {(labels[step] || 'Continue') + ' →'}
    </motion.button>
  );
}

// ─── Step 0: Plan picker ─────────────────────────────────────────────────────

const PRO_FEATURES = [
  'Ranks across all 5 pillars',
  'Global leaderboards per pillar',
  'Sleep, water + focus deep insights',
  'All rank tiers + Mythic orbs',
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
      <div className="text-center">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          Choose your path
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '8px 0 0',
          }}
        >
          How do you want to{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>start</em>?
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {/* PRO card */}
        <button
          onClick={() => onChange('pro')}
          style={{
            position: 'relative',
            width: '100%',
            textAlign: 'left',
            padding: 16,
            background: 'transparent',
            border: value === 'pro' ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
            borderLeft: value === 'pro' ? '3px solid var(--b-accent)' : '3px solid var(--b-ink)',
            cursor: 'pointer',
            color: 'var(--b-ink)',
            overflow: 'hidden',
          }}
        >
          {/* Eyebrow ribbon */}
          <div
            className="spread"
            style={{
              fontSize: 9,
              color: 'var(--b-accent)',
              marginBottom: 10,
            }}
          >
            Best value · 7 days free
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--b-ink)',
                color: 'var(--b-ink)',
              }}
            >
              <span style={{ display: 'inline-flex' }}>
                <TrophyIconFull size={18} />
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="font-display"
                style={{
                  fontSize: 18,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: 'var(--b-ink)',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Outrank Pro
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span
                  className="font-display"
                  style={{ fontSize: 15, fontWeight: 500, color: 'var(--b-ink)' }}
                >
                  $9.99
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
                >
                  / month after trial
                </span>
              </div>
            </div>
            {value === 'pro' && (
              <span style={{ color: 'var(--b-accent)', display: 'inline-flex', flexShrink: 0 }}>
                <CheckCircleFullIcon size={20} />
              </span>
            )}
          </div>

          {/* Hairline divider */}
          <div style={{ borderTop: '1px solid var(--b-rule)', margin: '12px 0' }} />

          <ul
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              columnGap: 10,
              rowGap: 6,
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {PRO_FEATURES.map((f) => (
              <li
                key={f}
                className="font-body"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                  fontSize: 11,
                  lineHeight: 1.4,
                  color: 'var(--b-ink)',
                }}
              >
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex', marginTop: 2, flexShrink: 0 }}>
                  <CheckCircleFullIcon size={11} />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </button>

        {/* FREE card */}
        <button
          onClick={() => onChange('free')}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: 14,
            background: 'transparent',
            border: value === 'free' ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
            borderLeft: value === 'free' ? '3px solid var(--b-accent)' : '3px solid transparent',
            cursor: 'pointer',
            color: 'var(--b-ink)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--b-rule)',
                color: 'var(--b-ink-60)',
              }}
            >
              <span style={{ display: 'inline-flex' }}>
                <BoltFullIcon size={16} />
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="font-display"
                style={{
                  fontSize: 16,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: value === 'free' ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Free
              </p>
              <p
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)', margin: '4px 0 0' }}
              >
                Forever · no card · core features
              </p>
            </div>
            {value === 'free' && (
              <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                <CheckCircleFullIcon size={18} />
              </span>
            )}
          </div>
        </button>
      </div>

      <p
        className="font-body"
        style={{
          fontSize: 10,
          color: 'var(--b-ink-60)',
          textAlign: 'center',
          marginTop: 14,
          fontStyle: 'italic',
        }}
      >
        Cancel anytime. No charge during your free trial.
      </p>

      {/* Hidden but keeps the FREE_FEATURES export usage from being unused */}
      <span style={{ display: 'none' }} aria-hidden>
        {FREE_FEATURES.join(',')}
      </span>
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
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          No surprises
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '8px 0 0',
          }}
        >
          We&apos;ll{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>remind you</em> before
          <br />your trial ends.
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
          Pick a reminder so you can decide if Pro is for you — or cancel before any charge.
        </p>
      </div>

      {/* Timeline */}
      <div className="mt-8 mx-auto max-w-md w-full">
        <TrialTimeline reminderDays={value ?? 2} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
        {([
          { val: 3 as const, label: '3 days before', sub: 'Lots of time to decide' },
          { val: 2 as const, label: '2 days before', sub: 'A focused heads-up' },
        ]).map((opt) => {
          const active = value === opt.val;
          return (
            <button
              key={opt.val}
              onClick={() => onChange(opt.val)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 18px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                color: 'var(--b-ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="font-display"
                  style={{
                    fontSize: 15,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                  }}
                >
                  {opt.label}
                </span>
                {active && (
                  <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
                    <CheckCircleFullIcon size={18} />
                  </span>
                )}
              </div>
              <p
                className="font-body"
                style={{
                  fontSize: 12,
                  color: active ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
                  margin: '4px 0 0',
                }}
              >
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
    <div style={{ position: 'relative' }}>
      {/* Track */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 28,
          height: 1,
          background: 'var(--b-ink)',
        }}
      />

      {/* Markers */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
        <Marker label="Today" sub="Sign up" />
        <Marker label={`Day ${reminderDay}`} sub="Reminder" highlight />
        <Marker label="Day 7" sub="Trial ends" />
      </div>
    </div>
  );
}

function Marker({
  label,
  sub,
  highlight,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 80 }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 0,
          marginTop: 22,
          marginBottom: 10,
          background: highlight ? 'var(--b-accent)' : 'var(--b-ink)',
          border: highlight ? '1px solid var(--b-accent)' : '1px solid var(--b-ink)',
        }}
      />
      <span
        className="font-display"
        style={{
          fontSize: 12,
          fontStyle: 'italic',
          fontWeight: 500,
          color: 'var(--b-ink)',
        }}
      >
        {label}
      </span>
      <span
        className="font-body"
        style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
      >
        {sub}
      </span>
    </div>
  );
}

// ─── Step 2: Payment UI (looks-only) ─────────────────────────────────────────

function PaymentStep() {
  const [method, setMethod] = useState<'card' | 'apple' | 'google'>('card');
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    marginTop: 6,
    background: 'transparent',
    border: '1px solid var(--b-rule)',
    borderRadius: 0,
    padding: '12px 14px',
    color: 'var(--b-ink)',
    fontSize: 15,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    outline: 'none',
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="text-center mt-2">
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          Free trial
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.05,
            margin: '8px 0 0',
          }}
        >
          7 days <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>free</em>.
          <br />Then $9.99/month.
        </h2>
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--b-ink-60)',
            marginTop: 12,
            maxWidth: 360,
            marginInline: 'auto',
            lineHeight: 1.6,
          }}
        >
          You won&apos;t be charged until your trial ends. Cancel anytime in settings.
        </p>
      </div>

      {/* Method tabs */}
      <div
        style={{
          display: 'inline-flex',
          marginTop: 20,
          border: '1px solid var(--b-ink)',
          background: 'var(--b-paper)',
          width: '100%',
        }}
      >
        {([
          { val: 'card' as const,   label: 'Card' },
          { val: 'apple' as const,  label: 'Apple Pay' },
          { val: 'google' as const, label: 'Google Pay' },
        ]).map((tab, i) => {
          const active = method === tab.val;
          return (
            <button
              key={tab.val}
              onClick={() => setMethod(tab.val)}
              className="font-body"
              style={{
                flex: 1,
                padding: '10px 8px',
                background: active ? 'var(--b-ink)' : 'transparent',
                color: active ? 'var(--b-paper)' : 'var(--b-ink-60)',
                border: 'none',
                borderLeft: i > 0 ? '1px solid var(--b-ink)' : 'none',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Method panel */}
      <div style={{ marginTop: 18, flex: 1 }}>
        {method === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
              >
                Card number
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1234 1234 1234 1234"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  Expiry
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM / YY"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  CVC
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="•••"
                  value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}
        {method === 'apple' && (
          <div
            style={{
              border: '1px solid var(--b-rule)',
              borderTop: '2px solid var(--b-ink)',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                marginBottom: 12,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500 }}
              >
                A
              </span>
            </div>
            <p
              className="font-display"
              style={{
                fontSize: 16,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                margin: 0,
              }}
            >
              Apple Pay
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--b-ink-60)',
                marginTop: 8,
                lineHeight: 1.6,
                maxWidth: 320,
                marginInline: 'auto',
              }}
            >
              You&apos;ll confirm your purchase with Face ID or Touch ID on the next screen.
            </p>
          </div>
        )}
        {method === 'google' && (
          <div
            style={{
              border: '1px solid var(--b-rule)',
              borderTop: '2px solid var(--b-ink)',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                background: 'var(--b-paper)',
                border: '1px solid var(--b-ink)',
                color: 'var(--b-ink)',
                marginBottom: 12,
              }}
            >
              <span
                className="font-display"
                style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}
              >
                G
              </span>
            </div>
            <p
              className="font-display"
              style={{
                fontSize: 16,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                margin: 0,
              }}
            >
              Google Pay
            </p>
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--b-ink-60)',
                marginTop: 8,
                lineHeight: 1.6,
                maxWidth: 320,
                marginInline: 'auto',
              }}
            >
              Continue to confirm your purchase with your Google account.
            </p>
          </div>
        )}
      </div>

      {/* Summary card */}
      <div
        style={{
          marginTop: 20,
          padding: '14px 18px',
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <span className="font-body" style={{ color: 'var(--b-ink-60)' }}>
            Today (free trial)
          </span>
          <span
            className="font-display"
            style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--b-ink)' }}
          >
            $0.00
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            marginTop: 8,
          }}
        >
          <span className="font-body" style={{ color: 'var(--b-ink-60)' }}>
            After 7 days
          </span>
          <span
            className="font-display"
            style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--b-ink)' }}
          >
            $9.99 / month
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--b-rule)', margin: '12px 0' }} />
        <div
          className="font-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--b-ink-60)',
            fontStyle: 'italic',
          }}
        >
          <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}>
            <FireIcon size={14} />
          </span>
          <span>No charge today. Cancel anytime in Settings.</span>
        </div>
      </div>
    </div>
  );
}
