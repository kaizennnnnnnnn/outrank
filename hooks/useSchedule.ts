'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection } from '@/lib/firestore';
import { ScheduleEntry } from '@/types/schedule';

export function useSchedule() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToCollection<ScheduleEntry>(
      `scheduleEntries/${user.uid}/items`,
      [],
      (items) => {
        setEntries(items);
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  return { entries, loading };
}
