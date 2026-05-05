'use client';

import { useEffect, useState } from 'react';

interface XPBoostBadgeProps {
  activatedAt: { toDate?: () => Date; seconds?: number } | Date | null | undefined;
  size?: 'sm' | 'md';
}

const DURATION_MS = 24 * 60 * 60 * 1000;

function toDate(v: XPBoostBadgeProps['activatedAt']): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  if (typeof (v as { seconds?: number }).seconds === 'number') return new Date(((v as { seconds: number }).seconds) * 1000);
  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0M';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

/**
 * Editorial Direction B v2 chip — small accent-bordered tag with a
 * tabular mono timer. No gradient, no glow.
 */
export function XPBoostBadge({ activatedAt, size = 'md' }: XPBoostBadgeProps) {
  const start = toDate(activatedAt);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!start) return null;
  const endMs = start.getTime() + DURATION_MS;
  const remaining = endMs - now;
  if (remaining <= 0) return null;

  const fontSize = size === 'sm' ? 9 : 10;
  const padY = size === 'sm' ? 2 : 3;
  const padX = size === 'sm' ? 6 : 8;

  return (
    <span
      title={`2× XP boost active — ${formatRemaining(remaining)} left`}
      className="spread"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: `${padY}px ${padX}px`,
        border: '1px solid var(--b-accent)',
        color: 'var(--b-accent)',
        fontSize,
        background: 'transparent',
      }}
    >
      <span className="font-display" style={{ fontStyle: 'italic', fontWeight: 500, letterSpacing: 0 }}>
        2×
      </span>
      <span className="font-mono tabular" style={{ letterSpacing: '0.04em' }}>
        {formatRemaining(remaining)}
      </span>
    </span>
  );
}

export function isXPBoostActive(activatedAt: XPBoostBadgeProps['activatedAt']): boolean {
  const start = toDate(activatedAt);
  if (!start) return false;
  return Date.now() - start.getTime() < DURATION_MS;
}
