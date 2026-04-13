'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { subscribeToCollection, where } from '@/lib/firestore';
import { FriendshipDoc } from '@/types/user';

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<(FriendshipDoc & { id: string })[]>([]);
  const [pending, setPending] = useState<(FriendshipDoc & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setFriends([]);
      setPending([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToCollection<FriendshipDoc & { id: string }>(
      `friendships/${user.uid}/friends`,
      [],
      (items) => {
        setFriends(items.filter((f) => f.status === 'accepted'));
        setPending(items.filter((f) => f.status === 'pending'));
        setLoading(false);
      }
    );

    return unsub;
  }, [user?.uid]);

  return { friends, pending, loading };
}
