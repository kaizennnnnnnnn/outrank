'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection, orderBy } from '@/lib/firestore';
import { UserHabit } from '@/types/habit';

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<UserHabit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToCollection<UserHabit>(
      `habits/${user.uid}/userHabits`,
      [orderBy('createdAt', 'desc')],
      (items) => {
        setHabits(items);
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  return { habits, loading };
}
