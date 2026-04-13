import { Timestamp } from 'firebase/firestore';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  score: number;
  rank: number;
  delta: number;
  updatedAt: Timestamp;
}
