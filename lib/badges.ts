import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getBadgeById } from '@/constants/badges';

/**
 * Client-side badge grant.
 *
 * Idempotent: if the badge doc already exists, returns false and no
 * XP is granted. Otherwise creates `userBadges/{uid}/earned/{badgeId}`
 * and increments the user's totalXP / weeklyXP / monthlyXP by the
 * badge's xpReward.
 *
 * The BadgeUnlockOverlay component (mounted in the app layout)
 * listens to the user's earned subcollection and triggers the unlock
 * animation on count change — no extra plumbing needed at call sites.
 *
 * Returns: true if newly granted, false if the user already had it.
 */
export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const badge = getBadgeById(badgeId);
  if (!badge) {
    // Defensive — surfacing instead of silently failing helps catch
    // typos at the call site when adding new conditions.
    console.warn(`awardBadge: unknown badge id "${badgeId}"`);
    return false;
  }
  const ref = doc(db, `userBadges/${userId}/earned/${badgeId}`);
  const snap = await getDoc(ref);
  if (snap.exists()) return false;

  await setDoc(ref, {
    badgeId,
    earnedAt: Timestamp.now(),
  });

  // Award the XP. Best-effort — badge already granted by the time
  // this runs, so a failed XP increment is non-fatal (the user can
  // retry the same flow and the badge-already-exists short-circuit
  // prevents a re-grant).
  try {
    await updateDoc(doc(db, 'users', userId), {
      totalXP: increment(badge.xpReward),
      weeklyXP: increment(badge.xpReward),
      monthlyXP: increment(badge.xpReward),
    });
  } catch (err) {
    console.error(`awardBadge XP grant failed for ${badgeId}`, err);
  }

  return true;
}

/**
 * Award the first matching badge from a list of (badgeId, threshold)
 * tuples — given the user's current count, picks the highest tier
 * they qualify for that they haven't already earned. Used for
 * progressive achievement chains (recap publish 1/7/30; pact won
 * 1/3; league wins 1/5).
 *
 * Walks descending so a single call handles "user just hit 30" by
 * granting the 30 badge directly even if they somehow skipped 7
 * (replay scenarios, deleted badge docs, etc.).
 */
export async function awardThreshold(
  userId: string,
  count: number,
  tiers: Array<{ badgeId: string; threshold: number }>,
): Promise<void> {
  // Walk descending so we find the highest qualifying tier first
  const sorted = [...tiers].sort((a, b) => b.threshold - a.threshold);
  for (const tier of sorted) {
    if (count >= tier.threshold) {
      await awardBadge(userId, tier.badgeId);
      // Don't break — also catch up on lower tiers the user may have
      // missed (rare, but cheap to check via the existence-skip path).
    }
  }
}
