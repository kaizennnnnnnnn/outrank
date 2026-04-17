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

function getIntensity(count: number): string {
  if (count === 0) return 'bg-[#18182a]';
  if (count === 1) return 'bg-red-900/60';
  if (count <= 3) return 'bg-red-700/70';
  if (count <= 5) return 'bg-red-600/80';
  return 'bg-red-500';
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

  // Diagnostic line — always visible while we debug missing data
  const diagnostic = loading
    ? 'Loading…'
    : totalDocs === 0
    ? 'No logs found'
    : parsedDocs === 0
    ? `Found ${totalDocs} logs but none have a valid timestamp`
    : `${parsedDocs} log${parsedDocs === 1 ? '' : 's'}${latestKey ? ` • latest ${latestKey}` : ''}`;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-[3px] min-w-fit">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const key = dateKey(day);
              const count = logCounts[key] || 0;
              return (
                <div
                  key={di}
                  className={cn(
                    'w-[11px] h-[11px] rounded-[2px] transition-colors',
                    loading ? 'bg-[#18182a] animate-pulse' : getIntensity(count)
                  )}
                  title={`${key}: ${count} log${count === 1 ? '' : 's'}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600 flex-wrap">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#18182a]" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-900/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-700/70" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-600/80" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-500" />
        <span>More</span>
        <span className="ml-2 text-slate-500">{diagnostic}</span>
      </div>
    </div>
  );
}
