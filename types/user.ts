import { Timestamp } from 'firebase/firestore';

export interface UserSettings {
  notifications: {
    streakReminder: boolean;
    /** Friends publishing daily records / legacy per-log activity. */
    friendActivity: boolean;
    duelUpdates: boolean;
    /** Friends-league settlements (Monday morning). */
    leagueUpdates: boolean;
    weeklyRecap: boolean;
    leaderboardChanges: boolean;
    /** Pact invites / accepts / declines / breaks / successes / freezes. */
    pactUpdates: boolean;
    /** Water + sleep wind-down reminders fired by pillarReminders fn. */
    pillarReminders: boolean;
  };
  privacy: {
    isPublic: boolean;
    showOnLeaderboards: boolean;
  };
  theme: 'dark' | 'light' | 'system';
}

export interface IntegrationGitHub {
  accessToken: string;
  username: string;
  avatarUrl: string;
  connectedAt: string;
}

export interface IntegrationGoogleFit {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: string;
}

export interface UserIntegrations {
  github?: IntegrationGitHub;
  google_fit?: IntegrationGoogleFit;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatarUrl: string;
  bio: string;
  level: number;
  totalXP: number;
  currentTitle: string;
  friendCount: number;
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Timestamp;
  lastActiveAt: Timestamp;
  isPublic: boolean;
  isBanned: boolean;
  fcmToken: string;
  streakFreezeTokens: number;
  weeklyXP: number;
  monthlyXP: number;
  settings: UserSettings;
  integrations?: UserIntegrations;
}

export interface UsernameDoc {
  uid: string;
}

export interface FriendshipDoc {
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Timestamp;
  direction: 'sent' | 'received';
}
