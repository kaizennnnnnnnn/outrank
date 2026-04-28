import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Friends-League weekly settlement.
 *
 * Runs Monday 00:00 UTC — five minutes BEFORE the existing
 * weeklyLeaderboardReset (which zeros every user's `weeklyXP`). Order
 * matters: we need the live `weeklyXP` values to compute final
 * standings, so we snapshot before the reset.
 *
 * For each active user (FCM token present) with at least three
 * participants whose weeklyXP > 0, we:
 *   1. Read the user's accepted friends.
 *   2. Compute final standings (user + friends) sorted by weeklyXP.
 *   3. Award fragments to the top 3 (50 / 30 / 20).
 *   4. Persist a snapshot at friendsLeagues/{uid}/items/{weekKey}.
 *   5. Notify the user with their result.
 *
 * "Active" = user has logged anything this week (weeklyXP > 0). Users
 * with no activity skip — no point in snapshotting an empty week for
 * them.
 */

const REWARDS = [50, 30, 20] as const;

interface FriendDoc {
  status: string;
}

interface UserDoc {
  username?: string;
  avatarUrl?: string;
  weeklyXP?: number;
  fcmToken?: string;
  fragments?: number;
}

interface SnapEntry {
  userId: string;
  username: string;
  avatarUrl: string;
  score: number;
  rank: number;
  reward: number;
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function isoWeekRangeIso(date: Date): { start: string; end: string } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - (dayNum - 1));
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

export const friendsLeagueSettle = functions.pubsub
  .schedule('0 0 * * 1') // Monday 00:00 UTC
  .timeZone('UTC')
  .onRun(async () => {
    // The "week to settle" is the one that just ended — i.e. yesterday
    // (Sunday) belongs to the closing week, today (Monday) opens the new
    // one. We use yesterday's date for the weekKey.
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const weekKey = isoWeekKey(yesterday);
    const { start: weekStartIso, end: weekEndIso } = isoWeekRangeIso(yesterday);

    // Iterate users with any activity this week. weeklyXP > 0 filter
    // skips inactive accounts and keeps the run cheap.
    const usersSnap = await db.collection('users').where('weeklyXP', '>', 0).get();

    let settledCount = 0;
    let errorCount = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const user = userDoc.data() as UserDoc;
      try {
        // Friends list
        const friendsSnap = await db
          .collection(`friendships/${uid}/friends`)
          .where('status', '==', 'accepted')
          .get();

        if (friendsSnap.empty) continue;
        const friendIds = friendsSnap.docs.map((d) => d.id);

        // Read each friend's user doc in parallel
        const friendDocs = await Promise.all(friendIds.map((id) => db.collection('users').doc(id).get()));

        const myEntry: SnapEntry = {
          userId: uid,
          username: user.username || '',
          avatarUrl: user.avatarUrl || '',
          score: user.weeklyXP || 0,
          rank: 0,
          reward: 0,
        };

        const friendEntries: SnapEntry[] = friendDocs
          .filter((d) => d.exists)
          .map((d) => {
            const data = d.data() as UserDoc;
            return {
              userId: d.id,
              username: data.username || '',
              avatarUrl: data.avatarUrl || '',
              score: data.weeklyXP || 0,
              rank: 0,
              reward: 0,
            };
          });

        const all = [...friendEntries, myEntry].sort(
          (a, b) => b.score - a.score || a.username.localeCompare(b.username),
        );

        // Need >= 3 participants total to settle (the user + 2 friends).
        // Smaller leagues just don't pay out for v1 — no rewards, but we
        // can still snapshot for history if useful. For v1: skip entirely
        // if fewer than 3.
        if (all.length < 3) continue;

        // Assign ranks + rewards
        all.forEach((entry, i) => {
          entry.rank = i + 1;
          entry.reward = i < REWARDS.length ? REWARDS[i] : 0;
        });

        // Cap stored standings at 20 to keep the doc small even for users
        // with huge friend graphs.
        const standings = all.slice(0, 20);
        const me = all.find((e) => e.userId === uid);
        if (!me) continue;

        // Persist the snapshot
        await db.collection(`friendsLeagues/${uid}/items`).doc(weekKey).set({
          weekKey,
          weekStartIso,
          weekEndIso,
          standings,
          myRank: me.rank,
          myScore: me.score,
          myReward: me.reward,
          settledAt: admin.firestore.Timestamp.now(),
        });

        // Award fragments to the user (only if they placed in the top 3).
        // Friend rewards are written on each friend's own settlement run
        // — every user gets their own snapshot from their own POV.
        if (me.reward > 0) {
          await db.collection('users').doc(uid).update({
            fragments: admin.firestore.FieldValue.increment(me.reward),
          });
        }

        // Notify the user. Different copy depending on outcome.
        let message = '';
        if (me.rank === 1) message = `League winner this week — +${me.reward} fragments 👑`;
        else if (me.rank === 2) message = `2nd in your league — +${me.reward} fragments`;
        else if (me.rank === 3) message = `3rd in your league — +${me.reward} fragments`;
        else message = `Friends league closed: you finished #${me.rank}. Aim for top 3 next week.`;

        await db.collection(`notifications/${uid}/items`).add({
          type: 'friends_league_settled',
          message,
          isRead: false,
          relatedId: weekKey,
          actorId: '',
          actorAvatar: '',
          createdAt: admin.firestore.Timestamp.now(),
        });

        settledCount += 1;
      } catch (err) {
        errorCount += 1;
        console.error(`friendsLeagueSettle failed for ${uid}`, err);
      }
    }

    console.log(`friendsLeagueSettle complete: ${settledCount} settled, ${errorCount} errors`);
  });
