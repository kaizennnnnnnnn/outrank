import { db } from './firebase';
import {
  doc,
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  increment,
  arrayUnion,
  runTransaction,
} from 'firebase/firestore';
import {
  Tournament,
  TournamentParticipant,
  TournamentMatch,
  Competition,
  CompetitionParticipant,
} from '@/types/competition';
import { awardBadge } from './badges';

/**
 * Tournament orchestration — create, accept/decline invites, advance
 * rounds, crown the champion. All state lives on `tournaments/{id}`
 * (bracket structure) with each match shadowed as a normal
 * `competitions/{id}` doc (`type: 'tournament'`, `tournamentId` set)
 * so the existing duel HUD + mid-duel pushes work for free.
 *
 * MVP scope: 4-player single elimination, two rounds (R1 = 2 semis,
 * R2 = final). Round duration is one of 3 / 7 / 14 days, picked at
 * creation. Random seeding. Decline = whole tournament cancels.
 *
 * Round advancement is client-side: `advanceTournament()` runs every
 * time someone opens the tournament page. It uses transactions for the
 * write-once moments (R2 creation, champion crowning) so two concurrent
 * page loads can't duplicate work.
 */

export type RoundDuration = 3 | 7 | 14;

export interface TournamentRewardTier {
  fragments: number;
  xp: number;
  /** Granted-only cosmetics that unlock on the champion's user doc when
   *  they win. One frame + one name effect per tier. */
  cosmeticIds: string[];
  /** Human-readable cosmetic tier for UI copy (e.g., "Bronze"). */
  cosmeticLabel: 'Bronze' | 'Silver' | 'Gold';
}

/** Tiered champion reward — scales with how grueling the tournament is. */
export function rewardForDuration(days: RoundDuration): TournamentRewardTier {
  if (days === 3) {
    return {
      fragments: 2500,
      xp: 250,
      cosmeticIds: ['frame_champion_bronze', 'name_champion_bronze'],
      cosmeticLabel: 'Bronze',
    };
  }
  if (days === 7) {
    return {
      fragments: 5000,
      xp: 500,
      cosmeticIds: ['frame_champion_silver', 'name_champion_silver'],
      cosmeticLabel: 'Silver',
    };
  }
  return {
    fragments: 10000,
    xp: 1000,
    cosmeticIds: ['frame_champion_gold', 'name_champion_gold'],
    cosmeticLabel: 'Gold',
  };
}

/** Compact "X days" label for UI + notification copy. */
export function durationLabel(days: RoundDuration): string {
  return `${days}-day`;
}

// ─── Creation ──────────────────────────────────────────────────────────────

export interface CreateTournamentInput {
  creator: { uid: string; username: string; avatarUrl: string };
  invitees: Array<{ uid: string; username: string; avatarUrl: string }>;
  categoryId: string;
  categorySlug: string;
  title: string;
  durationDaysPerRound: RoundDuration;
}

/**
 * Creates a recruiting-status tournament + writes `tournament_invite`
 * notifications to each invitee. Returns the new tournament's id.
 *
 * Constraints (enforced here, not in firestore.rules):
 *   - Exactly 3 invitees (4-player bracket).
 *   - No duplicate uids.
 *   - Creator can't invite themselves.
 */
