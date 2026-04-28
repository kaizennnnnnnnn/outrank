'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useFriends } from './useFriends';
import { getDocument, subscribeToDocument } from '@/lib/firestore';
import { UserProfile } from '@/types/user';
import { FRIENDS_LEAGUE_REWARDS, FriendsLeagueEntry, FriendsLeagueSnapshot } from '@/types/friendsLeague';
import { isoWeekKey, lastIsoWeekKey } from '@/lib/friendsLeague';

/**
 * Live friends-league standings. Reads the current user's accepted
 * friends, fetches their `users/{uid}` docs in parallel, and assembles
 * a leaderboard sorted by `weeklyXP`. Includes the current user.
 *
 * No persistence during the week — the data is just the user docs,
 * which `logHabit` already updates per-log. Settlement happens via
 * the Cloud Function on Monday 00:00 UTC; the snapshot becomes
 * `useLastFriendsLeagueSnapshot()`'s return value.
 */
export function useFriendsLeague() {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriends();
  const [entries, setEntries] = useState<FriendsLeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || friendsLoading) return;
    let cancelled = false;

    async function load() {
      const friendIds = friends.map((f) => f.id);
      const profiles = await Promise.all(
        friendIds.map((id) => getDocument<UserProfile>('users', id)),
      );

      const me: FriendsLeagueEntry = {
        userId: user!.uid,
        username: user!.username,
        avatarUrl: user!.avatarUrl || '',
        score: user!.weeklyXP || 0,
        rank: 0,
        reward: 0,
      };

      const friendEntries: FriendsLeagueEntry[] = profiles
        .filter((p): p is UserProfile => !!p)
        .map((p) => ({
          userId: p.uid,
          username: p.username,
          avatarUrl: p.avatarUrl || '',
          score: p.weeklyXP || 0,
          rank: 0,
          reward: 0,
        }));

      // Sort and assign ranks. Stable order: ties by username so the
      // leaderboard doesn't reshuffle randomly between renders.
      const all = [...friendEntries, me].sort((a, b) =>
        b.score - a.score || a.username.localeCompare(b.username),
      );
      all.forEach((entry, i) => {
        entry.rank = i + 1;
        // Preview reward — actual settlement happens server-side, this
        // is just so the leaderboard hints at what's at stake.
        entry.reward = i < FRIENDS_LEAGUE_REWARDS.length ? FRIENDS_LEAGUE_REWARDS[i] : 0;
      });

      if (!cancelled) {
        setEntries(all);
        setLoading(false);
      }
    }

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user, friends, friendsLoading]);

  if (!user) {
    return { entries: [], myRank: 0, myScore: 0, loading: false, weekKey: isoWeekKey() };
  }

  const myEntry = entries.find((e) => e.userId === user.uid);
  return {
    entries,
    myRank: myEntry?.rank || 0,
    myScore: myEntry?.score || 0,
    loading,
    weekKey: isoWeekKey(),
  };
}

/**
 * Last finalized week's snapshot for the current user. Returns null
 * if no settlement has happened yet (first weeks of the feature, or
 * users without enough friends to qualify).
 */
export function useLastFriendsLeagueSnapshot() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [snapshot, setSnapshot] = useState<FriendsLeagueSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const weekKey = lastIsoWeekKey();
    const unsub = subscribeToDocument<FriendsLeagueSnapshot>(
      `friendsLeagues/${uid}/items`,
      weekKey,
      (data) => {
        setSnapshot(data);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  if (!uid) return { snapshot: null, loading: false };
  return { snapshot, loading };
}
