import { Timestamp } from 'firebase/firestore';

/**
 * One snapshotted result of a user's weekly friends-league. The Cloud
 * Function `friendsLeagueSettle` writes one of these per active user
 * each Monday at 00:00 UTC, just before `weeklyLeaderboardReset`
 * zeros out everyone's `weeklyXP`.
 *
 * The current week's standings are NOT persisted — they're derived
 * live from `users/{uid}.weeklyXP` reads. Only finalized weeks
 * become snapshots.
 *
 * Path: `friendsLeagues/{uid}/items/{weekKey}`. Owner-readable; written
 * by the Cloud Function via the admin SDK (rules deny direct writes).
 */
export interface FriendsLeagueSnapshot {
  id?: string;             // weekKey, e.g. "2026-W17"
  weekKey: string;
  /** ISO range covered by the snapshot, just for display. */
  weekStartIso: string;    // YYYY-MM-DD (Monday)
  weekEndIso: string;      // YYYY-MM-DD (Sunday)
  /**
   * Final standings — sorted descending by score. Capped at 20 entries
   * to keep the doc small even for users with large friend graphs.
   */
  standings: FriendsLeagueEntry[];
  /** Where the user themselves landed. Surfaced even when the user
   *  is below rank 20. */
  myRank: number;
  myScore: number;
  /** Reward earned this week, in fragments. 0 if didn't place. */
  myReward: number;
  settledAt: Timestamp;
}

export interface FriendsLeagueEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  score: number;     // weeklyXP at settlement time
  rank: number;
  reward: number;    // fragments awarded this week
}

/** Reward distribution for the top 3 — fixed for v1. */
export const FRIENDS_LEAGUE_REWARDS = [50, 30, 20] as const;
