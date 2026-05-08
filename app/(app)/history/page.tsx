'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useMonthRecaps } from '@/hooks/useMonthRecaps';
import { Masthead } from '@/components/editorial/Masthead';
import { Skeleton } from '@/components/ui/Skeleton';
import { Recap } from '@/types/recap';

/**
 * History — full-page calendar of every day's recap. Mirrors the
 * compact version on /profile but gets the full editorial treatment:
 * larger cells, heatmap intensity by day XP, month navigation, and a
 * stats strip summarising the visible month. Selecting a day opens
 * the per-day recap detail page (`/recap/{uid}/{date}`); the recap
 * page already handles the "no record on this day" empty state.
 *
 * Why a dedicated page rather than a modal: scroll affordance + URL
 * sharing (`/history?month=2026-04`) + the user can deep-link any
 * given month. Modals also fight the Masthead's editorial frame.
 */
export default function HistoryPage() {
  const { user } = useAuth();
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const { byDate, loading } = useMonthRecaps(user?.uid ?? null, monthDate, true);

  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = todayLocalKey();
  const isCurrentMonth =
    monthDate.getFullYear() === new Date().getFullYear() &&
    monthDate.getMonth() === new Date().getMonth();

  // Stats — total recaps + total XP + longest streak inside the
  // visible month + busiest single day (max XP).
  const stats = useMemo(() => computeMonthStats(byDate, monthDate), [byDate, monthDate]);

  if (!user) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Archive" />

        <div style={{ padding: '0 22px' }}>
          {/* Eyebrow + headline */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            History · every day on record
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>The Archive</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 380, lineHeight: 1.5 }}
          >
            Every day you logged is here. Tap any cell to read its record — heatmap intensity tracks XP earned that day.
          </p>

          {/* Month navigation strip */}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NavButton onClick={() => setMonthDate(addMonths(monthDate, -1))} aria-label="Previous month">‹</NavButton>
              <NavButton onClick={() => setMonthDate(addMonths(monthDate, 1))} aria-label="Next month">›</NavButton>
              {!isCurrentMonth && (
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(1);
                    setMonthDate(d);
                  }}
                  className="font-body"
                  style={{
                    height: 28,
                    padding: '0 10px',
                    background: 'transparent',
                    border: '1px solid var(--b-accent)',
                    color: 'var(--b-accent)',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Today
                </button>
              )}
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 22,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
              }}
            >
              {monthLabel}
            </div>
          </div>

          {/* Stats strip — four ratio readouts under the nav */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              padding: '14px 0',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <Stat label="Days" value={String(stats.totalDays).padStart(2, '0')} />
            <Stat label="XP earned" value={`+${stats.totalXP.toLocaleString()}`} />
            <Stat label="Streak" value={`${stats.longestStreak}d`} accent={stats.longestStreak >= 7} />
            <Stat
              label="Best day"
              value={stats.bestDay ? `+${stats.bestDay.totalXP}` : '—'}
              hint={stats.bestDay ? formatDayShort(stats.bestDay.localDate) : undefined}
            />
          </div>

          {/* Weekday header (Mon → Sun) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              padding: '14px 0 6px',
            }}
          >
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span
                key={i}
                className="font-mono"
                style={{
                  fontSize: 9,
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

          {/* Calendar grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              paddingBottom: 14,
            }}
          >
            {loading
              ? Array.from({ length: 42 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))
              : cells.map((cell, i) => (
                  <DayCell
                    key={i}
                    cell={cell}
                    recap={cell.dateKey ? byDate[cell.dateKey] : undefined}
                    maxXP={stats.maxXP}
                    isToday={cell.dateKey === todayKey}
                    uid={user.uid}
                  />
                ))}
          </div>

          {/* Legend — explains what the cell colors mean */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              padding: '12px 0',
              borderTop: '1px solid var(--b-rule)',
              borderBottom: '1px solid var(--b-rule)',
              fontSize: 10,
              color: 'var(--b-ink-60)',
            }}
          >
            <LegendChip swatchStyle={{ background: 'rgba(220,38,38,0.55)', border: '1px solid rgba(220,38,38,0.8)' }} label="Heavy day (high XP)" />
            <LegendChip swatchStyle={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(220,38,38,0.45)' }} label="Logged" />
            <LegendChip swatchStyle={{ background: 'transparent', border: '1px dashed var(--b-accent)' }} label="Draft" />
            <LegendChip swatchStyle={{ background: 'transparent', border: '1px solid var(--b-rule)' }} label="No record" />
          </div>

          {/* Quick jump links — last 3 months for fast navigation */}
          <div style={{ marginTop: 16 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
              Quick jump
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const target = addMonths(new Date(), -i);
                target.setDate(1);
                const label = target.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const isActive =
                  target.getMonth() === monthDate.getMonth() &&
                  target.getFullYear() === monthDate.getFullYear();
                return (
                  <button
                    key={i}
                    onClick={() => setMonthDate(target)}
                    className="font-mono tabular"
                    style={{
                      padding: '5px 10px',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      border: `1px solid ${isActive ? 'var(--b-accent)' : 'var(--b-rule)'}`,
                      color: isActive ? 'var(--b-accent)' : 'var(--b-ink-60)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cells / helpers ─────────────────────────────────────────────────

interface MonthCell {
  dateKey: string | null;
  dayNum:  number | null;
  inMonth: boolean;
}

function buildMonthCells(monthDate: Date): MonthCell[] {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  const firstDayOfWeek = ((first.getDay() + 6) % 7); // 0 = Mon

  const cells: MonthCell[] = [];

  // Pre-padding from the previous month so the first row is full.
  // Greying out is handled by `inMonth: false`; we still show the
  // numeric day so the user can orient themselves.
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const prev = new Date(y, m, -i);
    cells.push({
      dateKey: fmtDateKey(prev),
      dayNum:  prev.getDate(),
      inMonth: false,
    });
  }

  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({
      dateKey: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      dayNum:  d,
      inMonth: true,
    });
  }

  // Pad to a 6-row grid (42 cells) so the calendar height stays
  // stable as the user paginates.
  while (cells.length < 42) {
    const offset = cells.length - (firstDayOfWeek + last.getDate()) + 1;
    const next = new Date(y, m + 1, offset);
    cells.push({
      dateKey: fmtDateKey(next),
      dayNum:  next.getDate(),
      inMonth: false,
    });
  }
  return cells;
}

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayLocalKey(): string {
  return fmtDateKey(new Date());
}

function addMonths(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + delta);
  next.setDate(1);
  return next;
}

function formatDayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        width: 30,
        height: 30,
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        color: 'var(--b-ink-60)',
        fontSize: 16,
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

// ─── Day cell ────────────────────────────────────────────────────────

function DayCell({
  cell, recap, maxXP, isToday, uid,
}: {
  cell:    MonthCell;
  recap:   Recap | undefined;
  maxXP:   number;
  isToday: boolean;
  uid:     string;
}) {
  if (!cell.dayNum || !cell.dateKey) {
    return <div style={{ height: 64 }} />;
  }
  const isPublished = recap?.status === 'published';
  const isDraft     = recap?.status === 'draft';
  const xp          = recap?.totalXP || 0;
  const intensity   = recap && maxXP > 0 ? Math.max(0.18, Math.min(1, xp / maxXP)) : 0;

  // Cell visual state. Heatmap fill uses --b-accent so the calendar
  // sits in the editorial palette instead of orange. Muted opacity for
  // out-of-month days so they read as context, not content.
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    height: 64,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '6px 7px',
    cursor: 'pointer',
    transition: 'transform 120ms ease, border-color 120ms ease',
  };

  if (isPublished) {
    baseStyle.background = `rgba(220, 38, 38, ${intensity * 0.55})`;
    baseStyle.border = `1px solid rgba(220, 38, 38, ${0.4 + intensity * 0.5})`;
    baseStyle.color  = intensity > 0.55 ? '#ffffff' : 'var(--b-ink)';
  } else if (isDraft) {
    baseStyle.background = 'transparent';
    baseStyle.border = '1px dashed var(--b-accent)';
    baseStyle.color  = 'var(--b-ink)';
  } else {
    baseStyle.background = 'transparent';
    baseStyle.border = '1px solid var(--b-rule)';
    baseStyle.color  = 'var(--b-ink-60)';
  }

  if (isToday) {
    baseStyle.borderWidth = '2px';
    baseStyle.borderColor = 'var(--b-accent)';
  }
  if (!cell.inMonth) {
    baseStyle.opacity = 0.4;
  }

  const inner = (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} style={baseStyle}>
      <span
        className="font-mono tabular"
        style={{
          fontSize: 12,
          fontWeight: isPublished ? 700 : isToday ? 700 : 500,
          letterSpacing: '0.04em',
        }}
      >
        {cell.dayNum}
      </span>
      {/* Bottom-row metric — XP on published days, dot on drafts */}
      {isPublished && xp > 0 && (
        <span
          className="font-mono tabular"
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.04em',
            opacity: 0.85,
          }}
        >
          +{xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp}
        </span>
      )}
      {isDraft && (
        <span
          className="spread"
          style={{
            fontSize: 7,
            color: 'var(--b-accent)',
            letterSpacing: '0.18em',
          }}
        >
          Draft
        </span>
      )}
    </motion.div>
  );

  // Every cell is clickable — the recap detail page handles the
  // "no record on this day" case gracefully, so the user can dig
  // into any day they like.
  return (
    <Link
      href={`/recap/${uid}/${cell.dateKey}`}
      aria-label={`Open record for ${cell.dateKey}`}
      style={{ textDecoration: 'none' }}
    >
      {inner}
    </Link>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────

function Stat({
  label, value, hint, accent,
}: {
  label:  string;
  value:  string;
  hint?:  string;
  accent?: boolean;
}) {
  return (
    <div style={{ borderRight: '1px solid var(--b-rule)', padding: '0 10px', textAlign: 'center' }}>
      <div
        className="spread"
        style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
      >
        {label}
      </div>
      <div
        className="font-display tabular"
        style={{
          fontSize: 18,
          fontStyle: 'italic',
          fontWeight: 500,
          lineHeight: 1.1,
          marginTop: 2,
          color: accent ? 'var(--b-accent)' : 'var(--b-ink)',
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="font-mono tabular"
          style={{ fontSize: 8, color: 'var(--b-ink-40)', marginTop: 1 }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function LegendChip({
  swatchStyle, label,
}: {
  swatchStyle: React.CSSProperties;
  label:       string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 14, height: 14, ...swatchStyle }} />
      <span>{label}</span>
    </div>
  );
}

// ─── Stat math ───────────────────────────────────────────────────────

function computeMonthStats(byDate: Record<string, Recap>, monthDate: Date) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const last = new Date(y, m + 1, 0).getDate();

  const inMonthRecaps: Recap[] = [];
  for (let d = 1; d <= last; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const r = byDate[k];
    if (r) inMonthRecaps.push(r);
  }

  const totalDays = inMonthRecaps.length;
  const totalXP   = inMonthRecaps.reduce((s, r) => s + (r.totalXP || 0), 0);
  const maxXP     = inMonthRecaps.reduce((s, r) => Math.max(s, r.totalXP || 0), 1);

  // Streak inside the visible month — longest run of CONSECUTIVE
  // days with any recap (draft or published).
  let longestStreak = 0;
  let current = 0;
  for (let d = 1; d <= last; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (byDate[k]) {
      current += 1;
      if (current > longestStreak) longestStreak = current;
    } else {
      current = 0;
    }
  }

  const bestDay = inMonthRecaps.reduce<Recap | null>(
    (best, r) => (best == null || (r.totalXP || 0) > (best.totalXP || 0)) ? r : best,
    null,
  );

  return { totalDays, totalXP, maxXP, longestStreak, bestDay };
}
