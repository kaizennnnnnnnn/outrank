'use client';

import { useEffect, useState } from 'react';
import { getCollection, where, orderBy, limit } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface HabitProgressGraphProps {
  userId: string;
  habitId: string;
  goal: number;
  unit: string;
  color: string;
}

interface DayData {
  date: string;
  value: number;
  goal: number;
  percent: number;
}

export function HabitProgressGraph({ userId, habitId, goal, unit, color }: HabitProgressGraphProps) {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const logs = await getCollection<HabitLog>(`logs/${userId}/habitLogs`, [
          where('habitId', '==', habitId),
          orderBy('createdAt', 'desc'),
          limit(14),
        ]);

        // Group by date, last 7 days
        const last7: DayData[] = [];
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

          const totalValue = dayLogs.reduce((sum, l) => sum + (l.value || 0), 0);
          last7.push({
            date: dateStr,
            value: totalValue,
            goal,
            percent: goal > 0 ? Math.min((totalValue / goal) * 100, 100) : 0,
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
  }, [userId, habitId, goal]);

  if (loading) return <Skeleton className="h-32 rounded-xl" />;

  const maxVal = Math.max(...data.map((d) => d.value), goal);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-1 h-24">
        {data.map((day, i) => {
          const barHeight = maxVal > 0 ? (day.value / maxVal) * 100 : 0;
          const goalLine = maxVal > 0 ? (day.goal / maxVal) * 100 : 0;
          const metGoal = day.value >= day.goal && day.goal > 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative h-full justify-end">
              {/* Goal line indicator */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-slate-600/40"
                style={{ bottom: `${goalLine}%` }}
              />
              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-500 min-h-[2px] relative"
                style={{
                  height: `${Math.max(barHeight, 2)}%`,
                  background: metGoal
                    ? `linear-gradient(to top, ${color}, ${color}cc)`
                    : `linear-gradient(to top, ${color}60, ${color}30)`,
                  boxShadow: metGoal ? `0 0 8px ${color}40` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Labels */}
      <div className="flex justify-between">
        {data.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <p className="text-[9px] text-slate-600">{day.date}</p>
            <p className={cn(
              'text-[9px] font-mono',
              day.value >= day.goal && day.goal > 0 ? 'text-emerald-400' : 'text-slate-500'
            )}>
              {day.value > 0 ? day.value : '-'}
            </p>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-600">
        <span>Last 7 days</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} /> Goal met
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: `${color}40` }} /> Below goal
          </span>
        </div>
      </div>
    </div>
  );
}
