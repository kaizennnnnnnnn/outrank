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
            {log.proofImageUrl && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>}
            <span className="text-xs font-mono text-orange-400">+{log.xpEarned} XP</span>
          </div>
        </div>
      ))}
    </div>
  );
}
