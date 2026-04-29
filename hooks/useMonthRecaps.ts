'use client';

import { useEffect, useState } from 'react';
import { getCollection, where, orderBy } from '@/lib/firestore';
import { Recap } from '@/types/recap';

/**
 * Fetch all recaps for a given user and calendar month. Returned as a
 * map keyed by `YYYY-MM-DD` so the calendar grid can read each date
 * cell in O(1).
 *
 * Friends only see published recaps — drafts are denied by the
 * Firestore rule, which would fail the entire query if any draft
 * landed in the date range. Forcing `status == 'published'` in the
 * query is the safe path. Owners see both.
 *
 * One-shot fetch on (uid, month, isOwner) change. No realtime — the
 * calendar is informational; freshness within the current session is
 * the user's own publish action triggering a re-render of the parent
 * profile page.
 */
export function useMonthRecaps(
  uid: string | null | undefined,
  monthDate: Date,
  isOwner: boolean,
) {
  const [byDate, setByDate] = useState<Record<string, Recap>>({});
  const [loading, setLoading] = useState(true);
  const monthKey = monthKeyOf(monthDate);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const { startKey, endKey } = monthRange(monthDate);

    async function fetch() {
      // setLoading inside the async path so it's a microtask, not a
      // synchronous setState in the effect body (React 19 purity rule).
      if (!cancelled) setLoading(true);
      try {
        const constraints = [
          where('localDate', '>=', startKey),
          where('localDate', '<=', endKey),
          orderBy('localDate', 'asc'),
        ];
        if (!isOwner) {
          // Equality on status comes BEFORE the range constraint in
          // the index — composite index covers (status ASC, localDate ASC).
          constraints.unshift(where('status', '==', 'published'));
        }
        const recaps = await getCollection<Recap>(`recaps/${uid}/items`, constraints);
        if (cancelled) return;
        const map: Record<string, Recap> = {};
        for (const r of recaps) {
          if (r.localDate) map[r.localDate] = r;
        }
        setByDate(map);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error('useMonthRecaps fetch failed:', err);
          setByDate({});
          setLoading(false);
        }
      }
    }
    fetch();
    return () => { cancelled = true; };
    // monthKey is the stable derived month identifier; including
    // monthDate directly would re-fire on every parent render
  }, [uid, monthKey, isOwner, monthDate]);

  if (!uid) return { byDate: {} as Record<string, Recap>, loading: false };
  return { byDate, loading };
}

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(d: Date): { startKey: string; endKey: string } {
  const y = d.getFullYear();
  const m = d.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0); // last day of month
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { startKey: fmt(start), endKey: fmt(end) };
}
