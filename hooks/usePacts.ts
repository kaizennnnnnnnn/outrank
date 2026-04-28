'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection, where, orderBy } from '@/lib/firestore';
import { Pact } from '@/types/pact';
import { PACTS_COLLECTION } from '@/lib/pacts';

/**
 * Subscribe to every pact the current user is a participant in.
 * Returns four buckets so the /pacts page can render each section
 * without re-iterating: incoming invites, outgoing invites (pending),
 * active pacts, and resolved (succeeded / broken / declined) history.
 */
export function useUserPacts() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [pacts, setPacts] = useState<Pact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToCollection<Pact>(
      PACTS_COLLECTION,
      [where('participants', 'array-contains', uid), orderBy('createdAt', 'desc')],
      (items) => {
        setPacts(items);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  if (!uid) {
    return {
      pacts: [],
      incoming: [],
      outgoing: [],
      active: [],
      resolved: [],
      loading: false,
    };
  }

  const incoming = pacts.filter((p) => p.status === 'pending' && p.initiatorId !== uid);
  const outgoing = pacts.filter((p) => p.status === 'pending' && p.initiatorId === uid);
  const active = pacts.filter((p) => p.status === 'active');
  const resolved = pacts.filter((p) =>
    p.status === 'succeeded' || p.status === 'broken' || p.status === 'declined',
  );

  return { pacts, incoming, outgoing, active, resolved, loading };
}
