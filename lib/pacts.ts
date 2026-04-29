import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { localDateKey } from './recap';
import { Pact, PactDayMap, PactDurationDays, PactReward } from '@/types/pact';

/**
 * Pact helpers.
 *
 * Pacts live at top-level `/pacts/{pactId}`. Both participants can read
 * + write the same doc — Firestore rule gates membership. Day cells
 * are seeded once on accept and flipped on recap publish.
 *
 * v1 keeps everything client-side (no Cloud Function): evaluation
 * runs lazily when either participant publishes a recap or opens the
 * pacts page. A scheduled function can take over later for stronger
 * "exact midnight" semantics.
 */

export const PACTS_COLLECTION = 'pacts';

/** Reward table — ground truth lives in the plan doc. */
export const PACT_REWARDS: Record<PactDurationDays, PactReward> = {
  7:  { xp: 200,  fragments: 100 },
  14: { xp: 450,  fragments: 225 },
  // The cosmetic id matches a grantOnly frame in PFP_FRAMES (see
  // constants/cosmetics.ts). Earned cosmetics flow into ownedCosmetics
  // via arrayUnion in applyPactResolution.
  30: { xp: 1200, fragments: 600, cosmeticId: 'frame_pact_holder' },
};

/** Penalty for pact break — both sides lose this many fragments. */
export const PACT_BREAK_PENALTY_FRAGMENTS = 50;

/** Generate sequential YYYY-MM-DD keys starting from `startKey`. */
export function pactDateKeys(startKey: string, days: number): string[] {
  const [y, m, d] = startKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(y, m - 1, d + i);
    keys.push(localDateKey(date));
  }
  return keys;
}

/**
 * Build the empty dayStatus map: every date keyed to a record where
 * each participant is 'pending'. Called once on accept.
 */
export function buildInitialDayMap(participants: [string, string], startKey: string, days: number): PactDayMap {
  const dayKeys = pactDateKeys(startKey, days);
  const map: PactDayMap = {};
  for (const key of dayKeys) {
    map[key] = {
      [participants[0]]: 'pending',
      [participants[1]]: 'pending',
    };
  }
  return map;
}

/** Sort uids so the same pair always produces the same `participants` array. */
function sortParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Create a pending pact invite. The recipient sees it on /pacts and
 * can accept or decline. No day cells are created until accept — a
 * declined invite leaves no state behind.
 */
export async function createPactInvite(args: {
  initiatorId: string;
  initiatorMeta: { username: string; avatarUrl: string };
  friendId: string;
  friendMeta: { username: string; avatarUrl: string };
  habitSlug: string;
  habitName: string;
  habitColor: string;
  durationDays: PactDurationDays;
}): Promise<string> {
  const participants = sortParticipants(args.initiatorId, args.friendId);
  const pact: Omit<Pact, 'id'> = {
    participants,
    participantsMeta: {
      [args.initiatorId]: args.initiatorMeta,
      [args.friendId]: args.friendMeta,
    },
    initiatorId: args.initiatorId,
    habitSlug: args.habitSlug,
    habitName: args.habitName,
    habitColor: args.habitColor,
    cadence: 'daily',
    durationDays: args.durationDays,
    startDate: '',
    endDate: '',
    status: 'pending',
    dayStatus: {},
    brokenBy: null,
    brokenAt: null,
    createdAt: Timestamp.now(),
    acceptedAt: null,
    resolvedAt: null,
  };
  const ref = await addDoc(collection(db, PACTS_COLLECTION), pact);

  // Notify the friend so the invite shows up in their notification bell.
  try {
    await addDoc(collection(db, `notifications/${args.friendId}/items`), {
      type: 'pact_invite',
      message: `${args.initiatorMeta.username} invited you to a ${args.durationDays}-day ${args.habitName} pact`,
      isRead: false,
      relatedId: ref.id,
      actorId: args.initiatorId,
      actorAvatar: args.initiatorMeta.avatarUrl,
      createdAt: Timestamp.now(),
    });
  } catch { /* non-fatal */ }

  return ref.id;
}

/**
 * Recipient accepts the invite. Seeds dayStatus from today (accepter's
 * local day) for `durationDays` days; both sides start from the same
 * date because the date keys are derived from the accepter's clock at
 * the moment of accept.
 */
