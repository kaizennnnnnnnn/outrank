'use client';

import { useEffect, useState } from 'react';
import { subscribeToCollection, orderBy, limit } from '@/lib/firestore';
import { LeaderboardEntry, LeaderboardPeriod } from '@/types/leaderboard';

export function useLeaderboard(categorySlug: string, period: LeaderboardPeriod = 'weekly') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bail out cleanly for the sentinel used when Global view is active
    if (!categorySlug || categorySlug === '__none__') {
      setEntries([]);
      setLoading(false);
      return;
    }

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
