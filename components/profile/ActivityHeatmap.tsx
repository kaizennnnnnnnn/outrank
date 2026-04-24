'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  userId: string;
}

function dateKey(d: Date): string {
  // Zero-padded so sort order matches calendar order and keys never collide
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeeks(): Date[][] {
  const weeks: Date[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 - start.getDay());

  const current = new Date(start);
  let week: Date[] = [];
  while (current <= today) {
    week.push(new Date(current));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);
  return weeks;
}

// Inline RGB so count=1 is genuinely visible. Earlier we used #7c2d12 for
// the first step which was still too close to the #14141f background on
// high-contrast displays — single-log days basically disappeared. Lifted
// the whole ramp so each step is clearly distinct from the next *and*
// from the baseline.
function cellColor(count: number): string {
  if (count === 0) return '#18182a';     // slightly lifted from pure-dark so the grid is visible
  if (count === 1) return '#b91c1c';     // red-700 — unmistakably active at a glance
  if (count === 2) return '#dc2626';     // red-600
  if (count <= 4) return '#ef4444';      // red-500
  if (count <= 6) return '#f97316';      // orange-500
  return '#fb923c';                       // orange-400 — peak
}

// Try every reasonable shape a Firestore timestamp might arrive in.
function toJSDate(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const anyTs = ts as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof anyTs.toDate === 'function') {
    try { return anyTs.toDate(); } catch { /* fallthrough */ }
  }
  if (typeof anyTs.seconds === 'number') return new Date(anyTs.seconds * 1000);
  if (typeof anyTs._seconds === 'number') return new Date(anyTs._seconds * 1000);
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'string') {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function ActivityHeatmap({ userId }: ActivityHeatmapProps) {
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDocs, setTotalDocs] = useState(0);
  const [parsedDocs, setParsedDocs] = useState(0);
  const [latestKey, setLatestKey] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, `logs/${userId}/habitLogs`));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        let parsed = 0;
        let latest: Date | null = null;

        for (const d of snapshot.docs) {
          const data = d.data();
          const date = toJSDate(data.createdAt) || toJSDate(data.loggedAt);
          if (!date) continue;
          const key = dateKey(date);
          counts[key] = (counts[key] || 0) + 1;
          parsed++;
          if (!latest || date > latest) latest = date;
        }

        setLogCounts(counts);
        setTotalDocs(snapshot.docs.length);
        setParsedDocs(parsed);
        setLatestKey(latest ? dateKey(latest) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Heatmap subscription error:', err);
        setError(err.code || err.message || 'Failed to load activity');
        setLoading(false);
      }
    );

    return unsub;
  }, [userId]);

  const weeks = getWeeks();

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-red-400">Could not load activity</p>
        <p className="text-[10px] text-slate-600 mt-1">{error}</p>
      </div>
    );
  }

  const todayKey = dateKey(new Date());
  const hasNoLogs = !loading && totalDocs === 0;
  const brokenTimestamps = !loading && totalDocs > 0 && parsedDocs === 0;

  // Clear, actionable empty state — the earlier "No logs found" one-liner
  // was tiny and easy to miss, and the grid of flat dark squares read as
  // a rendering bug, not "you haven't logged anything yet."
  if (hasNoLogs) {
    return (
      <div className="rounded-xl border border-[#1e1e30] bg-[#0b0b14] p-5 text-center">
        <p className="text-sm font-semibold text-slate-300">Nothing to show yet</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
          Log a habit from the Home tab and cells will start lighting up here — one per day, brighter the more you log.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-[3px] min-w-fit">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const key = dateKey(day);
              const count = logCounts[key] || 0;
              const isToday = key === todayKey;
              return (
                <div
                  key={di}
                  className={cn(
                    'w-[14px] h-[14px] rounded-[2px] transition-colors',
                    loading && 'animate-pulse',
                    isToday && !loading && count === 0 && 'ring-1 ring-orange-500/60',
                  )}
                  style={{
                    background: loading ? '#18182a' : cellColor(count),
                    boxShadow: count >= 3 ? `0 0 5px ${cellColor(count)}aa` : undefined,
                  }}
                  title={`${key}: ${count} log${count === 1 ? '' : 's'}${isToday ? ' (today)' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 flex-wrap">
        <span>Less</span>
        <div className="w-[14px] h-[14px] rounded-[2px]" style={{ background: cellColor(0) }} />
        <div className="w-[14px] h-[14px] rounded-[2px]" style={{ background: cellColor(1) }} />
        <div className="w-[14px] h-[14px] rounded-[2px]" style={{ background: cellColor(3) }} />
        <div className="w-[14px] h-[14px] rounded-[2px]" style={{ background: cellColor(5) }} />
        <div className="w-[14px] h-[14px] rounded-[2px]" style={{ background: cellColor(7) }} />
        <span>More</span>
        {!loading && !brokenTimestamps && (
          <span className="ml-auto text-slate-500">
            {parsedDocs} log{parsedDocs === 1 ? '' : 's'}{latestKey ? ` · last ${latestKey}` : ''}
          </span>
        )}
        {brokenTimestamps && (
          <span className="ml-auto text-amber-500">
            {totalDocs} log{totalDocs === 1 ? '' : 's'} found but missing timestamps
          </span>
        )}
      </div>
    </div>
  );
}
