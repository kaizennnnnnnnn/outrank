import { Timestamp } from 'firebase/firestore';

// 'log' is legacy — kept so existing items render. New activity comes
// through 'recap' (one feed item per published daily recap, not per log).
export type FeedItemType = 'log' | 'recap' | 'badge' | 'levelup' | 'duel_win' | 'streak_milestone';

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
