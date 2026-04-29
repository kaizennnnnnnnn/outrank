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
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { localDateKey } from './recap';
import { awardBadge, awardThreshold } from './badges';
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
 * Persist the result of a pact evaluation: flip status, distribute
 * rewards / penalties to both users. Idempotent — calling on a pact
 * already in succeeded/broken status is a no-op.
 */
export async function applyPactResolution(pact: Pact, evalResult: PactEvaluation): Promise<void> {
  if (!pact.id) return;
  if (evalResult.kind === 'still-active') return;
  if (pact.status !== 'active') return;

  const ref = doc(db, PACTS_COLLECTION, pact.id);

  if (evalResult.kind === 'succeeded') {
    const reward = PACT_REWARDS[pact.durationDays];
    // Persist the freeze record alongside the success flip — covers the
    // case where the freeze was consumed in the very same walk that
    // completed the pact (last day's miss covered + everything else
    // logged). For pacts where freeze was already persisted earlier,
    // these fields no-op against existing values.
    const update: Record<string, unknown> = {
      status: 'succeeded',
      resolvedAt: Timestamp.now(),
    };
    if (evalResult.freezeUsedOn && !pact.freezeUsedOn) {
      update.freezeAvailable = false;
      update.freezeUsedOn = evalResult.freezeUsedOn;
      update.freezeUsedBy = evalResult.freezeUsedBy || null;
    }
    await updateDoc(ref, update);
    // Both participants earn the reward. Cosmetic (only present on
    // 30-day pacts in v1) goes into ownedCosmetics via arrayUnion so
    // re-grants are no-ops — won't duplicate if the user has already
    // earned this frame from another pact.
    //
    // pactsWon counter increments here so the threshold-based badges
    // (pact-pioneer 1, pact-trio 3) fire alongside reward distribution.
    // pact-veteran is keyed off durationDays (30) so it only awards on
    // the long pact regardless of total wins.
    await Promise.all(
      pact.participants.map(async (uid) => {
        const update: Record<string, unknown> = {
          totalXP: increment(reward.xp),
          weeklyXP: increment(reward.xp),
          monthlyXP: increment(reward.xp),
          fragments: increment(reward.fragments),
          pactsWon: increment(1),
        };
        if (reward.cosmeticId) {
          update.ownedCosmetics = arrayUnion(reward.cosmeticId);
        }
        await updateDoc(doc(db, 'users', uid), update);

        const cosmeticLine = reward.cosmeticId ? ' · "Pact Holder" frame unlocked' : '';
        await addDoc(collection(db, `notifications/${uid}/items`), {
          type: 'pact_succeeded',
          message: `Pact complete · +${reward.xp} XP · +${reward.fragments} fragments${cosmeticLine}`,
          isRead: false,
          relatedId: pact.id || '',
          actorId: '',
          actorAvatar: '',
          createdAt: Timestamp.now(),
        });

        // Achievements — best-effort. The increment + read-back gives
        // us this user's running win count for threshold checks; the
        // 30-day badge fires off durationDays directly.
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          const wins = (userSnap.data()?.pactsWon as number) || 0;
          await awardThreshold(uid, wins, [
            { badgeId: 'pact-pioneer', threshold: 1 },
            { badgeId: 'pact-trio',    threshold: 3 },
          ]);
          if (pact.durationDays === 30) {
            await awardBadge(uid, 'pact-veteran');
          }
        } catch (err) {
          console.error(`Pact badge grant failed for ${uid}`, err);
        }
      }),
    );
  } else if (evalResult.kind === 'broken') {
    await updateDoc(ref, {
      status: 'broken',
      brokenBy: evalResult.brokenBy,
      brokenAt: Timestamp.now(),
      resolvedAt: Timestamp.now(),
    });
    await Promise.all(
      pact.participants.map(async (uid) => {
        await updateDoc(doc(db, 'users', uid), {
          fragments: increment(-PACT_BREAK_PENALTY_FRAGMENTS),
        });
        await addDoc(collection(db, `notifications/${uid}/items`), {
          type: 'pact_broken',
          message: `Pact broken — both sides lost ${PACT_BREAK_PENALTY_FRAGMENTS} fragments.`,
          isRead: false,
          relatedId: pact.id || '',
          actorId: evalResult.brokenBy,
          actorAvatar: pact.participantsMeta[evalResult.brokenBy]?.avatarUrl || '',
          createdAt: Timestamp.now(),
        });
      }),
    );
  }
}

/**
 * Fan-out called from `publishRecap`: for every active pact this user
 * is in, mark today's cell logged if the pact's habitSlug appears in
 * the published recap; then re-evaluate and resolve if the verdict is
 * succeeded or broken. Best-effort — failures don't block the publish.
 */
export async function advancePactsForUser(userId: string, recapHabitSlugs: Set<string>): Promise<void> {
  const today = localDateKey();
  const snap = await getDocs(
    query(
      collection(db, PACTS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('status', '==', 'active'),
    ),
  );

  await Promise.all(
    snap.docs.map(async (pactDoc) => {
      const pact = { id: pactDoc.id, ...(pactDoc.data() as Omit<Pact, 'id'>) };
      // Skip if today is outside the pact window
      if (today < pact.startDate || today > pact.endDate) {
        // But still evaluate — could be a fully-elapsed unresolved pact
        const verdict = evaluatePact(pact);
        if (verdict.kind !== 'still-active') {
          await applyPactResolution(pact, verdict);
        }
        return;
      }

      if (recapHabitSlugs.has(pact.habitSlug)) {
        await markPactDayLogged(pactDoc.id, userId, today);
      }

      // Re-read so we evaluate against the freshly-merged dayStatus
      const refreshed = await getDoc(doc(db, PACTS_COLLECTION, pactDoc.id));
      if (!refreshed.exists()) return;
      const next = { id: pactDoc.id, ...(refreshed.data() as Omit<Pact, 'id'>) };
      const verdict = evaluatePact(next);

      // Mid-window freeze consumption: persist the rescue immediately
      // so subsequent walks see it as "used" and won't try to consume
      // it again. Also fires a notification to both sides — losing a
      // day quietly would be worse UX than telling them they just
      // burned the pact's one safety net.
      if (verdict.kind === 'still-active' && verdict.freezePendingOn) {
        try {
          await updateDoc(doc(db, PACTS_COLLECTION, pactDoc.id), {
            freezeAvailable: false,
            freezeUsedOn: verdict.freezePendingOn,
            freezeUsedBy: verdict.freezePendingBy || null,
          });
          await Promise.all(
            next.participants.map((u) =>
              addDoc(collection(db, `notifications/${u}/items`), {
                type: 'pact_freeze_used',
                message: `Pact freeze used — your one rescue is gone. Don't miss another.`,
                isRead: false,
                relatedId: pactDoc.id,
                actorId: '',
                actorAvatar: '',
                createdAt: Timestamp.now(),
              }),
            ),
          );
        } catch (err) {
          console.error(`Pact freeze persist failed for ${pactDoc.id}`, err);
        }
      }

      if (verdict.kind !== 'still-active') {
        await applyPactResolution(next, verdict);
      }
    }),
  );
}
