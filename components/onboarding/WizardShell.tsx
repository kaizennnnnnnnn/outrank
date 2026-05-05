'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onSkip?: () => void;
  showProgress?: boolean;
  showBack?: boolean;
  showSkip?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Shared frame for every onboarding step beyond the welcome carousel.
 * Editorial Direction B v2: paper background, ink type, hairline rule
 * progress bar with the brand red as the fill, mono-spaced step counter.
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
  const stepLabel = `${String(step + 1).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}`;

  return (
    <div
      className={cn('dir-b min-h-screen flex flex-col relative', className)}
      style={{
        background: 'var(--b-paper)',
        color: 'var(--b-ink)',
      }}
    >
      {/* Header — back arrow + hairline progress + skip */}
      <header
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '20px 22px 14px',
          borderBottom: '1px solid var(--b-rule)',
        }}
      >
        {showBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--b-ink-60)',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 32, height: 32, flexShrink: 0 }} />
        )}

        {showProgress && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="font-mono tabular"
              style={{
                fontSize: 9,
                color: 'var(--b-ink-60)',
                letterSpacing: '0.14em',
                flexShrink: 0,
              }}
            >
              {stepLabel}
            </div>
            <div
              style={{
                flex: 1,
                height: 2,
                background: 'var(--b-rule)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--b-accent)',
                  transition: 'width 350ms ease-out',
                }}
              />
            </div>
          </div>
        )}

        {showSkip ? (
          <button
            onClick={onSkip}
            className="font-body"
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--b-ink-60)',
              padding: '4px 8px',
              flexShrink: 0,
            }}
          >
            Skip
          </button>
        ) : (
          <div style={{ width: 36, flexShrink: 0 }} />
        )}
      </header>

      {/* Content */}
      <main
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 22px 8px',
        }}
      >
        {children}
      </main>

      {/* Footer CTA */}
      {footer && (
        <footer
          style={{
            position: 'relative',
            padding: '12px 22px 24px',
            maxWidth: 480,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}
