'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WizardShellProps {
  /** 0-indexed current step. Used for progress bar fill. */
  step: number;
  /** Total steps in this phase. Used for progress bar. */
  totalSteps: number;
  onBack?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  children: ReactNode;
  /** Optional CTA pinned at the bottom. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared frame for every onboarding step beyond the welcome carousel.
 * Renders a progress bar, optional back/skip controls, content area, and
 * an optional pinned-bottom CTA. Each Phase 2+ step renders inside this
 * shell so the chrome stays consistent across ~30+ pages.
 */
export function WizardShell({
  step,
  totalSteps,
  onBack,
  onSkip,
  showProgress = true,
  showBack = true,
  showSkip = false,
  children,
  footer,
  className,
}: WizardShellProps) {
  const progress = Math.min(((step + 1) / totalSteps) * 100, 100);

  return (
    <div className={cn('min-h-screen bg-[#0d0d15] flex flex-col relative overflow-hidden', className)}>
      {/* Aurora background — quieter than the welcome carousel since the
          mascot is the visual lead now. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 -right-40 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.40), transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.40), transparent 65%)' }}
        />
      </div>

      {/* Header — back arrow + progress bar + skip */}
      <header className="relative flex items-center gap-3 px-5 pt-5 pb-3">
        {showBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-10 h-10 flex-shrink-0" />
        )}

        {showProgress && (
          <div className="flex-1 h-1.5 bg-[#18182a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #dc2626, #f97316)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        )}

        {showSkip ? (
          <button
            onClick={onSkip}
            className="text-xs font-semibold text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors uppercase tracking-wider flex-shrink-0"
          >
            Skip
          </button>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
      </header>

      {/* Content */}
      <main className="relative flex-1 flex flex-col px-6 py-2">
        {children}
      </main>

      {/* Footer CTA */}
      {footer && (
        <footer className="relative px-6 pb-8 pt-2 max-w-md w-full mx-auto">
          {footer}
        </footer>
      )}
    </div>
  );
}
