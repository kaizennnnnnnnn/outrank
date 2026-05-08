'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMonthRecaps } from '@/hooks/useMonthRecaps';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  uid: string;
  isOwner: boolean;
}

/**
 * Compact recap calendar for the profile page. The full-page version
 * lives at /history (linked from the header strip below for owners).
 */
export function ProfileRecapCalendar({ uid, isOwner }: Props) {
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const { byDate, loading } = useMonthRecaps(uid, monthDate, isOwner);

  const cells = buildMonthCells(monthDate);
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = todayLocalKey();

  const allXP = Object.values(byDate).map((r) => r.totalXP || 0);
  const maxXP = allXP.length > 0 ? Math.max(...allXP, 1) : 1;

  const totalRecaps = Object.keys(byDate).length;
  const totalXP = allXP.reduce((s, x) => s + x, 0);

  return (
    <div style={{ border: '1px solid var(--b-rule)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--b-rule)',
        }}
      >
        <div>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
            Records
          </div>
          <div
            className="font-body tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
          >
            {totalRecaps} this month
            {totalXP > 0 && <span> · +{totalXP.toLocaleString()} XP</span>}
            {isOwner && (
              <>
                {' · '}
                <Link
                  href="/history"
                  className="font-body"
                  style={{
                    color: 'var(--b-accent)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  view archive →
                </Link>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <NavButton onClick={() => setMonthDate(addMonths(monthDate, -1))} aria-label="Previous month">‹</NavButton>
          <span
            className="font-display"
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              fontWeight: 500,
              minWidth: 110,
              textAlign: 'center',
            }}
          >
            {monthLabel}
          </span>
          <NavButton onClick={() => setMonthDate(addMonths(monthDate, 1))} aria-label="Next month">›</NavButton>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '10px 12px 4px' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span
            key={i}
            className="font-mono"
            style={{
              fontSize: 8,
              color: 'var(--b-ink-40)',
              textAlign: 'center',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, padding: '4px 12px 12px' }}>
        {loading
          ? Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))
          : cells.map((cell, i) => (
              <DayCell
                key={i}
                cell={cell}
                recap={cell.dateKey ? byDate[cell.dateKey] : undefined}
                maxXP={maxXP}
                isToday={cell.dateKey === todayKey}
                uid={uid}
              />
            ))}
      </div>
    </div>
  );
}

interface MonthCell {
  dateKey: string | null;
  dayNum: number | null;
}

function buildMonthCells(monthDate: Date): MonthCell[] {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const firstDayOfWeek = ((first.getDay() + 6) % 7);
  const cells: MonthCell[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ dateKey: null, dayNum: null });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateKey, dayNum: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, dayNum: null });
  }
  return cells;
}

function todayLocalKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + delta);
  next.setDate(1);
  return next;
}

function NavButton({
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        color: 'var(--b-ink-60)',
        fontSize: 14,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function DayCell({
  cell,
  recap,
  maxXP,
  isToday,
  uid,
}: {
  cell: MonthCell;
  recap: import('@/types/recap').Recap | undefined;
  maxXP: number;
  isToday: boolean;
  uid: string;
}) {
  if (!cell.dayNum || !cell.dateKey) {
    return <div style={{ height: 30 }} />;
  }
  const isPublished = recap?.status === 'published';
  const isDraft = recap?.status === 'draft';

  const intensity = recap && maxXP > 0 ? Math.max(0.2, Math.min(1, (recap.totalXP || 0) / maxXP)) : 0;

  const baseStyle: React.CSSProperties = {
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  if (isPublished) {
    baseStyle.background = `rgba(249,115,22,${intensity * 0.5})`;
    baseStyle.border = `1px solid rgba(249,115,22,${0.4 + intensity * 0.4})`;
  } else if (isDraft) {
    baseStyle.background = 'transparent';
    baseStyle.border = '1px dashed var(--b-accent)';
  } else {
    baseStyle.background = 'transparent';
    baseStyle.border = '1px solid var(--b-rule)';
  }
  if (isToday) {
    baseStyle.border = '1px solid var(--b-accent)';
    baseStyle.borderWidth = '2px';
  }

  const inner = (
    <motion.div
      whileTap={isPublished ? { scale: 0.94 } : undefined}
      style={baseStyle}
    >
      <span
        className={isPublished ? 'font-mono tabular' : 'font-mono tabular'}
        style={{
          fontSize: 11,
          color: isPublished ? 'var(--b-ink)' : 'var(--b-ink-40)',
          fontWeight: isPublished ? 600 : 400,
        }}
      >
        {cell.dayNum}
      </span>
    </motion.div>
  );

  if (isPublished) {
    return (
      <Link href={`/recap/${uid}/${cell.dateKey}`} aria-label={`Open record for ${cell.dateKey}`}>
        {inner}
      </Link>
    );
  }
  return inner;
}
