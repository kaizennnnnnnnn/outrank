'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getCollection, where } from '@/lib/firestore';
import { Competition } from '@/types/competition';

export function useCompetitions() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCompetitions([]);
      setLoading(false);
      return;
    }

    async function fetchComps() {
      try {
        // Fetch pending, active, and completed separately to avoid composite indexes.
        // Completed duels may still need to be claimed, so we include them.
        const [pending, active, completed] = await Promise.all([
          getCollection<Competition>('competitions', [
            where('status', '==', 'pending'),
          ]),
          getCollection<Competition>('competitions', [
            where('status', '==', 'active'),
          ]),
          getCollection<Competition>('competitions', [
            where('status', '==', 'completed'),
          ]),
        ]);

        const all = [...pending, ...active, ...completed];

        // Filter to competitions the user is part of
        const userComps = all.filter((c) =>
          c.participants.some((p) => p.userId === user!.uid)
        );

        // Sort by most recent first
        userComps.sort((a, b) => {
          const aTime = a.startDate?.toDate?.()?.getTime?.() || 0;
          const bTime = b.startDate?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

        setCompetitions(userComps);
      } catch (err) {
        console.error('Failed to fetch competitions:', err);
        setCompetitions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchComps();
  }, [user?.uid, user]);

  return { competitions, loading };
}
