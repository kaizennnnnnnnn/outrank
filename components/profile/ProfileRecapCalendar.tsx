'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMonthRecaps } from '@/hooks/useMonthRecaps';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  /** Whose calendar — current user (own) or a friend. */
  uid: string;
  /** Owner sees draft cells too; friends are query-restricted to
   *  published only (rule denies drafts on the read either way). */
  isOwner: boolean;
}

/**
 * Month-grid calendar of published recaps. Each filled cell is shaded
 * by the day's totalXP relative to the heaviest day in the month — at
 * a glance you see your "documented streak" of submitted records.
 *
 * Tap any filled cell → `/recap/{uid}/{YYYY-MM-DD}` for the full
 * detail view (story, comments, verifications). Today's cell is
 * outlined whether or not it has a recap yet.
 *
 * Prev / next chevrons walk one month at a time. No far-future cap
 * for v1; far-past is bounded by however many month-clicks the user
 * makes — Firestore queries on the localDate range are cheap.
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

  // Heat-map normalization: peak XP this month = full color; smaller
  // days scale toward the floor.
  const allXP = Object.values(byDate).map((r) => r.totalXP || 0);
  const maxXP = allXP.length > 0 ? Math.max(...allXP, 1) : 1;

  const totalRecaps = Object.keys(byDate).length;
  const totalXP = allXP.reduce((s, x) => s + x, 0);

  return (
    <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
            Records
          </p>
          <span className="text-[10px] font-mono text-slate-500 ml-1">
            · {totalRecaps} this month
            {totalXP > 0 && (
              <span className="ml-1.5">· +{totalXP.toLocaleString()} XP</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NavButton onClick={() => setMonthDate(addMonths(monthDate, -1))} aria-label="Previous month">‹</NavButton>
          <span className="text-[11px] font-bold text-slate-300 min-w-[110px] text-center">
            {monthLabel}
          </span>
          <NavButton onClick={() => setMonthDate(addMonths(monthDate, 1))} aria-label="Next month">›</NavButton>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 px-3 pt-3">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="text-[9px] font-bold uppercase tracking-widest text-slate-600 text-center">
            {d}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 p-3 pt-2">
        {loading
          ? Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-md" />
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
  /** YYYY-MM-DD if the cell belongs to the current month, null otherwise (leading/trailing fill). */
  dateKey: string | null;
  dayNum: number | null;
}

function buildMonthCells(monthDate: Date): MonthCell[] {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  // Mon=0, Sun=6 — match the "M T W T F S S" header
  const firstDayOfWeek = ((first.getDay() + 6) % 7);
  const cells: MonthCell[] = [];

  // Leading blank cells
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ dateKey: null, dayNum: null });
  }
  // Days of the month
  for (let d = 1; d <= last.getDate(); d++) {
    const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateKey, dayNum: d });
  }
  // Trailing blanks to fill the grid (multiple of 7)
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
      className="w-7 h-7 rounded-md bg-[#0c0c16] border border-[#1e1e30] text-slate-400 text-sm hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center"
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
    return <div className="h-9" />;
  }
  const isPublished = recap?.status === 'published';
  const isDraft = recap?.status === 'draft';

  // Heat-map intensity (0..1) based on the day's XP relative to peak.
  // Cap the floor at 0.18 for visibility — even the smallest day still
  // looks like "something happened."
  const intensity = recap && maxXP > 0 ? Math.max(0.18, Math.min(1, (recap.totalXP || 0) / maxXP)) : 0;

  const baseStyle: React.CSSProperties = {};
  if (isPublished) {
    baseStyle.background = `rgba(249,115,22,${intensity * 0.55})`;
    baseStyle.border = `1px solid rgba(249,115,22,${0.4 + intensity * 0.4})`;
    baseStyle.boxShadow = `inset 0 0 8px rgba(249,115,22,${intensity * 0.3})`;
  } else if (isDraft) {
    baseStyle.background = 'rgba(255,255,255,0.02)';
    baseStyle.border = '1px dashed rgba(249,115,22,0.35)';
  } else {
    baseStyle.background = 'rgba(255,255,255,0.02)';
    baseStyle.border = '1px solid rgba(255,255,255,0.04)';
  }
  if (isToday) {
    // Replace the border with a brighter today ring
    baseStyle.border = '1px solid rgba(249,115,22,0.85)';
    baseStyle.boxShadow = isPublished
      ? `inset 0 0 8px rgba(249,115,22,${intensity * 0.3}), 0 0 6px rgba(249,115,22,0.5)`
      : '0 0 6px rgba(249,115,22,0.5)';
  }

  const inner = (
    <motion.div
      whileTap={isPublished ? { scale: 0.94 } : undefined}
      className="h-9 rounded-md flex items-center justify-center text-[11px] font-mono transition-colors"
      style={baseStyle}
    >
      <span className={isPublished ? 'text-white font-bold' : 'text-slate-500'}>
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
