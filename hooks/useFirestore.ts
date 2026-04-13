'use client';

import { useEffect, useState } from 'react';
import { QueryConstraint } from 'firebase/firestore';
import { subscribeToDocument, subscribeToCollection } from '@/lib/firestore';

export function useDocument<T>(path: string, id: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const unsub = subscribeToDocument<T>(path, id, (doc) => {
        setData(doc);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [path, id]);

  return { data, loading, error };
}

export function useCollection<T>(
  path: string,
  constraints: QueryConstraint[] = [],
  enabled = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const unsub = subscribeToCollection<T>(path, constraints, (docs) => {
        setData(docs);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);

  return { data, loading, error };
}