export async function acceptPact(pactId: string, userId: string): Promise<void> {
  const ref = doc(db, PACTS_COLLECTION, pactId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Pact not found');
  const pact = snap.data() as Pact;
  if (pact.status !== 'pending') throw new Error('Pact already resolved');
  if (!pact.participants.includes(userId)) throw new Error('Not a participant');
  if (pact.initiatorId === userId) throw new Error('Initiator cannot accept their own invite');

  const startKey = localDateKey();
  const dateKeys = pactDateKeys(startKey, pact.durationDays);
  const endKey = dateKeys[dateKeys.length - 1];
  const dayStatus = buildInitialDayMap(pact.participants, startKey, pact.durationDays);

  await updateDoc(ref, {
    status: 'active',
    startDate: startKey,
    endDate: endKey,
    dayStatus,
    acceptedAt: Timestamp.now(),
    // One-shot freeze starts available — see evaluatePact for the rules.
    freezeAvailable: true,
    freezeUsedOn: null,
    freezeUsedBy: null,
  });

  // Notify initiator
  try {
    await addDoc(collection(db, `notifications/${pact.initiatorId}/items`), {
      type: 'pact_accepted',
      message: `${pact.participantsMeta[userId]?.username || 'Your friend'} accepted your pact — let's go.`,
      isRead: false,
      relatedId: pactId,
      actorId: userId,
      actorAvatar: pact.participantsMeta[userId]?.avatarUrl || '',
      createdAt: Timestamp.now(),
    });
  } catch { /* non-fatal */ }
}

export async function declinePact(pactId: string, userId: string): Promise<void> {
  const ref = doc(db, PACTS_COLLECTION, pactId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const pact = snap.data() as Pact;
  if (pact.status !== 'pending') return;
  if (!pact.participants.includes(userId)) throw new Error('Not a participant');

  await updateDoc(ref, {
    status: 'declined',
    resolvedAt: Timestamp.now(),
  });

  try {
    await addDoc(collection(db, `notifications/${pact.initiatorId}/items`), {
      type: 'pact_declined',
      message: `${pact.participantsMeta[userId]?.username || 'Your friend'} declined the pact.`,
      isRead: false,
      relatedId: pactId,
      actorId: userId,
      actorAvatar: pact.participantsMeta[userId]?.avatarUrl || '',
      createdAt: Timestamp.now(),
    });
  } catch { /* non-fatal */ }
}

/**
 * Mark the user's cell for `dateKey` as logged. Idempotent — re-calling
 * for an already-logged cell is a no-op.
 */
export async function markPactDayLogged(pactId: string, userId: string, dateKey: string): Promise<void> {
  const ref = doc(db, PACTS_COLLECTION, pactId);
  await setDoc(
    ref,
    { dayStatus: { [dateKey]: { [userId]: 'logged' } } },
    { merge: true },
  );
}

/**
 * Walk every elapsed day in the pact window. If any *closed* day (i.e.
 * strictly before today's local-date) has a 'pending' cell for either
 * participant → broken (unless the pact's one-shot freeze can absorb
 * exactly one such miss). If every day in the window is fully logged
 * (or covered by the freeze) → succeeded. Otherwise → still active.
 *
 * "Closed day" rule: today's pending status doesn't break the pact —
 * the user might still log + publish before midnight.
 *
 * Freeze rule:
 *   • If pact.freezeUsedOn is already set, that date is treated as
 *     "logged-equivalent" — the freeze persisted from a prior walk.
 *   • If freezeAvailable !== false (default true), the *first* fresh
 *     missed-and-closed day in this walk is marked as freezePendingOn
 *     instead of breaking the pact. The caller persists that
 *     consumption so subsequent walks see it as "used."
 *   • A second missed-and-closed day in the same walk → broken.
 */
export type PactEvaluation =
  | {
      kind: 'still-active';
      /** Set when this walk just used the freeze. Caller persists. */
      freezePendingOn?: string;
      freezePendingBy?: string;
    }
  | { kind: 'broken'; brokenBy: string; brokenOn: string }
  | {
      kind: 'succeeded';
      freezeUsedOn?: string;
      freezeUsedBy?: string;
    };

export function evaluatePact(pact: Pact): PactEvaluation {
  if (pact.status !== 'active') return { kind: 'still-active' };

  const today = localDateKey();
  const dateKeys = pactDateKeys(pact.startDate, pact.durationDays);

  // Default: freezeAvailable true unless explicitly false. Old pacts
  // missing the field count as available.
  const freezeAvailable = pact.freezeAvailable !== false && !pact.freezeUsedOn;

  let anyPendingInOpenWindow = false;
  let freezePendingOn: string | null = null;
  let freezePendingBy: string | null = null;

  for (const key of dateKeys) {
    const cell = pact.dayStatus[key];
    if (!cell) continue;

    // Day already covered by the persisted freeze — count as logged
    if (pact.freezeUsedOn === key) continue;

    const aLogged = cell[pact.participants[0]] === 'logged';
    const bLogged = cell[pact.participants[1]] === 'logged';
    const isPast = key < today;

    if (!aLogged || !bLogged) {
      if (isPast) {
        const blame = !aLogged ? pact.participants[0] : pact.participants[1];
        // First miss in this walk + freeze available + no pending consumption
        // already queued → consume the freeze instead of breaking.
        if (freezeAvailable && !freezePendingOn) {
          freezePendingOn = key;
          freezePendingBy = blame;
          continue;
        }
        // Second miss (or freeze unavailable) → broken.
        return { kind: 'broken', brokenBy: blame, brokenOn: key };
      } else {
        anyPendingInOpenWindow = true;
      }
    }
  }

  if (!anyPendingInOpenWindow) {
    return {
      kind: 'succeeded',
      freezeUsedOn: pact.freezeUsedOn || freezePendingOn || undefined,
      freezeUsedBy: pact.freezeUsedBy || freezePendingBy || undefined,
    };
  }
  return {
    kind: 'still-active',
    freezePendingOn: freezePendingOn || undefined,
    freezePendingBy: freezePendingBy || undefined,
  };
}

/**
 * Fan-out called from `publishRecap` after a recap is published.
 *
 * For each active pact this user is in:
 *   1. If `dateKey` falls in the pact window AND the pact's habitSlug
 *      appears in the recap → mark that user's cell for that date as
 *      logged.
 *   2. Invoke the `resolvePact` Cloud Function. The function (admin
 *      SDK) reads the latest pact state, runs evaluatePact, and
 *      atomically: persists freeze consumption / flips status to
 *      succeeded or broken / pays both sides their rewards or penalty
 *      / awards badges.
 *
 * Threading `dateKey` (instead of always using today's local date) is
 * critical for the retro-publish-yesterday's-record path — without it,
 * publishing yesterday would mark TODAY's cell, leave yesterday's
 * pending, and the pact would burn its freeze (or break) on next
 * evaluation.
 *
 * Resolution moved server-side because client rules forbid writing to
 * the OTHER participant's user doc / userBadges. Without the function,
 * only the publishing user got their rewards while the friend got
 * silently nothing. Same Cloud Function path also closes the
 * unilateral-status-flip exploit at the rule level.
 *
 * Best-effort — failures don't block the publish.
 */
export async function advancePactsForUser(
  userId: string,
  recapHabitSlugs: Set<string>,
  dateKey: string = localDateKey(),
): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, PACTS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('status', '==', 'active'),
    ),
  );

  const resolveFn = httpsCallable<{ pactId: string }, { kind: string }>(
    functions,
    'resolvePact',
  );

  await Promise.all(
    snap.docs.map(async (pactDoc) => {
      const pact = { id: pactDoc.id, ...(pactDoc.data() as Omit<Pact, 'id'>) };

      // Mark the cell only if dateKey is in window AND this recap
      // covers the pact's pillar.
      const inWindow = dateKey >= pact.startDate && dateKey <= pact.endDate;
      if (inWindow && recapHabitSlugs.has(pact.habitSlug)) {
        await markPactDayLogged(pactDoc.id, userId, dateKey);
      }

      // Always invoke resolution — it's idempotent. Function handles
      // still-active (with optional freeze persistence), succeeded,
      // and broken cases including all reward/penalty distribution.
      try {
        await resolveFn({ pactId: pactDoc.id });
      } catch (err) {
        console.error(`resolvePact callable failed for ${pactDoc.id}`, err);
      }
    }),
  );
}
