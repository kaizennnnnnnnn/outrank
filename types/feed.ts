import { Timestamp } from 'firebase/firestore';

export type FeedItemType = 'log' | 'badge' | 'levelup' | 'duel_win' | 'streak_milestone';

export type ReactionEmoji = '🔥' | '💪' | '👏' | '⚡' | '🤝';

export interface FeedItem {
  id?: string;
  type: FeedItemType;
  actorId: string;
  actorUsername: string;
  actorAvatar: string;
  categoryName?: string;
  categoryIcon?: string;
  categorySlug?: string;
  categoryColor?: string;
  value?: number;
  proofImageUrl?: string;
  verified?: boolean;
  message: string;
  reactions: Record<ReactionEmoji, string[]>;
  createdAt: Timestamp;
}
