'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
  userId: string;
}

function getWeeks(): Date[][] {
  const weeks: Date[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Go back 52 weeks
  const start = new Date(today);
  start.setDate(start.getDate() - 52 * 7 - start.getDay());

  let current = new Date(start);
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

export function ActivityHeatmap({ userId }: ActivityHeatmapProps) {
  const [logCounts, setLogCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFound, setTotalFound] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const colRef = collection(db, `logs/${userId}/habitLogs`);
    const q = query(colRef);

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const counts: Record<string, number> = {};
        let parsed = 0;

        for (const d of snapshot.docs) {
          const data = d.data();
          const ts = data.createdAt || data.loggedAt;
          if (!ts) continue;

          let date: Date;
          if (typeof ts.toDate === 'function') {
            date = ts.toDate();
          } else if (typeof ts.seconds === 'number') {
            date = new Date(ts.seconds * 1000);
          } else if (ts instanceof Date) {
            date = ts;
          } else {
            continue;
          }

          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          counts[key] = (counts[key] || 0) + 1;
          parsed++;
        }

        setLogCounts(counts);
        setTotalFound(parsed);
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
        <p className="text-xs text-red-400">Could not load activity data</p>
        <p className="text-[10px] text-slate-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-[3px] min-w-fit">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const count = logCounts[key] || 0;
              return (
                <div
                  key={di}
                  className={cn(
                    'w-[11px] h-[11px] rounded-[2px] transition-colors',
                    loading ? 'bg-[#18182a] animate-pulse' : getIntensity(count)
                  )}
                  title={`${day.toLocaleDateString()}: ${count} logs`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-600">
        <span>Less</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-[#18182a]" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-900/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-700/70" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-600/80" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-500" />
        <span>More</span>
        {!loading && totalFound === 0 && (
          <span className="ml-2 text-slate-500">— Log habits to see activity</span>
        )}
      </div>
    </div>
  );
}
