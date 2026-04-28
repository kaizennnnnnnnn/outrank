import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Recap, RecapEntry, RecapFeedItem } from '@/types/recap';
import { advancePactsForUser } from './pacts';
import { awardBadge, awardThreshold } from './badges';

/**
 * Daily Recap helpers.
 *
 * One Recap doc per (user, local-date). Doc id IS the date string, so:
 *   - "Submit today" operates on `localDateKey(new Date())`
 *   - "Submit yesterday" operates on `localDateKey(yesterday)`
 *   - No race on creation; setDoc(merge:true) is idempotent.
 *
 * Edit-after-publish window: 24h from `publishedAt`. Enforced in `editEntry`
 * + `removeEntry`. UI reads `canEdit(recap)` to gate the affordances.
 */

const PUBLISH_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RETRO_PUBLISH_WINDOW_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in the user's local timezone. */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(now: Date = new Date()): string {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return localDateKey(y);
}

export function recapPath(userId: string, dateKey: string): string {
  return `recaps/${userId}/items/${dateKey}`;
}

export function recapOriginId(userId: string, dateKey: string): string {
  return `recap_${userId}_${dateKey}`;
}

export function canEdit(recap: Recap): boolean {
  if (recap.status !== 'published') return true;
  const publishedAt = recap.publishedAt?.toDate?.()?.getTime();
  if (!publishedAt) return true;
  return Date.now() - publishedAt < PUBLISH_EDIT_WINDOW_MS;
}

/**
 * Whether an unpublished recap from yesterday is still eligible for the
 * "publish yesterday's record" affordance. We cap retro-publish at 24h
 * after midnight so the recap stays roughly truthful to "today's day."
 */
export function canPublishYesterday(recap: Recap | null): boolean {
  if (!recap) return false;
  if (recap.status !== 'draft') return false;
  if (recap.logCount === 0) return false;
  const today = localDateKey();
  const yesterday = yesterdayKey();
  if (recap.localDate !== yesterday) return false;
  // Compute end-of-yesterday (== start-of-today) and bail if we're past
  // the retro window
  const [y, m, d] = today.split('-').map(Number);
  const startOfToday = new Date(y, m - 1, d).getTime();
  return Date.now() - startOfToday < RETRO_PUBLISH_WINDOW_MS;
}

export async function getRecap(userId: string, dateKey: string): Promise<Recap | null> {
  const snap = await getDoc(doc(db, recapPath(userId, dateKey)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Recap, 'id'>) };
}

/** Today's draft, or null if it hasn't been started. */
export async function getTodaysDraft(userId: string): Promise<Recap | null> {
  return getRecap(userId, localDateKey());
}

export async function getYesterdaysDraft(userId: string): Promise<Recap | null> {
  return getRecap(userId, yesterdayKey());
}

interface AppendArgs {
  userId: string;
  username: string;
  avatarUrl: string;
  entry: RecapEntry;
  /** Override target date (defaults to today). Used by retro logging. */
  dateKey?: string;
}

/**
 * Append a log entry to a recap (creating the recap doc if needed).
 *
 * If the recap is already published and inside the 24h edit window, the
 * entry is appended and `lastEditedAt` updated — friends will see the
 * extra entry next time they open the detail. If outside the window,
 * we skip the append (the log itself still saved by the caller; it just
 * won't appear in the recap retroactively).
 */
export async function appendLogToRecap(args: AppendArgs): Promise<void> {
  const { userId, username, avatarUrl, entry } = args;
  const dateKey = args.dateKey ?? localDateKey();
  const path = recapPath(userId, dateKey);
  const ref = doc(db, path);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const newRecap: Omit<Recap, 'id'> = {
      userId,
      username,
      avatarUrl,
      localDate: dateKey,
      status: 'draft',
      publishedAt: null,
      createdAt: Timestamp.now(),
      lastEditedAt: null,
      logCount: 1,
      proofCount: entry.proofImageUrl ? 1 : 0,
      totalXP: entry.xpEarned,
      entries: [entry],
      originId: recapOriginId(userId, dateKey),
    };
    await setDoc(ref, newRecap);
    return;
  }

  const recap = { id: snap.id, ...(snap.data() as Omit<Recap, 'id'>) };

  // If published and outside edit window, don't mutate.
  if (recap.status === 'published' && !canEdit(recap)) return;

  const newEntries = [...recap.entries, entry];
  await updateDoc(ref, {
    entries: newEntries,
    logCount: newEntries.length,
    proofCount: newEntries.filter((e) => !!e.proofImageUrl).length,
    totalXP: newEntries.reduce((s, e) => s + (e.xpEarned || 0), 0),
    lastEditedAt: recap.status === 'published' ? Timestamp.now() : null,
  });
}

/**
 * Publish a draft. Flips status, fans out a single recap-shaped feed
 * item to each accepted friend, and creates one notification per friend
 * (replaces the per-log spam fan-out from `lib/logHabit.ts`).
 */
