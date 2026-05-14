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
  /** When type='tournament', points back to the parent tournament doc
   *  so the bracket UI can find sibling matches + round state. */
  tournamentId?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  /** Days the competition is scheduled to run. Used for prize tiering. */
  durationDays?: number;
  status: CompetitionStatus;
  participants: CompetitionParticipant[];
  /** userIds who've already claimed their prize on the ended duel. */
  claimedBy?: string[];
}

export type TournamentStatus = 'recruiting' | 'active' | 'completed' | 'cancelled';

export interface TournamentParticipant {
  userId: string;
  username: string;
  avatarUrl: string;
  /** Whether this user has accepted the invite. Creator is true at
   *  creation; invitees flip to true when they accept on the bracket
   *  page. A decline cancels the whole tournament. */
  accepted: boolean;
  /** Set once the participant loses a match. Used by the bracket UI
   *  to dim eliminated avatars and by the advance-round logic. */
  eliminated: boolean;
  /** 1-4 seed slot in the bracket. Determined at status flip to
   *  'active' (random seeding for MVP). slot 1 vs 4 in R1 semi A;
   *  slot 2 vs 3 in R1 semi B. */
  seed: number;
}

export interface TournamentMatch {
  /** Doc id of the underlying competitions/{id} that powers this match. */
  competitionId: string;
  /** 1 = semi (R1), 2 = final (R2). MVP is single-elim 4-player. */
  roundNumber: 1 | 2;
  slot1UserId: string | null;
  slot2UserId: string | null;
  /** Set once the match has been claimed and a winner determined.
   *  Used by the advance-round logic to seed R2 from R1 winners. */
  winnerUserId: string | null;
}

export interface Tournament {
  id?: string;
  creatorId: string;
  title: string;
  categoryId: string;
  categorySlug: string;
  /** All four players (creator + 3 invitees). Fixed at creation; if
   *  anyone declines the tournament cancels rather than rotating. */
  participants: TournamentParticipant[];
  /** Matches accrete as rounds advance: 2 entries after R1 starts,
   *  3 after R2 starts (the final is added when R1 winners are known). */
  matches: TournamentMatch[];
  /** 3, 7, or 14 — same value used as durationDays on every match. */
  durationDaysPerRound: 3 | 7 | 14;
  status: TournamentStatus;
  /** Winner of the final. Stamped at completion alongside the reward
   *  grant + cosmetic unlock (cosmetics ship in a follow-up). */
  championId?: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}
