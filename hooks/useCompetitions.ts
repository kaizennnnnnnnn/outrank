'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getCollection, where, orderBy } from '@/lib/firestore';
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

    async function fetch() {
      try {
        const comps = await getCollection<Competition>('competitions', [
          where('status', 'in', ['pending', 'active']),
          orderBy('startDate', 'desc'),
        ]);
        // Filter to competitions the user is part of
        const userComps = comps.filter((c) =>
          c.participants.some((p) => p.userId === user!.uid)
        );
        setCompetitions(userComps);
      } catch {
        setCompetitions([]);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [user?.uid, user]);

  return { competitions, loading };
}