export async function publishRecap(userId: string, dateKey: string = localDateKey()): Promise<void> {
  const ref = doc(db, recapPath(userId, dateKey));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('No recap to publish');
  const recap = { id: snap.id, ...(snap.data() as Omit<Recap, 'id'>) };
  if (recap.status === 'published') return;
  if (recap.logCount === 0) throw new Error('Cannot publish an empty recap');

  const publishedAt = Timestamp.now();
  await updateDoc(ref, { status: 'published', publishedAt });

  // Initialise shared reactions doc so friends can react/comment immediately
  await setDoc(doc(db, `reactions/${recap.originId}`), { reactions: {} }, { merge: true });

  // Top 3 categories by XP for the preview chips
  const byCategory = new Map<string, { slug: string; name: string; icon: string; color: string; value: number; unit: string }>();
  for (const e of recap.entries) {
    const existing = byCategory.get(e.habitSlug);
    if (existing) {
      existing.value += e.value;
    } else {
      byCategory.set(e.habitSlug, {
        slug: e.habitSlug,
        name: e.categoryName,
        icon: e.categoryIcon,
        color: e.categoryColor,
        value: e.value,
        unit: e.unit,
      });
    }
  }
  const topCategories = Array.from(byCategory.values()).slice(0, 3);
  const heroProofUrl = recap.entries.find((e) => !!e.proofImageUrl)?.proofImageUrl || '';

  const feedItem: Omit<RecapFeedItem, 'id'> = {
    type: 'recap',
    actorId: userId,
    actorUsername: recap.username,
    actorAvatar: recap.avatarUrl,
    recapDate: dateKey,
    totalXP: recap.totalXP,
    logCount: recap.logCount,
    proofCount: recap.proofCount,
    topCategories,
    heroProofUrl,
    message: `${recap.username} published their day · ${recap.logCount} log${recap.logCount === 1 ? '' : 's'} · +${recap.totalXP} XP`,
    originId: recap.originId,
    reactions: {},
    createdAt: publishedAt,
  };

  // Own feed
  await setDoc(doc(db, `feed/${userId}/items/${recap.originId}`), feedItem);

  // Friends' feeds + a single notification per friend (one push per
  // friend per day — the whole point of the recap mechanic)
  try {
    const friendsSnap = await getDocs(
      query(
        collection(db, `friendships/${userId}/friends`),
        where('status', '==', 'accepted'),
      ),
    );
    await Promise.all(
      friendsSnap.docs.map(async (friendDoc) => {
        const friendId = friendDoc.id;
        await setDoc(doc(db, `feed/${friendId}/items/${recap.originId}`), feedItem);
        await setDoc(doc(db, `notifications/${friendId}/items/${recap.originId}`), {
          type: 'friend_recap',
          message: `${recap.username} published their day · +${recap.totalXP} XP`,
          isRead: false,
          relatedId: dateKey,
          actorId: userId,
          actorAvatar: recap.avatarUrl,
          createdAt: publishedAt,
        });
      }),
    );
  } catch (err) {
    console.error('Recap fan-out failed:', err);
  }

  // Advance any active pacts this user is in. For each pact whose
  // habitSlug appears in the recap, mark today's cell logged for this
  // user; then re-evaluate and resolve broken / succeeded states.
  // Best-effort — failures don't block the publish.
  try {
    const slugs = new Set(recap.entries.map((e) => e.habitSlug));
    await advancePactsForUser(userId, slugs);
  } catch (err) {
    console.error('Pact advance failed:', err);
  }

  // Increment the user's published-recaps counter and check the
  // achievement thresholds (1 / 7 / 30). Best-effort — failures
  // don't block the publish.
  try {
    await updateDoc(doc(db, 'users', userId), {
      publishedRecaps: increment(1),
    });
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    const total = (userDocSnap.data()?.publishedRecaps as number) || 0;
    await awardThreshold(userId, total, [
      { badgeId: 'first-recap', threshold: 1 },
      { badgeId: 'recap-week', threshold: 7 },
      { badgeId: 'recap-month', threshold: 30 },
    ]);
  } catch (err) {
    console.error('Recap badge grant failed:', err);
  }
}

/**
 * Edit an entry's note or proof image after publish (within the 24h
 * window). Aggregates and lastEditedAt are recomputed.
 */
export async function editEntry(
  userId: string,
  dateKey: string,
  logId: string,
  patch: Partial<Pick<RecapEntry, 'note' | 'proofImageUrl'>>,
): Promise<void> {
  const ref = doc(db, recapPath(userId, dateKey));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const recap = { id: snap.id, ...(snap.data() as Omit<Recap, 'id'>) };
  if (!canEdit(recap)) throw new Error('Edit window has passed');

  const newEntries = recap.entries.map((e) =>
    e.logId === logId
      ? {
          ...e,
          ...patch,
          verified: patch.proofImageUrl !== undefined ? !!patch.proofImageUrl : e.verified,
        }
      : e,
  );
  await updateDoc(ref, {
    entries: newEntries,
    proofCount: newEntries.filter((e) => !!e.proofImageUrl).length,
    lastEditedAt: Timestamp.now(),
  });
}

