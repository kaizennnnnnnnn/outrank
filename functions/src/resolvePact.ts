import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Pact resolution moves to the server because the client can't write to
 * the OTHER participant's user doc / userBadges / notifications under
 * the standard rules. Admin SDK bypasses rules, so this function can
 * pay both sides atomically and consistently.
 *
 * Tightened pact rule blocks client-side status transitions to
 * succeeded/broken — clients call THIS function instead. Mid-window
 * cell updates (markPactDayLogged) and freeze persistence still
 * happen client-side as before.
 *
 * Replicates evaluatePact() from `lib/pacts.ts` — keep the two in sync
 * if either changes. Logic is intentionally simple state-machine code,
 * not a shared module, because pulling shared modules into Cloud
 * Functions adds bundling complexity for little win here.
 */

const PACT_REWARDS: Record<number, { xp: number; fragments: number; cosmeticId?: string }> = {
  7: { xp: 200, fragments: 100 },
  14: { xp: 450, fragments: 225 },
  30: { xp: 1200, fragments: 600, cosmeticId: 'frame_pact_holder' },
};

const PACT_BREAK_PENALTY_FRAGMENTS = 50;

const BADGE_XP: Record<string, number> = {
  'pact-pioneer': 50,
  'pact-trio': 100,
  'pact-veteran': 100,
};

interface PactDoc {
  participants: [string, string];
  participantsMeta: Record<string, { username: string; avatarUrl: string }>;
  initiatorId: string;
  habitSlug: string;
  habitName: string;
  habitColor: string;
  cadence: 'daily';
  durationDays: 7 | 14 | 30;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'succeeded' | 'broken' | 'declined';
  dayStatus: Record<string, Record<string, 'logged' | 'pending'>>;
  freezeAvailable?: boolean;
  freezeUsedOn?: string | null;
  freezeUsedBy?: string | null;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pactDateKeys(startKey: string, days: number): string[] {
  const [y, m, d] = startKey.split('-').map(Number);
  const keys: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(y, m - 1, d + i);
    keys.push(localDateKey(date));
  }
  return keys;
}

type EvalResult =
  | { kind: 'still-active'; freezePendingOn?: string; freezePendingBy?: string }
  | { kind: 'broken'; brokenBy: string; brokenOn: string }
  | { kind: 'succeeded'; freezeUsedOn?: string; freezeUsedBy?: string };

