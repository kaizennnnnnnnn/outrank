'use client';

import { useEffect, useState } from 'react';
import { subscribeToCollection, orderBy, limit } from '@/lib/firestore';
import { LeaderboardEntry, LeaderboardPeriod } from '@/types/leaderboard';

export function useLeaderboard(categorySlug: string, period: LeaderboardPeriod = 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug) return;

    const unsub = subscribeToCollection<LeaderboardEntry>(
      `leaderboards/${categorySlug}/${period}`,
      [orderBy('score', 'desc'), limit(100)],
      (items) => {
        setEntries(items);
        setLoading(false);
      }
    );

    return unsub;
  }, [categorySlug, period]);

  return { entries, loading };
}
