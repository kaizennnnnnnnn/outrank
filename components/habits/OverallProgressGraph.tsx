'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCollection, orderBy, limit } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';
import { Skeleton } from '@/components/ui/Skeleton';

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

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">Weekly Overview</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-orange-400">{totalXP} XP</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">{totalLogs} logs</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1.5 h-20">
        {data.map((day, i) => {
          const barHeight = maxXP > 0 ? (day.xp / maxXP) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full rounded-t transition-all duration-500 min-h-[2px]"
                style={{
                  height: `${Math.max(barHeight, 2)}%`,
                  background: day.xp > 0
                    ? 'linear-gradient(to top, #dc2626, #ef4444)'
                    : '#18182a',
                  boxShadow: day.xp > 0 ? '0 0 6px rgba(220,38,38,0.3)' : 'none',
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
            <p className="text-[9px] font-mono text-slate-500">
              {day.xp > 0 ? `+${day.xp}` : '-'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
