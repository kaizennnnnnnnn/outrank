'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection, subscribeToDocument, orderBy, limit } from '@/lib/firestore';
import { readGymStateFromUser, GYM_WORKOUTS_COLLECTION } from '@/lib/gym';
import { UserGymState, Workout } from '@/types/gym';

/**
 * Subscription to the user's gym state — derives from the user doc that
 * useAuth already streams. Returns null while loading or before the
 * user picks a program.
 */
export function useGymState() {
  const { user } = useAuth();
  // The canonical UserProfile type doesn't list `gym` since it's
  // pillar-specific data (same field-fishing pattern used for orb).
  const userAny = user as unknown as Record<string, unknown> | null;
  const state: UserGymState | null = readGymStateFromUser(userAny);
  return { state, loading: !user };
}

/**
 * Subscribe to a single workout doc — used by the active session page.
 */
export function useWorkout(userId: string | null | undefined, workoutId: string | null | undefined) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !workoutId) return;
    const unsub = subscribeToDocument<Workout>(
      `${GYM_WORKOUTS_COLLECTION}/${userId}/items`,
      workoutId,
      (data) => {
        setWorkout(data);
        setLoading(false);
      },
    );
    return unsub;
  }, [userId, workoutId]);

  if (!userId || !workoutId) return { workout: null, loading: false };
  return { workout, loading };
}

/**
 * Recent workouts ordered by start date. Used by the /gym page's
 * history strip.
 */
export function useWorkoutHistory(max = 12) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToCollection<Workout>(
      `${GYM_WORKOUTS_COLLECTION}/${uid}/items`,
      [orderBy('startedAt', 'desc'), limit(max)],
      (items) => {
        setWorkouts(items);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, max]);

  if (!uid) return { workouts: [], loading: false };
  return { workouts, loading };
}
