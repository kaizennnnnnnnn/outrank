'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection, orderBy, limit } from '@/lib/firestore';
import { FeedItem } from '@/types/feed';

export function useFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToCollection<FeedItem>(
      `feed/${user.uid}/items`,
      [orderBy('createdAt', 'desc'), limit(50)],
      (feedItems) => {
        setItems(feedItems);
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  return { items, loading };
}