function evaluate(pact: PactDoc): EvalResult {
  if (pact.status !== 'active') return { kind: 'still-active' };

  const today = localDateKey(new Date());
  const dateKeys = pactDateKeys(pact.startDate, pact.durationDays);
  const freezeAvailable = pact.freezeAvailable !== false && !pact.freezeUsedOn;

  let anyPendingInOpenWindow = false;
  let freezePendingOn: string | null = null;
  let freezePendingBy: string | null = null;

  for (const key of dateKeys) {
    const cell = pact.dayStatus[key];
    if (!cell) continue;
    if (pact.freezeUsedOn === key) continue;

    const aLogged = cell[pact.participants[0]] === 'logged';
    const bLogged = cell[pact.participants[1]] === 'logged';
    const isPast = key < today;

    if (!aLogged || !bLogged) {
      if (isPast) {
        const blame = !aLogged ? pact.participants[0] : pact.participants[1];
        if (freezeAvailable && !freezePendingOn) {
          freezePendingOn = key;
          freezePendingBy = blame;
          continue;
        }
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
 * Idempotent badge grant — sets the earned doc and increments XP only
 * if the user doesn't already have it. Mirrors awardBadge from
 * lib/badges.ts.
 */
async function tryAwardBadge(uid: string, badgeId: string): Promise<void> {
  const xp = BADGE_XP[badgeId];
  if (xp === undefined) return;
  const ref = db.collection(`userBadges/${uid}/earned`).doc(badgeId);
  const exists = await ref.get();
  if (exists.exists) return;
  await ref.set({ badgeId, earnedAt: admin.firestore.Timestamp.now() });
  await db.collection('users').doc(uid).update({
    totalXP: admin.firestore.FieldValue.increment(xp),
    weeklyXP: admin.firestore.FieldValue.increment(xp),
    monthlyXP: admin.firestore.FieldValue.increment(xp),
  });
}

interface ResolveData {
  pactId?: unknown;
}

export const resolvePact = functions.https.onCall(async (data: ResolveData, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }
  const pactId = typeof data.pactId === 'string' ? data.pactId : '';
  if (!pactId) {
    throw new functions.https.HttpsError('invalid-argument', 'pactId required');
  }

  const ref = db.collection('pacts').doc(pactId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Pact not found');
  }
  const pact = snap.data() as PactDoc;
  if (!pact.participants.includes(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant');
  }

  // Already resolved — idempotent.
  if (pact.status !== 'active') {
    return { kind: 'still-active', already: pact.status };
  }

  const verdict = evaluate(pact);

  // ----- Mid-window freeze persistence -----
  if (verdict.kind === 'still-active') {
    if (verdict.freezePendingOn && pact.freezeAvailable !== false && !pact.freezeUsedOn) {
      await ref.update({
        freezeAvailable: false,
        freezeUsedOn: verdict.freezePendingOn,
        freezeUsedBy: verdict.freezePendingBy || null,
      });
      // Notify both
      await Promise.all(
        pact.participants.map((u) =>
          db.collection(`notifications/${u}/items`).add({
            type: 'pact_freeze_used',
            message: 'Pact freeze used — your one rescue is gone. Don\'t miss another.',
            isRead: false,
            relatedId: pactId,
            actorId: '',
            actorAvatar: '',
            createdAt: admin.firestore.Timestamp.now(),
          }),
        ),
      );
    }
    return { kind: 'still-active' };
  }

  // ----- Resolution -----
  if (verdict.kind === 'succeeded') {
    const reward = PACT_REWARDS[pact.durationDays] || PACT_REWARDS[7];
    const update: Record<string, unknown> = {
      status: 'succeeded',
      resolvedAt: admin.firestore.Timestamp.now(),
    };
    if (verdict.freezeUsedOn && !pact.freezeUsedOn) {
      update.freezeAvailable = false;
      update.freezeUsedOn = verdict.freezeUsedOn;
      update.freezeUsedBy = verdict.freezeUsedBy || null;
    }
    await ref.update(update);

    for (const uid of pact.participants) {
      const userUpdate: Record<string, unknown> = {
        totalXP: admin.firestore.FieldValue.increment(reward.xp),
        weeklyXP: admin.firestore.FieldValue.increment(reward.xp),
        monthlyXP: admin.firestore.FieldValue.increment(reward.xp),
        fragments: admin.firestore.FieldValue.increment(reward.fragments),
        pactsWon: admin.firestore.FieldValue.increment(1),
      };
      if (reward.cosmeticId) {
        userUpdate.ownedCosmetics = admin.firestore.FieldValue.arrayUnion(reward.cosmeticId);
      }
      await db.collection('users').doc(uid).update(userUpdate);

      const cosmeticLine = reward.cosmeticId ? ' · "Pact Holder" frame unlocked' : '';
      await db.collection(`notifications/${uid}/items`).add({
        type: 'pact_succeeded',
        message: `Pact complete · +${reward.xp} XP · +${reward.fragments} fragments${cosmeticLine}`,
        isRead: false,
        relatedId: pactId,
        actorId: '',
        actorAvatar: '',
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Threshold badges: pact-pioneer (1), pact-trio (3) by pactsWon counter,
      // pact-veteran by 30-day duration.
      try {
        const userSnap = await db.collection('users').doc(uid).get();
        const wins = (userSnap.data()?.pactsWon as number) || 0;
        if (wins >= 1) await tryAwardBadge(uid, 'pact-pioneer');
        if (wins >= 3) await tryAwardBadge(uid, 'pact-trio');
        if (pact.durationDays === 30) await tryAwardBadge(uid, 'pact-veteran');
      } catch (err) {
        console.error(`pact badge grant failed for ${uid}`, err);
      }
    }
    return { kind: 'succeeded' };
  }

  // broken
  await ref.update({
    status: 'broken',
    brokenBy: verdict.brokenBy,
    brokenAt: admin.firestore.Timestamp.now(),
    resolvedAt: admin.firestore.Timestamp.now(),
  });
  for (const uid of pact.participants) {
    await db.collection('users').doc(uid).update({
      fragments: admin.firestore.FieldValue.increment(-PACT_BREAK_PENALTY_FRAGMENTS),
    });
    await db.collection(`notifications/${uid}/items`).add({
      type: 'pact_broken',
      message: `Pact broken — both sides lost ${PACT_BREAK_PENALTY_FRAGMENTS} fragments.`,
      isRead: false,
      relatedId: pactId,
      actorId: verdict.brokenBy,
      actorAvatar: pact.participantsMeta[verdict.brokenBy]?.avatarUrl || '',
      createdAt: admin.firestore.Timestamp.now(),
    });
  }
  return { kind: 'broken', brokenBy: verdict.brokenBy };
});
