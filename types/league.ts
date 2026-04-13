import { Timestamp } from 'firebase/firestore';

export type MemberRole = 'admin' | 'member';

export interface League {
  id?: string;
  name: string;
  description: string;
  creatorId: string;
  inviteCode: string;
  isPrivate: boolean;
  memberCount: number;
  createdAt: Timestamp;
  avatarUrl: string;
  pinnedMessage: string;
}

export interface LeagueMember {
  userId: string;
  role: MemberRole;
  joinedAt: Timestamp;
  totalXP: number;
  username?: string;
  avatarUrl?: string;
}
