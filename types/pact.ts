import { Timestamp } from 'firebase/firestore';

export type PactCadence = 'daily';
export type PactDurationDays = 7 | 14 | 30;
export type PactStatus = 'pending' | 'active' | 'succeeded' | 'broken' | 'declined';
export type PactDayStatus = 'logged' | 'pending';

/**
 * Per-day per-participant log record. Keys are YYYY-MM-DD strings (the
 * initiator's local TZ at create time — kept consistent so both sides
 * agree on which day is "today"). Values map participant uid →
 * 'logged' (they hit the habit that day) or 'pending' (not yet).
 *
 * On accept, every date in the window is seeded as 'pending' for both
 * participants. On recap publish, the corresponding cell flips to
 * 'logged' if the pact's habitSlug appears in the published recap.
 */
export type PactDayMap = Record<string, Record<string, PactDayStatus>>;

export interface PactParticipantMeta {
  username: string;
  avatarUrl: string;
}

export interface Pact {
  id?: string;

  /** [a, b] sorted alphabetically so two users can't double-create the
   *  same pact mistakenly via different orderings. */
  participants: [string, string];
  participantsMeta: Record<string, PactParticipantMeta>;
  initiatorId: string;

  /** Pillar slug — gym, steps, water, sleep, no-social. v1 limits
   *  pacts to pillars; custom habits aren't competition-eligible. */
  habitSlug: string;
  habitName: string;
  habitColor: string;

  cadence: PactCadence;          // v1 always 'daily'
  durationDays: PactDurationDays;

  /** YYYY-MM-DD — same day on both sides regardless of TZ. The
   *  initiator's local-day at accept-time becomes the canonical
   *  reference. */
  startDate: string;
  endDate: string;

  status: PactStatus;
  dayStatus: PactDayMap;

  brokenBy: string | null;
  brokenAt: Timestamp | null;

  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
  resolvedAt: Timestamp | null;
}

/**
 * Reward bundle for a successful pact. Mirrors the table in
 * docs/friends-and-verification-plan.md so changes there flow through
 * here without divergence.
 */
export interface PactReward {
  xp: number;
  fragments: number;
  /** Cosmetic id awarded on success — undefined for tiers without one. */
  cosmeticId?: string;
}
