'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserHabit } from '@/types/habit';

interface Props {
  habit: UserHabit;
}

/**
 * Per-pillar deep stats: weekly average, monthly average, best day,
 * goal hit-rate, plus a 30-day mini-bar-chart. Pillar-aware unit
 * display (liters / hours / steps / sessions / etc. — pulled from
 * habit.unit). Renders nothing while loading; the parent already shows
 * skeleton placeholders for header/stats above it.
 *
 * Editorial Direction B v2: paper background, hairline border with a
 * 2px ink top-rule for emphasis. Eyebrow uses .spread, stat numbers
 * are font-display tabular italic. Bar chart fills with the pillar's
 * category color (water blue / sleep indigo / etc.) — no glow.
 *
 * "Best day" deduplicates by date — if a user logs water 4× in a day
 * we sum to 3.2L rather than counting individual sips as candidates.
 * "Hit rate" is days where the day-sum ≥ habit.goal divided by 30.
 */
export function PillarStatsCard({ habit }: Props) {
  const { user } = useAuth();
  const { logs, loading } = useHabitLogs(user?.uid, habit.categorySlug, 200);

  // All math derives from the day-sum map (key = YYYY-MM-DD, val = sum
  // of `value` for logs that day). useMemo keeps this stable across
  // re-renders that don't actually shift the log set.
  const daySum = useMemo(() => {
    const m = new Map<string, number>();
    for (const log of logs) {
      const date = log.createdAt?.toDate?.();
      if (!date) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      m.set(key, (m.get(key) || 0) + (log.value || 0));
    }
    return m;
  }, [logs]);

  // Snapshot today's-ms once at mount so the 30-day window doesn't
  // shift mid-render. Called BEFORE any early return so the hook
  // ordering stays stable across renders (rules-of-hooks).
  const last30Cells = useMemoIzedWindow(daySum);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (daySum.size === 0) {
    return (
      <div
        style={{
          background: 'var(--b-paper)',
          border: '1px solid var(--b-rule)',
          padding: 16,
          textAlign: 'center',
        }}
      >
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-ink-60)', fontStyle: 'italic' }}
        >
          Log this pillar a few times — stats unlock once there&rsquo;s data to chart.
        </p>
      </div>
    );
  }

  const last7 = last30Cells.slice(-7);
  const last30Values = last30Cells.map((c) => c.value);
  const max30 = Math.max(...last30Values, 1);

  const sum = (arr: number[]) => arr.reduce((s, x) => s + x, 0);
  const weeklyAvg = sum(last7.map((c) => c.value)) / 7;
  const monthlyAvg = sum(last30Values) / 30;

  const bestDay = last30Cells.reduce(
    (best, c) => (c.value > best.value ? c : best),
    last30Cells[0],
  );

  const hitRate = last30Cells.filter((c) => c.value >= habit.goal).length / 30;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-rule)',
        borderTop: '2px solid var(--b-ink)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '16px 16px 12px',
        }}
      >
        <p
          className="spread"
          style={{ fontSize: 9, color: habit.color }}
        >
          30-day stats
        </p>
      </div>

      {/* Stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          padding: '0 16px',
          marginBottom: 16,
        }}
      >
        <Tile
          label="7-day avg"
          value={fmt(weeklyAvg)}
          unit={habit.unit}
        />
        <Tile
          label="30-day avg"
          value={fmt(monthlyAvg)}
          unit={habit.unit}
        />
        <Tile
          label="Best day"
          value={fmt(bestDay.value)}
          unit={habit.unit}
          subtitle={bestDay.value > 0 ? bestDay.dateKey : 'no logs yet'}
        />
        <Tile
          label="Goal hit"
          value={`${Math.round(hitRate * 100)}%`}
          unit=""
          subtitle={`${last30Cells.filter((c) => c.value >= habit.goal).length}/30 days`}
        />
      </div>

      {/* Mini bar chart */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="flex items-end gap-[2px] h-16">
          {last30Cells.map((cell) => {
            const pct = cell.value > 0 ? Math.max(0.04, cell.value / max30) : 0;
            const goalMet = cell.value >= habit.goal;
            return (
              <div
                key={cell.dateKey}
                className="flex-1 relative"
                title={`${cell.dateKey}: ${fmt(cell.value)}${habit.unit ? habit.unit : ''}${goalMet ? ' · goal met' : ''}`}
                style={{
                  height: `${pct * 100}%`,
                  minHeight: cell.value > 0 ? '3px' : '2px',
                  background: cell.value === 0
                    ? 'var(--b-rule)'
                    : goalMet
                      ? habit.color
                      : 'var(--b-ink)',
                  border: cell.isToday
                    ? `1px solid ${habit.color}`
                    : '1px solid transparent',
                  opacity: goalMet ? 1 : (cell.value === 0 ? 1 : 0.6),
                }}
              />
            );
          })}
        </div>
        <div
          className="font-body tabular"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 9,
            color: 'var(--b-ink-40)',
          }}
        >
          <span>30d ago</span>
          <span>today</span>
        </div>
      </div>
    </motion.div>
  );
}

function Tile({
  label,
  value,
  unit,
  subtitle,
}: {
  label: string;
  value: string;
  unit: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        padding: 12,
        background: 'transparent',
        border: '1px solid var(--b-rule)',
      }}
    >
      <p
        className="spread"
        style={{ fontSize: 9, color: 'var(--b-ink-40)' }}
      >
        {label}
      </p>
      <p
        className="font-display tabular"
        style={{
          fontSize: 22,
          fontStyle: 'italic',
          fontWeight: 600,
          marginTop: 4,
          color: 'var(--b-ink)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--b-ink-40)',
              marginLeft: 4,
              fontStyle: 'normal',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            {unit}
          </span>
        )}
      </p>
      {subtitle && (
        <p
          className="font-body tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 2 }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Format a numeric value: integer if it's already integer, else 1 decimal. */
function fmt(n: number): string {
  if (n === Math.floor(n)) return n.toLocaleString();
  return n.toFixed(1);
}

interface DayCell {
  dateKey: string;
  value: number;
  isToday: boolean;
  isPast: boolean;
}

/**
 * Build the trailing-30-day window. Today's ms is captured once via
 * a state initializer so Date.now() isn't called in the render body
 * (React 19 purity rule). The window doesn't shift mid-session; a
 * page navigation re-mounts and refreshes it.
 */
function useMemoIzedWindow(daySum: Map<string, number>): DayCell[] {
  const [todayMs] = useState(() => Date.now());
  return useMemo(() => {
    const cells: DayCell[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayMs - i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      cells.push({
        dateKey: key,
        value: daySum.get(key) || 0,
        isToday: i === 0,
        isPast: true,
      });
    }
    return cells;
  }, [daySum, todayMs]);
}
