'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCollection, orderBy, limit } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface DayXP {
  date: string;
  xp: number;
  logs: number;
}

export function OverallProgressGraph() {
  const { user } = useAuth();
  const [data, setData] = useState<DayXP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetch() {
      try {
        const logs = await getCollection<HabitLog>(`logs/${user!.uid}/habitLogs`, [
          orderBy('createdAt', 'desc'),
          limit(100),
        ]);

        // Group by last 7 days
        const last7: DayXP[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          d.setHours(0, 0, 0, 0);
          const dateStr = d.toLocaleDateString('en', { weekday: 'short' });

          const dayLogs = logs.filter((l) => {
            if (!l.createdAt?.toDate) return false;
            const logDate = l.createdAt.toDate();
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === d.getTime();
          });

          last7.push({
            date: dateStr,
            xp: dayLogs.reduce((sum, l) => sum + (l.xpEarned || 0), 0),
            logs: dayLogs.length,
          });
        }

        setData(last7);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [user]);

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;

  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const totalXP = data.reduce((sum, d) => sum + d.xp, 0);
  const totalLogs = data.reduce((sum, d) => sum + d.logs, 0);
  const bestIdx = data.reduce((best, d, i) => d.xp > data[best].xp ? i : best, 0);
  const todayIdx = data.length - 1;

  return (
    // Border + heavy box-shadow dropped on purpose — when stacked on a
    // page next to other sections, that frame made the dashboard feel
    // like a deck of identical cards. The internal content (gradient
    // wash + bar chart) carries the section's identity already.
    <div
      className="relative overflow-hidden rounded-2xl p-5"
      style={{
        background:
          'radial-gradient(ellipse 90% 60% at 100% 0%, rgba(249,115,22,0.10), transparent 55%),' +
          'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(220,38,38,0.06), transparent 60%),' +
          'linear-gradient(165deg, rgba(16,16,26,0.55) 0%, rgba(11,11,20,0.45) 100%)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400/90">
            Weekly Overview
          </p>
          <p className="font-heading text-2xl font-bold text-white mt-0.5">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              {totalXP.toLocaleString()}
            </span>
            <span className="text-slate-500 text-sm font-mono ml-1">XP</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Logs</p>
          <p className="font-heading text-lg font-bold text-white">{totalLogs}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1.5 h-24">
        {data.map((day, i) => {
          const barHeight = maxXP > 0 ? (day.xp / maxXP) * 100 : 0;
          const isBest = i === bestIdx && day.xp > 0;
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full rounded-t-md transition-all duration-700 min-h-[3px] relative"
                style={{
                  height: `${Math.max(barHeight, 3)}%`,
                  background: day.xp > 0
                    ? isBest
                      ? 'linear-gradient(to top, #dc2626, #f97316, #fbbf24)'
                      : 'linear-gradient(to top, #991b1b, #dc2626, #f97316)'
                    : '#13131f',
                  boxShadow: day.xp > 0
                    ? isBest
                      ? '0 0 14px rgba(249,115,22,0.7), inset 0 1px 0 rgba(255,255,255,0.25)'
                      : '0 0 8px rgba(220,38,38,0.4)'
                    : 'none',
                  border: isToday ? '1px solid rgba(249,115,22,0.5)' : 'none',
                }}
              >
                {isBest && (
                  <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-300 animate-frame-pulse"
                    style={{ boxShadow: '0 0 6px #fde047' }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2">
        {data.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <p className={cn(
              'text-[10px] font-bold uppercase tracking-wider',
              i === todayIdx ? 'text-orange-400' : 'text-slate-600'
            )}>{day.date}</p>
            <p className={cn(
              'text-[9px] font-mono mt-0.5',
              day.xp > 0 ? 'text-slate-400' : 'text-slate-700'
            )}>
              {day.xp > 0 ? `+${day.xp}` : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
