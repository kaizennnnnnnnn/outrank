import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'duel_challenge'
  | 'duel_accepted'
  | 'duel_declined'
  | 'duel_ended'
  | 'leaderboard_overtaken'
  | 'streak_at_risk'
  | 'streak_broken'
  | 'badge_earned'
  | 'level_up'
  | 'tournament_starting'
  | 'weekly_recap'
  | 'league_winner'
  | 'friend_logged';

export interface NotificationItem {
  id?: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  relatedId: string;
  actorId: string;
  actorAvatar: string;
  createdAt: Timestamp;
}
