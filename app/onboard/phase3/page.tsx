'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingDraft } from '@/hooks/useOnboardingDraft';
import { defaultUnits } from '@/lib/onboardingDraft';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';
import { SpeechBubble } from '@/components/onboarding/SpeechBubble';
import { ScrollPicker } from '@/components/onboarding/ScrollPicker';
import { HearAboutKey, Sex } from '@/types/onboarding';
import { CheckCircleFullIcon, SparklesIcon } from '@/components/ui/AppIcons';

/**
 * Phase 3 — Demographics block.
 *
 * Seven steps in order:
 *   0. How heard about us
 *   1. "Alright, let's get some basic info" — interlude
 *   2. Sex selector
 *   3. Height (scroll picker, cm/ft+in toggle)
 *   4. Weight (scroll picker, kg/lbs toggle)
 *   5. Age (scroll picker)
 *   6. "This journey is all about you" — mascot interlude
 *
 * Hand-off goes to /onboard/phase4 (placeholder until Phase 4 builds).
 */

const TOTAL_STEPS = 7;

const HEAR_OPTIONS: { key: HearAboutKey; label: string; logo: React.ReactNode }[] = [
  { key: 'tiktok',    label: 'TikTok',    logo: <span style={{ fontSize: 14, fontWeight: 700 }}>TT</span> },
  { key: 'instagram', label: 'Instagram', logo: <span style={{ fontSize: 14, fontWeight: 700 }}>IG</span> },
  { key: 'youtube',   label: 'YouTube',   logo: <span style={{ fontSize: 14, fontWeight: 700 }}>YT</span> },
  { key: 'reddit',    label: 'Reddit',    logo: <span style={{ fontSize: 14, fontWeight: 700 }}>RD</span> },
  { key: 'friend',    label: 'A friend',  logo: <span style={{ color: 'var(--b-accent)', display: 'inline-flex' }}><SparklesIcon size={18} /></span> },
  { key: 'app_store', label: 'App store', logo: <span style={{ fontSize: 14, fontWeight: 700 }}>★</span> },
  { key: 'other',     label: 'Other',     logo: <span style={{ fontSize: 14, fontWeight: 700 }}>…</span> },
];

export default function OnboardPhase3Page() {
  const router = useRouter();
  const { draft, update, hydrated } = useOnboardingDraft();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else router.push('/onboard/phase4');
  };
  const back = () => {
    if (step > 0) setStep((s) => s - 1);
    else router.push('/onboard');
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
            <HearAboutStep
              value={draft.hearAbout}
              onChange={(hearAbout) => update({ hearAbout })}
            />
          )}
          {step === 1 && <BasicInfoIntroStep />}
          {step === 2 && (
            <SexStep
              value={draft.sex}
              onChange={(sex) => update({ sex })}
            />
          )}
          {step === 3 && (
            <HeightStep
              draft={draft}
              update={update}
            />
          )}
          {step === 4 && (
            <WeightStep
              draft={draft}
              update={update}
            />
          )}
          {step === 5 && (
            <AgeStep
              value={draft.age}
              onChange={(age) => update({ age })}
            />
          )}
          {step === 6 && (
            <JourneyAboutYouStep name={draft.name || 'friend'} />
          )}
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
    (step === 0 && !!draft.hearAbout) ||
    (step === 1) ||
    (step === 2 && !!draft.sex) ||
    (step === 3 && !!draft.height && draft.height.value > 0) ||
    (step === 4 && !!draft.weight && draft.weight.value > 0) ||
    (step === 5 && typeof draft.age === 'number' && draft.age > 0) ||
    (step === 6);

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
      {step === 6 ? "Let's continue" : 'Continue'} →
    </motion.button>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function MascotRow({ message }: { message: React.ReactNode }) {
  return (
    <div className="flex items-end gap-3 mt-4 mb-6">
      <div className="flex-shrink-0">
        <PhoenixMascot size={90} react={1} />
      </div>
      <SpeechBubble className="flex-1 mb-2">{message}</SpeechBubble>
    </div>
  );
}

function UnitToggle<U extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: U; label: string }[];
  value: U;
  onChange: (v: U) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--b-ink)',
        background: 'var(--b-paper)',
      }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="font-body"
            style={{
              padding: '8px 22px',
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
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function HearAboutStep({
  value,
  onChange,
}: {
  value?: HearAboutKey;
  onChange: (v: HearAboutKey) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Last quick question — how did you hear about us?" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginTop: 8,
        }}
      >
        {HEAR_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 12px',
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--b-ink)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--b-rule)',
                  color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
                }}
              >
                {opt.logo}
              </div>
              <span
                className="font-display"
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                }}
              >
                {opt.label}
              </span>
              {active && (
                <span style={{ color: 'var(--b-accent)', display: 'inline-flex', marginLeft: 'auto' }}>
                  <CheckCircleFullIcon size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BasicInfoIntroStep() {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={150} />
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 28 }}
      >
        Quick intake
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
        Alright, let&apos;s get some{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>basic info</em> down.
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
        Body stats stay private. We use them only to dial in your training and habit targets.
      </p>
    </div>
  );
}

