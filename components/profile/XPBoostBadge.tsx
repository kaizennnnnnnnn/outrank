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
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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

  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full ${px} bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-orange-400/40 shadow-[0_0_16px_-4px_rgba(251,146,60,0.6)]`}
      title={`2x XP boost active — ${formatRemaining(remaining)} left`}
    >
      <svg width={size === 'sm' ? 10 : 12} height={size === 'sm' ? 10 : 12} viewBox="0 0 24 24" fill="currentColor" className="text-orange-300 animate-pulse">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <span className={`font-mono font-bold text-orange-300 ${text}`}>2×</span>
      <span className={`text-orange-400/80 ${text}`}>{formatRemaining(remaining)}</span>
    </div>
  );
}

export function isXPBoostActive(activatedAt: XPBoostBadgeProps['activatedAt']): boolean {
  const start = toDate(activatedAt);
  if (!start) return false;
  return Date.now() - start.getTime() < DURATION_MS;
}
