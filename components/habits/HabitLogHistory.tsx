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

/**
 * Editorial log history list. Each row is a hairline-divided clipping —
 * value + time on the left, XP earned on the right in accent ink.
 * No dark surface, no orange highlight.
 */
export function HabitLogHistory({ userId, habitId }: HabitLogHistoryProps) {
  const { data: logs, loading } = useCollection<HabitLog>(
    `logs/${userId}/habitLogs`,
    [where('habitId', '==', habitId), orderBy('createdAt', 'desc'), limit(20)],
    true
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p
        className="font-body"
        style={{
          fontSize: 12,
          color: 'var(--b-ink-60)',
          textAlign: 'center',
          padding: '16px 0',
          fontStyle: 'italic',
        }}
      >
        No logs yet
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {logs.map((log) => (
        <li
          key={log.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 4px',
            borderBottom: '1px solid var(--b-rule)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                className="font-display tabular"
                style={{
                  fontSize: 15,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  color: 'var(--b-ink)',
                }}
              >
                {log.value}
              </span>
              <span
                className="font-body"
                style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
              >
                {log.createdAt?.toDate ? formatRelativeTime(log.createdAt.toDate()) : ''}
              </span>
            </div>
            {log.note && (
              <p
                className="font-body"
                style={{
                  fontSize: 11,
                  color: 'var(--b-ink-60)',
                  marginTop: 2,
                  fontStyle: 'italic',
                }}
              >
                {log.note}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {log.proofImageUrl && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--b-ink-40)' }}
              >
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
            <span
              className="font-body tabular"
              style={{
                fontSize: 11,
                color: 'var(--b-accent)',
                fontWeight: 600,
              }}
            >
              +{log.xpEarned} XP
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
