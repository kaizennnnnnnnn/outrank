import { Timestamp } from 'firebase/firestore';

export type CompetitionType = 'duel' | 'league' | 'global' | 'tournament';
export type CompetitionStatus = 'pending' | 'active' | 'completed';

export interface CompetitionParticipant {
  userId: string;
  username: string;
  avatarUrl: string;
  score: number;
  rank: number;
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
  status: CompetitionStatus;
  participants: CompetitionParticipant[];
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
