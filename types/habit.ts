import { Timestamp } from 'firebase/firestore';

export type TrackingType = 'count' | 'duration' | 'streak' | 'boolean';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly';

export interface Category {
  id?: string;
  slug: string;
  name: string;
  icon: string;
  description?: string;
  unit: string;
  color: string;
  trackingType: TrackingType;
  isOfficial: boolean;
  section: string;
  participantCount: number;
}

export interface UserHabit {
  id?: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categorySlug: string;
  goal: number;
  goalPeriod: GoalPeriod;
  isPublic: boolean;
  currentStreak: number;
  longestStreak: number;
  totalLogs: number;
  lastLogDate: Timestamp | null;
  createdAt: Timestamp;
  color: string;
  unit: string;
  /**
   * Streak repair offer fields. When logHabit detects a real break
   * (gap > 1 day, no freeze tokens, prior streak ≥ 3), it captures
   * the broken streak length and timestamp. The repair surface
   * fragment-spends to restore previousStreak. Cleared after repair
   * or on natural expiry of the 48h window.
   */
  previousStreak?: number;
  streakBrokenAt?: Timestamp | null;
}

export interface HabitLog {
  id?: string;
  habitId: string;
  categoryId: string;
  categorySlug: string;
  value: number;
  note: string;
  proofImageUrl: string;
  loggedAt: Timestamp;
  xpEarned: number;
  createdAt: Timestamp;
}
