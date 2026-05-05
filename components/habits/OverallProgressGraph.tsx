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

/**
 * Flowing section, no container. The dashboard owns surrounding spacing
 * and the section eyebrow lives here so the chart's own data drives the
 * total-XP value beside it.
 *
 * Editorial Direction B v2: spread eyebrow, italic display total-XP,
 * flat accent bars (no gradient, no glow). The graph stroke uses the
 * editorial accent red.
 */
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

  if (loading) return <Skeleton className="h-40" />;

  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const totalXP = data.reduce((sum, d) => sum + d.xp, 0);
  const totalLogs = data.reduce((sum, d) => sum + d.logs, 0);
  const bestIdx = data.reduce((best, d, i) => d.xp > data[best].xp ? i : best, 0);
  const todayIdx = data.length - 1;

  return (
    <section>
      {/* Unified section eyebrow — same shape as Today's Habits below */}
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <p
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
          >
            Weekly Overview
          </p>
          <p
            className="font-display tabular"
            style={{
              fontSize: 32,
              fontStyle: 'italic',
              fontWeight: 600,
              marginTop: 2,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--b-accent)',
            }}
          >
            {totalXP.toLocaleString()}
            <span
              className="font-body"
              style={{
                fontSize: 13,
                color: 'var(--b-ink-40)',
                marginLeft: 6,
                fontStyle: 'normal',
                fontWeight: 500,
                letterSpacing: '0.05em',
              }}
            >
              XP
            </span>
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            className="spread"
            style={{ fontSize: 8, color: 'var(--b-ink-40)' }}
          >
            Logs
          </p>
          <p
            className="font-display tabular"
            style={{
              fontSize: 18,
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'var(--b-ink)',
              marginTop: 2,
            }}
          >
            {totalLogs}
          </p>
        </div>
      </div>

      {/* Bar chart — flat accent fill, hairline outline on today */}
      <div className="flex items-end justify-between gap-1.5 h-24 px-1">
        {data.map((day, i) => {
          const barHeight = maxXP > 0 ? (day.xp / maxXP) * 100 : 0;
          const isBest = i === bestIdx && day.xp > 0;
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full transition-all duration-700 min-h-[3px] relative"
                style={{
                  height: `${Math.max(barHeight, 3)}%`,
                  background: day.xp > 0
                    ? isBest
                      ? 'var(--b-accent)'
                      : 'var(--b-ink)'
                    : 'var(--b-rule)',
                  border: isToday ? '1px solid var(--b-accent)' : 'none',
                }}
              >
                {isBest && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      background: 'var(--b-accent)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.map((day, i) => (
          <div key={i} className="flex-1 text-center">
            <p
              className={cn('spread')}
              style={{
                fontSize: 9,
                color: i === todayIdx ? 'var(--b-accent)' : 'var(--b-ink-40)',
              }}
            >
              {day.date}
            </p>
            <p
              className="font-body tabular"
              style={{
                fontSize: 9,
                marginTop: 2,
                color: day.xp > 0 ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
              }}
            >
              {day.xp > 0 ? `+${day.xp}` : '—'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