/**
 * Per-entry origin id for verification reactions. Lives in the
 * existing `/reactions/{originId}` collection alongside the recap's
 * own reactions/comments — no new infra, no new rules. The "confirm"
 * and "flag" arrays inside `reactions` work the same as 🔥 / 💪 / etc.
 */
export function entryVerificationOriginId(recapOriginId: string, logId: string): string {
  return `${recapOriginId}_${logId}`;
}

export type VerificationKind = 'confirm' | 'flag';

/**
 * Add the current user to an entry's confirm or flag list. Idempotent
 * via arrayUnion. The recap doc itself stays owner-only — this writes
 * to /reactions, which all authenticated users can write to.
 *
 * Used by the recap detail view's per-entry verification UI: a friend
 * tapping "Confirm" upgrades the log toward tier-2 (verified by
 * friend) per the verification ladder.
 *
 * Side effect: confirms increment the actor's `verifyConfirms` counter
 * and trip the Verifier achievement at 25. The arrayUnion above keeps
 * confirms idempotent at the doc level, but the counter +1 always
 * fires — accepted tradeoff for v1 since the cost is just slightly
 * inflated counters from re-taps. Tightening to "only +1 if actually
 * new" would require a get-then-write, which doubles the round trips.
 */
export async function addEntryVerification(
  recapOriginId: string,
  logId: string,
  uid: string,
  kind: VerificationKind,
): Promise<void> {
  const ref = doc(db, `reactions/${entryVerificationOriginId(recapOriginId, logId)}`);
  await setDoc(
    ref,
    { reactions: { [kind]: arrayUnion(uid) } },
    { merge: true },
  );

  if (kind === 'confirm') {
    try {
      await updateDoc(doc(db, 'users', uid), {
        verifyConfirms: increment(1),
      });
      const userSnap = await getDoc(doc(db, 'users', uid));
      const total = (userSnap.data()?.verifyConfirms as number) || 0;
      if (total >= 25) {
        await awardBadge(uid, 'verifier');
      }
    } catch (err) {
      console.error('Verifier badge grant failed:', err);
    }
  }
}

/** Undo a confirm or flag. */
export async function removeEntryVerification(
  recapOriginId: string,
  logId: string,
  uid: string,
  kind: VerificationKind,
): Promise<void> {
  const ref = doc(db, `reactions/${entryVerificationOriginId(recapOriginId, logId)}`);
  await updateDoc(ref, { [`reactions.${kind}`]: arrayRemove(uid) });
}

export interface EntryVerification {
  confirm: string[];
  flag: string[];
}

/**
 * Bulk-fetch verification state for every entry in a recap. Returned
 * map is keyed by logId. Missing entries (no confirms or flags yet)
 * default to empty arrays.
 *
 * One-shot read — the detail view doesn't need real-time updates for
 * v1; tap Confirm/Flag → optimistic state update + write.
 */
export async function getEntryVerifications(
  recap: Recap,
): Promise<Record<string, EntryVerification>> {
  const map: Record<string, EntryVerification> = {};
  await Promise.all(
    recap.entries.map(async (entry) => {
      const id = entryVerificationOriginId(recap.originId, entry.logId);
      try {
        const snap = await getDoc(doc(db, `reactions/${id}`));
        if (snap.exists()) {
          const data = snap.data() as { reactions?: Record<string, string[]> };
          map[entry.logId] = {
            confirm: data.reactions?.confirm || [],
            flag: data.reactions?.flag || [],
          };
        } else {
          map[entry.logId] = { confirm: [], flag: [] };
        }
      } catch {
        map[entry.logId] = { confirm: [], flag: [] };
      }
    }),
  );
  return map;
}

/** Remove an entry from a published recap (within the 24h window). */
export async function removeEntry(
  userId: string,
  dateKey: string,
  logId: string,
): Promise<void> {
  const ref = doc(db, recapPath(userId, dateKey));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const recap = { id: snap.id, ...(snap.data() as Omit<Recap, 'id'>) };
  if (!canEdit(recap)) throw new Error('Edit window has passed');

  const newEntries = recap.entries.filter((e) => e.logId !== logId);
  await updateDoc(ref, {
    entries: newEntries,
    logCount: newEntries.length,
    proofCount: newEntries.filter((e) => !!e.proofImageUrl).length,
    totalXP: newEntries.reduce((s, e) => s + (e.xpEarned || 0), 0),
    lastEditedAt: Timestamp.now(),
  });
}
