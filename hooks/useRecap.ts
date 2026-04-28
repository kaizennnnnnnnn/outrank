'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToDocument } from '@/lib/firestore';
import { localDateKey, recapPath, yesterdayKey } from '@/lib/recap';
import { Recap } from '@/types/recap';

/**
 * Realtime subscription to today's draft for the current user. Returns
 * null while loading / before the first log of the day. The dashboard's
 * "Submit Today's Record" button reads `loading + recap` to know whether
 * to render anything.
 */
export function useTodaysDraft() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const dateKey = localDateKey();
    const unsub = subscribeToDocument<Recap>(
      `recaps/${uid}/items`,
      dateKey,
      (data) => {
        setRecap(data);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  if (!uid) return { recap: null, loading: false };
  return { recap, loading };
}

/**
 * Yesterday's draft (or published) — used by the retro-publish banner.
 * If yesterday's recap exists and is still a draft, the dashboard offers
 * a one-tap publish-yesterday's-record button.
 */
export function useYesterdaysRecap() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const dateKey = yesterdayKey();
    const unsub = subscribeToDocument<Recap>(
      `recaps/${uid}/items`,
      dateKey,
      (data) => {
        setRecap(data);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  if (!uid) return { recap: null, loading: false };
  return { recap, loading };
}

/**
 * Subscribe to any user's recap by (uid, date). Used by the recap detail
 * page when a friend opens your published day. Reads use the same path
 * the owner writes to — security rule gates access.
 */
export function useRecap(uid: string | null | undefined, dateKey: string | null | undefined) {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !dateKey) return;
    const unsub = subscribeToDocument<Recap>(
      `recaps/${uid}/items`,
      dateKey,
      (data) => {
        setRecap(data);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, dateKey]);

  if (!uid || !dateKey) return { recap: null, loading: false };
  return { recap, loading };
}

// Re-export path helper so components can build links without importing
// from two places
export { recapPath };