export async function createTournament(input: CreateTournamentInput): Promise<string> {
  if (input.invitees.length !== 3) {
    throw new Error('Tournaments require exactly 3 invited friends.');
  }
  const allIds = [input.creator.uid, ...input.invitees.map((i) => i.uid)];
  const unique = new Set(allIds);
  if (unique.size !== allIds.length) {
    throw new Error('Duplicate participants are not allowed.');
  }
  if (input.invitees.some((i) => i.uid === input.creator.uid)) {
    throw new Error('You cannot invite yourself.');
  }

  const participants: TournamentParticipant[] = [
    {
      userId: input.creator.uid,
      username: input.creator.username,
      avatarUrl: input.creator.avatarUrl,
      accepted: true,
      eliminated: false,
      seed: 0,
    },
    ...input.invitees.map((inv) => ({
      userId: inv.uid,
      username: inv.username,
      avatarUrl: inv.avatarUrl,
      accepted: false,
      eliminated: false,
      seed: 0,
    })),
  ];

  const tournamentDoc: Tournament = {
    creatorId: input.creator.uid,
    title: input.title,
    categoryId: input.categoryId,
    categorySlug: input.categorySlug,
    participants,
    matches: [],
    durationDaysPerRound: input.durationDaysPerRound,
    status: 'recruiting',
    createdAt: Timestamp.now(),
  };
  const ref = await addDoc(collection(db, 'tournaments'), tournamentDoc);

  // Notify invitees. Same pattern as duel_challenge — write a notif doc
  // per recipient; onNotificationCreated fans out via FCM.
  for (const inv of input.invitees) {
    try {
      await addDoc(collection(db, `notifications/${inv.uid}/items`), {
        type: 'tournament_invite',
        message: `${input.creator.username} invited you to a ${durationLabel(input.durationDaysPerRound)} ${input.categorySlug} tournament.`,
        isRead: false,
        relatedId: ref.id,
        actorId: input.creator.uid,
        actorAvatar: input.creator.avatarUrl,
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('Tournament invite notif failed:', err);
    }
  }

  return ref.id;
}

// ─── Accept / Decline ──────────────────────────────────────────────────────

/**
 * Marks the calling user as accepted. If all four are now accepted,
 * transitions to active and seeds R1. Transactional so two concurrent
 * acceptances can't both trigger the start sequence twice.
 */
export async function acceptTournamentInvite(tournamentId: string, userId: string): Promise<{ started: boolean }> {
  const ref = doc(db, 'tournaments', tournamentId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Tournament not found.');
    const t = snap.data() as Tournament;
    if (t.status !== 'recruiting') {
      return { started: false };
    }
    const idx = t.participants.findIndex((p) => p.userId === userId);
    if (idx < 0) throw new Error('You are not invited to this tournament.');
    if (t.participants[idx].accepted) {
      return { started: false };
    }
    const updatedParticipants = t.participants.map((p, i) =>
      i === idx ? { ...p, accepted: true } : p,
    );
    const allAccepted = updatedParticipants.every((p) => p.accepted);
    if (allAccepted) {
      // Seed bracket + build R1 matches inside the same transaction so
      // we can't end up with status=active and no matches.
      const seeded = seedParticipants(updatedParticipants);
      tx.update(ref, {
        participants: seeded,
        status: 'active',
        startedAt: Timestamp.now(),
      });
    } else {
      tx.update(ref, { participants: updatedParticipants });
    }
    return { started: allAccepted };
  });
}

/**
 * Decline = the tournament cancels for everyone. Sets status to
 * 'cancelled' and notifies the other 3 participants so they know not
 * to wait. Idempotent — re-decline is a no-op.
 */
export async function declineTournamentInvite(tournamentId: string, decliner: { uid: string; username: string }): Promise<void> {
  const ref = doc(db, 'tournaments', tournamentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Tournament not found.');
  const t = snap.data() as Tournament;
  if (t.status !== 'recruiting') return;
  await setDoc(ref, { status: 'cancelled' }, { merge: true });
  for (const p of t.participants) {
    if (p.userId === decliner.uid) continue;
    try {
      await addDoc(collection(db, `notifications/${p.userId}/items`), {
        type: 'tournament_invite',
        message: `${decliner.username} declined — the ${t.categorySlug} tournament was cancelled.`,
        isRead: false,
        relatedId: tournamentId,
        actorId: decliner.uid,
        actorAvatar: '',
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('Tournament cancel notif failed:', err);
    }
  }
}

// ─── Seeding ───────────────────────────────────────────────────────────────

/**
 * Random shuffle, then assign seeds 1..4 in shuffled order.
 * Bracket pairs are seed 1 vs 4 (semi A) and seed 2 vs 3 (semi B).
 */
function seedParticipants(participants: TournamentParticipant[]): TournamentParticipant[] {
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((p, i) => ({ ...p, seed: i + 1 }));
}

// ─── Round advancement ────────────────────────────────────────────────────

/**
 * Called from the tournament detail page on every load. Side-effects:
 *   - If status === 'active' and R1 matches don't exist yet, creates
 *     them (post-acceptance hand-off path).
 *   - If R1 is complete and R2 isn't created, creates the final.
 *   - If R2 is complete, crowns the champion and grants rewards.
 * All write-once moments use transactions to dedupe concurrent visitors.
 */
export async function advanceTournament(tournamentId: string): Promise<void> {
  // Phase 1: bootstrap R1 if status=active but no matches yet. This can
  // happen if the acceptance transaction flipped status but the page
  // load is the first opportunity to create the underlying competitions
  // (which can't be done inside a runTransaction — they're separate docs).
  await ensureR1Matches(tournamentId);

  // Phase 2: read latest state + maybe create R2 or crown champion.
  const tRef = doc(db, 'tournaments', tournamentId);
  const tSnap = await getDoc(tRef);
  if (!tSnap.exists()) return;
  const t = { id: tSnap.id, ...(tSnap.data() as Tournament) };
  if (t.status !== 'active') return;

  // Resolve match winners by reading the competition docs.
  const matchWinners = await resolveMatchWinners(t);
  const r1Matches = matchWinners.filter((m) => m.roundNumber === 1);
  const r2Matches = matchWinners.filter((m) => m.roundNumber === 2);

  const r1Decided = r1Matches.length === 2 && r1Matches.every((m) => m.winnerUserId);
  if (r1Decided && r2Matches.length === 0) {
    await createR2(t, r1Matches);
    return;
  }
  const r2Decided = r2Matches.length === 1 && r2Matches[0].winnerUserId;
  if (r2Decided) {
    await crownChampion(t, r2Matches[0].winnerUserId as string);
  }
}

/**
 * Ensures the two R1 `competitions/{id}` docs exist. Idempotent: if
 * matches already accounted for, no-op. Doesn't use a transaction
 * because creating a competition is multi-doc; instead checks the
 * tournament's matches array length under a transactional read.
 */
async function ensureR1Matches(tournamentId: string): Promise<void> {
  const tRef = doc(db, 'tournaments', tournamentId);
  const tSnap = await getDoc(tRef);
  if (!tSnap.exists()) return;
  const t = tSnap.data() as Tournament;
  if (t.status !== 'active') return;
  if (t.matches.length >= 2) return; // R1 already created

  // Find pairings: seed 1 vs 4 (semi A), seed 2 vs 3 (semi B).
  const bySeed = new Map<number, TournamentParticipant>();
  for (const p of t.participants) bySeed.set(p.seed, p);
  const semiA = [bySeed.get(1), bySeed.get(4)] as [TournamentParticipant, TournamentParticipant];
  const semiB = [bySeed.get(2), bySeed.get(3)] as [TournamentParticipant, TournamentParticipant];
  if (!semiA[0] || !semiA[1] || !semiB[0] || !semiB[1]) return;

  const matchA = await createTournamentMatch(t, tournamentId, semiA, 1);
  const matchB = await createTournamentMatch(t, tournamentId, semiB, 1);

  await setDoc(tRef, { matches: [matchA, matchB] }, { merge: true });

  // Notify all four participants that R1 has started. Skip the actor's
  // own write since they likely just hit Accept and are watching the page.
  for (const p of t.participants) {
    try {
      await addDoc(collection(db, `notifications/${p.userId}/items`), {
        type: 'tournament_starting',
        message: `Your ${t.categorySlug} tournament is live — round 1 starts now.`,
        isRead: false,
        relatedId: tournamentId,
        actorId: t.creatorId,
        actorAvatar: '',
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('tournament_starting notif failed:', err);
    }
  }
}

async function createTournamentMatch(
  t: Tournament,
  tournamentId: string,
  pair: [TournamentParticipant, TournamentParticipant],
  roundNumber: 1 | 2,
): Promise<TournamentMatch> {
  const now = Timestamp.now();
  const endMs = now.toMillis() + t.durationDaysPerRound * 24 * 60 * 60 * 1000;
  const end = Timestamp.fromMillis(endMs);
  const matchParticipants: CompetitionParticipant[] = pair.map((p, i) => ({
    userId: p.userId,
    username: p.username,
    avatarUrl: p.avatarUrl,
    score: 0,
    rank: i + 1,
  }));
  const competition: Competition = {
    type: 'tournament',
    categoryId: t.categoryId,
    categorySlug: t.categorySlug,
    title: `${pair[0].username} vs ${pair[1].username}`,
    creatorId: t.creatorId,
    tournamentId,
    startDate: now,
    endDate: end,
    durationDays: t.durationDaysPerRound,
    status: 'active',
    participants: matchParticipants,
  };
  const ref = await addDoc(collection(db, 'competitions'), competition);
  return {
    competitionId: ref.id,
    roundNumber,
    slot1UserId: pair[0].userId,
    slot2UserId: pair[1].userId,
    winnerUserId: null,
  };
}

/**
 * Reads each match's underlying competition doc, computes the winner
 * if decided, and returns a fresh matches array. A match is decided
 * when status=completed (someone claimed) OR endDate has passed.
 * Ties are broken by the first participant in the array (stable).
 */
async function resolveMatchWinners(t: Tournament): Promise<TournamentMatch[]> {
  const out: TournamentMatch[] = [];
  for (const m of t.matches) {
    if (m.winnerUserId) {
      out.push(m);
      continue;
    }
    const cSnap = await getDoc(doc(db, 'competitions', m.competitionId));
    if (!cSnap.exists()) {
      out.push(m);
      continue;
    }
    const c = cSnap.data() as Competition;
    const ended = c.status === 'completed' || c.endDate.toMillis() <= Date.now();
    if (!ended) {
      out.push(m);
      continue;
    }
    const p1 = c.participants.find((p) => p.userId === m.slot1UserId);
    const p2 = c.participants.find((p) => p.userId === m.slot2UserId);
    if (!p1 || !p2) {
      out.push(m);
      continue;
    }
    const winnerUserId = p1.score >= p2.score ? p1.userId : p2.userId;
    out.push({ ...m, winnerUserId });
  }
  return out;
}

async function createR2(t: Tournament, r1Matches: TournamentMatch[]): Promise<void> {
  const tRef = doc(db, 'tournaments', t.id as string);

  // Transactional check so two concurrent visitors don't both create R2.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tRef);
    if (!snap.exists()) throw new Error('Tournament vanished.');
    const fresh = snap.data() as Tournament;
    if (fresh.matches.some((m) => m.roundNumber === 2)) return; // already created

    const winnerA = t.participants.find((p) => p.userId === r1Matches[0].winnerUserId);
    const winnerB = t.participants.find((p) => p.userId === r1Matches[1].winnerUserId);
    if (!winnerA || !winnerB) return;

    // Mark losers eliminated for the bracket UI.
    const eliminatedIds = new Set(
      r1Matches.flatMap((m) =>
        [m.slot1UserId, m.slot2UserId].filter((id) => id && id !== m.winnerUserId),
      ),
    );
    const updatedParticipants = fresh.participants.map((p) =>
      eliminatedIds.has(p.userId) ? { ...p, eliminated: true } : p,
    );
    // Persist R1 winners on the existing match entries so we don't
    // recompute them on every page load.
    const updatedMatches: TournamentMatch[] = fresh.matches.map((m, i) =>
      i < r1Matches.length ? { ...m, winnerUserId: r1Matches[i].winnerUserId } : m,
    );

    tx.update(tRef, {
      participants: updatedParticipants,
      matches: updatedMatches,
    });
  });

  // R2 competition can't be created inside the transaction (different
  // collection), so create it outside, then merge it into matches.
  const winnerA = t.participants.find((p) => p.userId === r1Matches[0].winnerUserId);
  const winnerB = t.participants.find((p) => p.userId === r1Matches[1].winnerUserId);
  if (!winnerA || !winnerB) return;
  const finalMatch = await createTournamentMatch(t, t.id as string, [winnerA, winnerB], 2);
  await setDoc(tRef, { matches: arrayUnion(finalMatch) }, { merge: true });

  // Notify the two finalists.
  for (const p of [winnerA, winnerB]) {
    try {
      await addDoc(collection(db, `notifications/${p.userId}/items`), {
        type: 'tournament_starting',
        message: `You're in the final of the ${t.categorySlug} tournament — go.`,
        isRead: false,
        relatedId: t.id as string,
        actorId: t.creatorId,
        actorAvatar: '',
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('tournament final notif failed:', err);
    }
  }
}

async function crownChampion(t: Tournament, championId: string): Promise<void> {
  const tRef = doc(db, 'tournaments', t.id as string);
  const reward = rewardForDuration(t.durationDaysPerRound);

  // Transactional flip from active to completed so only the first
  // page-load to land here grants the reward.
  const wasFirst = await runTransaction(db, async (tx) => {
    const snap = await tx.get(tRef);
    if (!snap.exists()) return false;
    const fresh = snap.data() as Tournament;
    if (fresh.status !== 'active') return false;

    const eliminatedIds = new Set(
      fresh.participants.filter((p) => p.userId !== championId).map((p) => p.userId),
    );
    const updatedParticipants = fresh.participants.map((p) =>
      eliminatedIds.has(p.userId) ? { ...p, eliminated: true } : p,
    );

    tx.update(tRef, {
      status: 'completed',
      championId,
      completedAt: Timestamp.now(),
      participants: updatedParticipants,
    });
    return true;
  });
  if (!wasFirst) return;

  // Grant champion reward — fragments + XP + the tournament wins counter
  // (which feeds the existing grand-champion at 3 wins) + the tiered
  // cosmetics for this duration (bronze/silver/gold). arrayUnion is
  // idempotent so a re-issued reward grant won't duplicate cosmetics.
  try {
    await setDoc(
      doc(db, 'users', championId),
      {
        fragments: increment(reward.fragments),
        totalXP: increment(reward.xp),
        weeklyXP: increment(reward.xp),
        monthlyXP: increment(reward.xp),
        seasonPassXP: increment(reward.xp),
        tournamentWins: increment(1),
        ownedCosmetics: arrayUnion(...reward.cosmeticIds),
      },
      { merge: true },
    );
  } catch (err) {
    console.error('Champion reward grant failed:', err);
  }

  // Badges — award tournament-champion always; grand-champion fires
  // when this is the 3rd tournament win. We compute the new total by
  // reading the user doc back (post-increment, eventual consistency
  // is fine here since duplicates are dropped by awardBadge).
  try {
    await awardBadge(championId, 'tournament-champion');
    const userSnap = await getDoc(doc(db, 'users', championId));
    const winsAfter = ((userSnap.data() || {}).tournamentWins as number) || 0;
    if (winsAfter >= 3) {
      await awardBadge(championId, 'grand-champion');
    }
  } catch (err) {
    console.error('Champion badge award failed:', err);
  }

  // Feed fan-out to the champion's friends so the win shows publicly.
  const champion = t.participants.find((p) => p.userId === championId);
  if (!champion) return;
  const feedItem = {
    type: 'tournament_completed',
    actorId: championId,
    actorUsername: champion.username,
    actorAvatar: champion.avatarUrl,
    categorySlug: t.categorySlug,
    message: `${champion.username} won the ${durationLabel(t.durationDaysPerRound)} ${t.categorySlug} tournament.`,
    reactions: {},
    createdAt: Timestamp.now(),
  };
  try {
    await addDoc(collection(db, `feed/${championId}/items`), feedItem);
    const friends = await getDocs(
      query(
        collection(db, `friendships/${championId}/friends`),
        where('status', '==', 'accepted'),
      ),
    );
    for (const f of friends.docs) {
      await addDoc(collection(db, `feed/${f.id}/items`), feedItem);
    }
  } catch (err) {
    console.error('Tournament feed fan-out failed:', err);
  }
}
