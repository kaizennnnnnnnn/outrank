'use client';

import { useCollection } from '@/hooks/useFirestore';
import { orderBy, limit, where } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/utils';

interface HabitLogHistoryProps {
  userId: string;
  habitId: string;
}

export function HabitLogHistory({ userId, habitId }: HabitLogHistoryProps) {
  const { data: logs, loading } = useCollection<HabitLog>(
    `logs/${userId}/habitLogs`,
    [where('habitId', '==', habitId), orderBy('createdAt', 'desc'), limit(20)],
    true
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-slate-600 text-center py-4">No logs yet</p>;
  }

  return (
    <div className="space-y-1.5">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#10101a] border border-[#1e1e30]"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white">{log.value}</span>
              <span className="text-xs text-slate-500">
                {log.createdAt?.toDate ? formatRelativeTime(log.createdAt.toDate()) : ''}
              </span>
            </div>
            {log.note && <p className="text-xs text-slate-500 mt-0.5">{log.note}</p>}
          </div>
          <div className="flex items-center gap-2">
            {log.proofImageUrl && <span className="text-xs text-slate-500">📷</span>}
            <span className="text-xs font-mono text-cyan-400">+{log.xpEarned} XP</span>
          </div>
        </div>
      ))}
    </div>
  );
}
