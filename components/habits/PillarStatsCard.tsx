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
 * "Best day" deduplicates by date — if a user logs water 4× in a day
 * we sum to 3.2L rather than counting individual sips as candidates.
 * "Hit rate" is days where the day-sum ≥ habit.goal divided by 30.
 *
 * Mini-chart: last 30 days (oldest → newest left to right). Cell
 * height scales by (day-sum / max-day-sum). Today's cell gets an
 * accent ring.
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
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (daySum.size === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.015] border border-white/[0.04] p-4 text-center">
        <p className="text-[12px] text-slate-500">
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
      className="rounded-2xl border overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${habit.color}10 0%, rgba(11,11,20,0.7) 70%)`,
        borderColor: `${habit.color}33`,
      }}
    >
      <div className="flex items-center gap-2 px-4 pt-4 mb-3">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: habit.color, boxShadow: `0 0 6px ${habit.color}` }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: habit.color }}>
          30-day stats
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2 px-4 mb-4">
        <Tile
          label="7-day avg"
          value={fmt(weeklyAvg)}
          unit={habit.unit}
          color={habit.color}
        />
        <Tile
          label="30-day avg"
          value={fmt(monthlyAvg)}
          unit={habit.unit}
          color={habit.color}
        />
        <Tile
          label="Best day"
          value={fmt(bestDay.value)}
          unit={habit.unit}
          color={habit.color}
          subtitle={bestDay.value > 0 ? bestDay.dateKey : 'no logs yet'}
        />
        <Tile
          label="Goal hit"
          value={`${Math.round(hitRate * 100)}%`}
          unit=""
          color={habit.color}
          subtitle={`${last30Cells.filter((c) => c.value >= habit.goal).length}/30 days`}
        />
      </div>

      {/* Mini bar chart */}
      <div className="px-4 pb-4">
        <div className="flex items-end gap-[2px] h-16">
          {last30Cells.map((cell) => {
            const pct = cell.value > 0 ? Math.max(0.04, cell.value / max30) : 0;
            const goalMet = cell.value >= habit.goal;
            return (
              <div
                key={cell.dateKey}
                className="flex-1 rounded-sm relative"
                title={`${cell.dateKey}: ${fmt(cell.value)}${habit.unit ? habit.unit : ''}${goalMet ? ' · goal met' : ''}`}
                style={{
                  height: `${pct * 100}%`,
                  minHeight: cell.value > 0 ? '3px' : '2px',
                  background: cell.value === 0
                    ? 'rgba(255,255,255,0.04)'
                    : goalMet
                      ? `linear-gradient(to top, ${habit.color}88, ${habit.color})`
                      : `linear-gradient(to top, ${habit.color}55, ${habit.color}99)`,
                  border: cell.isToday
                    ? `1px solid ${habit.color}`
                    : '1px solid transparent',
                  boxShadow: goalMet ? `0 0 4px ${habit.color}66` : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] font-mono text-slate-600">
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
  color,
  subtitle,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl p-3 bg-white/[0.02] border border-white/[0.04]">
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="font-heading text-xl font-bold mt-1" style={{ color }}>
        {value}
        {unit && <span className="text-slate-500 text-xs font-mono ml-1">{unit}</span>}
      </p>
      {subtitle && (
        <p className="text-[9px] font-mono text-slate-600 mt-0.5">{subtitle}</p>
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
