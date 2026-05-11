import { adminDb } from './firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * Daily voice-conversation caps per tier. Enforced server-side at
 * session-start and tracked via `users/{uid}/voiceUsage/{YYYY-MM-DD}`.
 * Daily windows reset at the user's local midnight (uses their stored
 * `timezone`, falls back to UTC).
 */

export type VoiceTier = 'free' | 'plus' | 'pro';

export const DAILY_CAP_SECONDS: Record<VoiceTier, number> = {
  // TEMP: bumped from 60 to 600 for dev testing of the orb voice
  // visuals. Revert to 60 before shipping the free tier.
  free: 600,
  plus: 240,
  pro: 600,
};

interface UserDoc {
  subscriptionTier?: unknown;
  isPremium?: unknown;
  timezone?: unknown;
}

export function resolveTier(user: UserDoc | undefined | null): VoiceTier {
  if (!user) return 'free';
  if (user.subscriptionTier === 'pro') return 'pro';
  if (user.subscriptionTier === 'plus') return 'plus';
  if (user.isPremium === true) return 'plus';
  return 'free';
}

/**
 * YYYY-MM-DD in the user's local timezone (falls back to UTC if their
 * tz isn't set or is invalid). Using local-time date keys means a
 * user's daily window resets at their own midnight, not server time.
 */
export function localDateKey(date: Date, timezone: string | undefined): string {
  const tz = typeof timezone === 'string' && timezone.length > 0 ? timezone : 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface VoiceUsageSnapshot {
  tier: VoiceTier;
  dateKey: string;
  capSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
}

export async function loadVoiceUsage(uid: string): Promise<VoiceUsageSnapshot> {
  const userSnap = await adminDb.collection('users').doc(uid).get();
  const userData = (userSnap.exists ? userSnap.data() : {}) as UserDoc;
  const tier = resolveTier(userData);
  const tz = typeof userData.timezone === 'string' ? userData.timezone : undefined;
  const dateKey = localDateKey(new Date(), tz);

  const usageSnap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('voiceUsage')
    .doc(dateKey)
    .get();

  const rawSeconds = usageSnap.exists
    ? (usageSnap.data() as { seconds?: unknown }).seconds
    : 0;
  const usedSeconds =
    typeof rawSeconds === 'number' && Number.isFinite(rawSeconds) && rawSeconds > 0
      ? Math.floor(rawSeconds)
      : 0;

  const capSeconds = DAILY_CAP_SECONDS[tier];
  return {
    tier,
    dateKey,
    capSeconds,
    usedSeconds,
    remainingSeconds: Math.max(0, capSeconds - usedSeconds),
  };
}

/**
 * Records `seconds` of voice usage against today's bucket. Capped at a
 * conservative per-call limit so a malicious client can't spike usage
 * with one fake POST.
 */
const MAX_SESSION_RECORD_SECONDS = 60 * 30;

export async function recordVoiceUsage(uid: string, seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const safeSeconds = Math.min(Math.floor(seconds), MAX_SESSION_RECORD_SECONDS);

  const userSnap = await adminDb.collection('users').doc(uid).get();
  const userData = (userSnap.exists ? userSnap.data() : {}) as UserDoc;
  const tz = typeof userData.timezone === 'string' ? userData.timezone : undefined;
  const dateKey = localDateKey(new Date(), tz);

  await adminDb
    .collection('users')
    .doc(uid)
    .collection('voiceUsage')
    .doc(dateKey)
    .set(
      {
        seconds: FieldValue.increment(safeSeconds),
        sessionCount: FieldValue.increment(1),
        lastUpdatedAt: Timestamp.now(),
      },
      { merge: true },
    );
}
