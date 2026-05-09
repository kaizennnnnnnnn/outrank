'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';

/**
 * Brief down-pointing chevron at the bottom of the viewport that
 * fires whenever a habit log lands in today's recap panel — but
 * ONLY when the panel is currently below the fold. The user just
 * logged something but can't see where it went; the chevron leads
 * their eye toward the off-screen record. Auto-hides; tapping it
 * scrolls the panel into view.
 *
 * Mounted at the (app) layout level so it has the same lifecycle as
 * RecapLogFlight (the splash overlay) and listens to the same
 * panelPulse signal the flight uses to confirm a landing.
 */
const VISIBLE_MS    = 1800;
const STAGE_OUT_MS  = 280;

export function RecapScrollHint() {
  const panelPulse = useUIStore((s) => s.panelPulse);
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');

  useEffect(() => {
    if (!panelPulse) return;

    // Skip the hint if the recap panel isn't on the page (e.g. user
    // logged a habit from a non-dashboard surface where the panel
    // isn't rendered) or is already visible — they can see it land.
    const panel = document.querySelector<HTMLElement>('[data-recap-drop]');
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const visible = r.top < window.innerHeight - 80 && r.bottom > 80;
    if (visible) return;

    setPhase('in');
    const tIn  = window.setTimeout(() => setPhase('out'),  VISIBLE_MS);
    const tOut = window.setTimeout(() => setPhase('idle'), VISIBLE_MS + STAGE_OUT_MS);
    return () => {
      window.clearTimeout(tIn);
      window.clearTimeout(tOut);
    };
  }, [panelPulse]);

  if (phase === 'idle') return null;

  const handleClick = () => {
    const panel = document.querySelector<HTMLElement>('[data-recap-drop]');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setPhase('out');
    window.setTimeout(() => setPhase('idle'), STAGE_OUT_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Jump to today's record"
      style={{
        position: 'fixed',
        bottom: 96,
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 215,
        padding: '8px 14px',
        background: 'var(--b-paper)',
        border: '1px solid var(--b-ink)',
        color: 'var(--b-ink)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        opacity: phase === 'in' ? 1 : 0,
        transition: 'opacity 280ms ease-out',
        animation:
          phase === 'in'
            ? 'recap-scroll-hint-in 280ms ease-out 1 both'
            : undefined,
        pointerEvents: phase === 'in' ? 'auto' : 'none',
        boxShadow:
          '0 2px 0 -1px rgba(0,0,0,0.18),' +
          '0 10px 24px -10px rgba(0,0,0,0.55)',
      }}
    >
      <span
        className="recap-scroll-hint-chevron"
        style={{ color: 'var(--b-accent)' }}
        aria-hidden
      >
        <svg
          width={22}
          height={22}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
          <polyline points="6 4 12 10 18 4" opacity="0.45" />
        </svg>
      </span>
    </button>
  );
}