function SexStep({
  value,
  onChange,
}: {
  value?: Sex;
  onChange: (v: Sex) => void;
}) {
  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="Which option fits you best?" />
      <p
        className="font-body"
        style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4, marginBottom: 16, fontStyle: 'italic' }}
      >
        Used for accurate calorie + training math.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginTop: 8,
        }}
      >
        {([
          {
            key: 'male' as const,
            label: 'Male',
            icon: (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="14" r="5" />
                <path d="M19 5l-5.5 5.5" />
                <path d="M14 5h5v5" />
              </svg>
            ),
          },
          {
            key: 'female' as const,
            label: 'Female',
            icon: (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="9" r="5" />
                <path d="M12 14v8" />
                <path d="M9 19h6" />
              </svg>
            ),
          },
        ]).map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                aspectRatio: '3 / 4',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                background: 'transparent',
                border: active ? '1px solid var(--b-accent)' : '1px solid var(--b-rule)',
                borderLeft: active ? '3px solid var(--b-accent)' : '3px solid transparent',
                cursor: 'pointer',
                color: active ? 'var(--b-accent)' : 'var(--b-ink-60)',
              }}
            >
              {opt.icon}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeightStep({
  draft,
  update,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  update: ReturnType<typeof useOnboardingDraft>['update'];
}) {
  const defaults = defaultUnits();
  const unit: 'cm' | 'in' = draft.height?.unit || defaults.height;
  // Default to 170 cm or 67 in (~5'7") if not set
  const value = draft.height?.value ?? (unit === 'cm' ? 170 : 67);

  const setUnit = (newUnit: 'cm' | 'in') => {
    if (newUnit === unit) return;
    // Convert: cm <-> inches (1 in ≈ 2.54 cm)
    const newValue =
      newUnit === 'cm'
        ? Math.round(value * 2.54)
        : Math.round(value / 2.54);
    update({ height: { value: newValue, unit: newUnit } });
  };

  const formatHeight = (v: number) => {
    if (unit === 'cm') return String(v);
    const ft = Math.floor(v / 12);
    const inch = v % 12;
    return `${ft}'${inch}`;
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="What's your height?" />

      <div className="flex justify-center mt-6">
        <UnitToggle
          options={[
            { value: 'cm', label: 'cm' },
            { value: 'in', label: 'ft / in' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>

      <div className="mt-12">
        <ScrollPicker
          value={value}
          onChange={(v) => update({ height: { value: v, unit } })}
          min={unit === 'cm' ? 120 : 48}
          max={unit === 'cm' ? 220 : 86}
          step={1}
          formatValue={formatHeight}
          unit={unit === 'cm' ? 'cm' : ''}
          majorEvery={5}
        />
      </div>
    </div>
  );
}

function WeightStep({
  draft,
  update,
}: {
  draft: ReturnType<typeof useOnboardingDraft>['draft'];
  update: ReturnType<typeof useOnboardingDraft>['update'];
}) {
  const defaults = defaultUnits();
  const unit: 'kg' | 'lbs' = draft.weight?.unit || defaults.weight;
  const value = draft.weight?.value ?? (unit === 'kg' ? 70 : 154);

  const setUnit = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === unit) return;
    // 1 kg ≈ 2.2046 lbs
    const newValue =
      newUnit === 'kg'
        ? Math.round(value / 2.2046)
        : Math.round(value * 2.2046);
    update({ weight: { value: newValue, unit: newUnit } });
  };

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="What's your current weight?" />

      <div className="flex justify-center mt-6">
        <UnitToggle
          options={[
            { value: 'kg', label: 'kg' },
            { value: 'lbs', label: 'lbs' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>

      <div className="mt-12">
        <ScrollPicker
          value={value}
          onChange={(v) => update({ weight: { value: v, unit } })}
          min={unit === 'kg' ? 35 : 80}
          max={unit === 'kg' ? 180 : 400}
          step={1}
          unit={unit}
          majorEvery={5}
        />
      </div>

      <div
        style={{
          marginTop: 36,
          marginInline: 'auto',
          maxWidth: 360,
          width: '100%',
          padding: '14px 18px',
          border: '1px solid var(--b-rule)',
          borderTop: '2px solid var(--b-ink)',
          textAlign: 'center',
        }}
      >
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
        >
          Private
        </div>
        <p
          className="font-display"
          style={{
            fontSize: 14,
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--b-ink)',
            margin: 0,
          }}
        >
          Your information is private.
        </p>
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          Bodyweight is essential for accurate training and recovery targets.
        </p>
      </div>
    </div>
  );
}

function AgeStep({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  const current = value ?? 25;

  return (
    <div className="flex flex-col flex-1">
      <MascotRow message="How old are you?" />

      <div className="mt-16">
        <ScrollPicker
          value={current}
          onChange={onChange}
          min={13}
          max={100}
          step={1}
          unit="yrs"
          majorEvery={5}
        />
      </div>

      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-60)',
          marginTop: 40,
          textAlign: 'center',
          maxWidth: 360,
          marginInline: 'auto',
          fontStyle: 'italic',
        }}
      >
        We use age to set realistic training stress and recovery targets.
      </p>
    </div>
  );
}

function JourneyAboutYouStep({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={160} greeting />
      <div
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-accent)', marginTop: 28 }}
      >
        For you
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
        This journey is{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>all about you</em>.
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
        Let&apos;s make sure you&apos;re truly part of it,{' '}
        <em style={{ color: 'var(--b-accent)', fontWeight: 600, fontStyle: 'italic' }}>{name}</em>.
      </p>
    </div>
  );
}
