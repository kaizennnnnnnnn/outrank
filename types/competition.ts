import { Timestamp } from 'firebase/firestore';

export type CompetitionType = 'duel' | 'league' | 'global' | 'tournament';
export type CompetitionStatus = 'pending' | 'active' | 'completed';

export interface CompetitionParticipant {
  userId: string;
  username: string;
  avatarUrl: string;
  score: number;
  rank: number;
  /** Score at which we last pushed a mid-duel notification to this user's
   *  opponents. Used to throttle pushes — a fresh log only notifies when
   *  the delta from this value crosses the threshold (or it's the first
   *  log of the duel, or it caused a lead flip). Absent on legacy docs. */
  lastNotifiedScore?: number;
  /** When the most recent mid-duel push was emitted on this participant's
   *  behalf. Pairs with `lastNotifiedScore` for the time + delta gate. */
  lastNotifiedAt?: Timestamp;
}

export interface Competition {
  id?: string;
  type: CompetitionType;
  categoryId: string;
  categorySlug: string;
  title: string;
  creatorId: string;
  leagueId?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  /** Days the competition is scheduled to run. Used for prize tiering. */
  durationDays?: number;
  status: CompetitionStatus;
  participants: CompetitionParticipant[];
  /** userIds who've already claimed their prize on the ended duel. */
  claimedBy?: string[];
}

export interface Tournament {
  id?: string;
  name: string;
  categoryId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isGlobal: boolean;
  prizeDescription: string;
  participantCount: number;
  status: CompetitionStatus;
}
