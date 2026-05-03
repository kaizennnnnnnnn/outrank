'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
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
  { key: 'tiktok',    label: 'TikTok',    logo: <span className="text-base font-bold">TT</span> },
  { key: 'instagram', label: 'Instagram', logo: <span className="text-base font-bold">IG</span> },
  { key: 'youtube',   label: 'YouTube',   logo: <span className="text-base font-bold">YT</span> },
  { key: 'reddit',    label: 'Reddit',    logo: <span className="text-base font-bold">RD</span> },
  { key: 'friend',    label: 'A friend',  logo: <SparklesIcon size={20} className="text-orange-300" /> },
  { key: 'app_store', label: 'App store', logo: <span className="text-base font-bold">★</span> },
  { key: 'other',     label: 'Other',     logo: <span className="text-base font-bold">…</span> },
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
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center">
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
      className={cn(
        'w-full py-4 rounded-full font-bold text-base text-white transition-all shadow-lg',
        canProceed
          ? 'shadow-red-600/30 hover:brightness-110'
          : 'shadow-none opacity-40 cursor-not-allowed',
      )}
      style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
    >
      {step === 6 ? "LET'S CONTINUE" : 'CONTINUE'}
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
    <div className="inline-flex p-1 rounded-full bg-[#10101a] border border-white/8">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-5 py-1.5 rounded-full text-sm font-bold transition-all',
              active
                ? 'bg-orange-500 text-white shadow-[0_0_18px_-4px_rgba(249,115,22,0.7)]'
                : 'text-slate-400 hover:text-slate-200',
            )}
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
      <div className="grid grid-cols-2 gap-2.5 mt-2">
        {HEAR_OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              className={cn(
                'rounded-2xl border-2 px-3 py-3.5 transition-all flex items-center gap-3',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_24px_-8px_rgba(249,115,22,0.5)]'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  active
                    ? 'bg-orange-500/20 text-orange-200'
                    : 'bg-white/[0.04] text-slate-300',
                )}
              >
                {opt.logo}
              </div>
              <span className={cn('font-semibold text-[14px]', active ? 'text-white' : 'text-slate-200')}>
                {opt.label}
              </span>
              {active && <CheckCircleFullIcon size={16} className="ml-auto text-orange-400" />}
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
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        Alright, let&apos;s get some<br/><span className="text-orange-400">basic info</span> down.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
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
      <p className="text-[12px] text-slate-500 mt-1 mb-4">Used for accurate calorie + training math.</p>
      <div className="grid grid-cols-2 gap-3 mt-2">
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
              className={cn(
                'aspect-[3/4] rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3',
                active
                  ? 'bg-orange-500/10 border-orange-400 shadow-[0_0_24px_-8px_rgba(249,115,22,0.5)] text-orange-200'
                  : 'bg-[#10101a] border-white/8 hover:border-white/20 text-slate-300',
              )}
            >
              <div className={cn(active ? 'text-orange-300' : 'text-slate-400')}>{opt.icon}</div>
              <span className={cn('font-bold text-base', active ? 'text-white' : 'text-slate-200')}>
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

      <div className="mt-10 mx-auto max-w-sm rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
        <p className="text-[13px] font-bold text-white">Your information is private.</p>
        <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed">
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

      <p className="text-[12px] text-slate-500 mt-10 text-center max-w-sm mx-auto">
        We use age to set realistic training stress and recovery targets.
      </p>
    </div>
  );
}

function JourneyAboutYouStep({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center text-center flex-1 justify-center">
      <PhoenixMascot size={160} greeting />
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-8 leading-tight">
        This journey is<br/><span className="text-orange-400">all about you</span>.
      </h2>
      <p className="text-slate-300/85 mt-4 max-w-sm text-base leading-relaxed">
        Let&apos;s make sure you&apos;re truly part of it,{' '}
        <span className="text-orange-400 font-semibold">{name}</span>.
      </p>
    </div>
  );
}
