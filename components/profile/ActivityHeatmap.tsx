'use client';

import { useEffect, useState } from 'react';
import { getCollection, where, orderBy } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';
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

  useEffect(() => {
    async function fetch() {
      try {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const logs = await getCollection<HabitLog>(`logs/${userId}/habitLogs`, []);

        const counts: Record<string, number> = {};
        for (const log of logs) {
          // Try both createdAt and loggedAt
          const ts = (log as unknown as Record<string, unknown>).createdAt || (log as unknown as Record<string, unknown>).loggedAt;
          if (!ts || typeof (ts as { toDate?: () => Date }).toDate !== 'function') continue;
          const date = (ts as { toDate: () => Date }).toDate();
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          counts[key] = (counts[key] || 0) + 1;
        }
        setLogCounts(counts);
      } catch (err) {
        console.error('Heatmap load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [userId]);

  const weeks = getWeeks();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
      </div>
    </div>
  );
}
