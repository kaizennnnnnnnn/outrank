import { Timestamp } from 'firebase/firestore';

/**
 * One log entry inside a Recap. Denormalized snapshot of the original
 * `logs/{uid}/habitLogs/{logId}` doc — keeping the recap self-contained
 * means rendering a friend's recap is a single doc read, not N. Fields
 * the verification surface needs (proof, confirms, flags) live here.
 */
export interface RecapEntry {
  logId: string;
  habitSlug: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  value: number;
  unit: string;
  note: string;
  proofImageUrl: string;
  verified: boolean;
  xpEarned: number;
  loggedAt: Timestamp;
  // Future: per-entry verification debate (Phase 2+). Schema-ready now so
  // we don't migrate later.
  confirmedBy?: string[];
  flaggedBy?: string[];
}

export type RecapStatus = 'draft' | 'published';

/**
 * One Recap = one user's day. Path: `recaps/{uid}/items/{YYYY-MM-DD}`.
 * Doc id is the local-date string so we never have collisions or
 * "is there already one?" races, and "submit yesterday's" is just
 * "operate on yesterday's date key."
 */
export interface Recap {
  id?: string;            // YYYY-MM-DD, == localDate
  userId: string;
  username: string;       // snapshot at create
  avatarUrl: string;      // snapshot at create
  localDate: string;      // YYYY-MM-DD
  status: RecapStatus;
  publishedAt: Timestamp | null;
  createdAt: Timestamp;
  lastEditedAt: Timestamp | null;

  // Aggregate — kept up to date as entries are appended
  logCount: number;
  proofCount: number;
  totalXP: number;

  entries: RecapEntry[];

  // Reuses the `/reactions/{originId}` + `/reactions/{originId}/comments`
  // collections that already power feed reactions/comments. Same code
  // path, no new infra.
  originId: string;       // = `recap_${uid}_${localDate}`
}

/**
 * Recap-shaped feed item. Replaces per-log fan-out: friends get one
 * item per published recap, not one per log. Carries enough summary
 * info to render the preview card without re-reading the full recap.
 */
export interface RecapFeedItem {
  id?: string;
  type: 'recap';
  actorId: string;
  actorUsername: string;
  actorAvatar: string;
  recapDate: string;          // YYYY-MM-DD — links to recaps/{actorId}/items/{recapDate}
  totalXP: number;
  logCount: number;
  proofCount: number;
  // Top 3 categories by XP for the preview chips
  topCategories: Array<{
    slug: string;
    name: string;
    icon: string;
    color: string;
    value: number;
    unit: string;
  }>;
  // First proof image (if any) for the hero shot in the feed card
  heroProofUrl: string;
  message: string;             // e.g. "jovan published their day · 5 logs · +120 XP"
  originId: string;            // shared with the recap so reactions/comments thread
  reactions: Record<string, string[]>;
  createdAt: Timestamp;
}
