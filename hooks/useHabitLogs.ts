'use client';

import { useEffect, useState } from 'react';
import { getCollection, where, orderBy, limit } from '@/lib/firestore';
import { HabitLog } from '@/types/habit';

/**
 * Fetch the most recent N habit logs for a single habit, ordered
 * desc by createdAt. Used by the per-pillar stats block to compute
 * weekly average / monthly average / hit rate / 30-day mini-chart.
 *
 * Uses the existing habitLogs(habitId, createdAt) composite index.
 * No realtime — stats refresh on remount or when the user navigates
 * back from a fresh log.
 */
export function useHabitLogs(uid: string | null | undefined, habitSlug: string | null | undefined, max = 100) {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !habitSlug) return;
    let cancelled = false;

    async function fetch() {
      if (!cancelled) setLoading(true);
      try {
        const result = await getCollection<HabitLog>(`logs/${uid}/habitLogs`, [
          where('habitId', '==', habitSlug),
          orderBy('createdAt', 'desc'),
          limit(max),
        ]);
        if (cancelled) return;
        setLogs(result);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('useHabitLogs fetch failed:', err);
          setLogs([]);
          setLoading(false);
        }
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, [uid, habitSlug, max]);

  if (!uid || !habitSlug) return { logs: [], loading: false };
  return { logs, loading };
}
