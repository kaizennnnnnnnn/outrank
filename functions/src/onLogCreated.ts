import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const XP_LOG = 10;
const XP_STREAK_7 = 25;
const XP_STREAK_30 = 100;
const XP_STREAK_100 = 250;

export const onLogCreated = functions.firestore
  .document('logs/{userId}/habitLogs/{logId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const log = snap.data();
    const habitId = log.habitId;
    const categorySlug = log.categorySlug;
    const value = log.value;

    try {
      // 1. RATE LIMITING: Check if user already logged this habit in last 23 hours
      const recentLogs = await db
        .collection(`logs/${userId}/habitLogs`)
        .where('habitId', '==', habitId)
        .orderBy('createdAt', 'desc')
        .limit(2)
        .get();

      if (recentLogs.docs.length > 1) {
        const previousLog = recentLogs.docs[1].data();
        const hoursSinceLast =
          (Date.now() - previousLog.createdAt.toDate().getTime()) / 1000 / 60 / 60;
        if (hoursSinceLast < 23) {
          // Delete the log and reject
          await snap.ref.delete();
          console.warn(`Rate limit: ${userId} logged ${habitId} too soon (${hoursSinceLast.toFixed(1)}h)`);
          return;
        }
      }

      // 2. ANOMALY DETECTION: Flag if value > 5x user's average
      const allLogs = await db
        .collection(`logs/${userId}/habitLogs`)
        .where('habitId', '==', habitId)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      if (allLogs.docs.length > 5) {
        const values = allLogs.docs.slice(1).map((d) => d.data().value as number);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (value > avg * 5) {
          console.warn(`Anomaly detected: ${userId} logged ${value} for ${habitId} (avg: ${avg.toFixed(1)})`);
          // Could create a report here for admin review
        }
      }

      // 3. UPDATE STREAK
      const habitRef = db.doc(`habits/${userId}/userHabits/${habitId}`);
      const habitSnap = await habitRef.get();

      if (!habitSnap.exists) return;
      const habit = habitSnap.data()!;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = 1;
      if (habit.lastLogDate) {
        const lastLog = habit.lastLogDate.toDate();
        lastLog.setHours(0, 0, 0, 0);

        if (lastLog.getTime() === yesterday.getTime()) {
          // Consecutive day — extend streak
          newStreak = (habit.currentStreak || 0) + 1;
        } else if (lastLog.getTime() === today.getTime()) {
          // Already logged today — keep current streak
          newStreak = habit.currentStreak || 1;
        }
        // Otherwise streak resets to 1
      }

      const longestStreak = Math.max(newStreak, habit.longestStreak || 0);

      await habitRef.update({
        currentStreak: newStreak,
        longestStreak,
        totalLogs: admin.firestore.FieldValue.increment(1),
        lastLogDate: admin.firestore.Timestamp.now(),
      });

      // 4. CALCULATE XP
      let totalXP = XP_LOG;

      // Streak bonus
      if (newStreak === 7) totalXP += XP_STREAK_7;
      if (newStreak === 30) totalXP += XP_STREAK_30;
      if (newStreak === 100) totalXP += XP_STREAK_100;

      // Update XP on log document
      await snap.ref.update({ xpEarned: totalXP });

      // 5. UPDATE USER XP & LEVEL
      const userRef = db.doc(`users/${userId}`);
      await userRef.update({
        totalXP: admin.firestore.FieldValue.increment(totalXP),
        weeklyXP: admin.firestore.FieldValue.increment(totalXP),
        monthlyXP: admin.firestore.FieldValue.increment(totalXP),
        lastActiveAt: admin.firestore.Timestamp.now(),
      });

      // Recalculate level
      const userSnap = await userRef.get();
      const userData = userSnap.data();
      if (userData) {
        const newLevel = calculateLevel(userData.totalXP);
        const oldLevel = userData.level || 1;

        if (newLevel.level > oldLevel) {
          await userRef.update({
            level: newLevel.level,
            currentTitle: newLevel.title,
          });

          // Level up notification
          await createNotification(userId, {
            type: 'level_up',
            message: `You reached Level ${newLevel.level} — ${newLevel.title}! 🎉`,
            relatedId: '',
            actorId: userId,
            actorAvatar: userData.avatarUrl || '',
          });

          // Level up feed item
          await createFeedItem(userId, userData, {
            type: 'levelup',
            message: `reached Level ${newLevel.level} — ${newLevel.title}!`,
          });
        }
      }

      // 6. UPDATE LEADERBOARD
      const userDataFresh = (await userRef.get()).data();
      if (userDataFresh) {
        const leaderboardData = {
          userId,
          username: userDataFresh.username,
          avatarUrl: userDataFresh.avatarUrl || '',
          score: admin.firestore.FieldValue.increment(value),
          delta: 0,
          updatedAt: admin.firestore.Timestamp.now(),
        };

        // Weekly leaderboard
        await db.doc(`leaderboards/${categorySlug}/weekly/${userId}`).set(leaderboardData, { merge: true });
        // Monthly leaderboard
        await db.doc(`leaderboards/${categorySlug}/monthly/${userId}`).set(leaderboardData, { merge: true });
        // All-time leaderboard
        await db.doc(`leaderboards/${categorySlug}/alltime/${userId}`).set(leaderboardData, { merge: true });
      }

      // 7. CREATE FEED ITEM
      if (userDataFresh) {
        const categoryIcon = habit.categoryIcon || '';
        const categoryName = habit.categoryName || categorySlug;

        await createFeedItem(userId, userDataFresh, {
          type: 'log',
          categoryName,
          categoryIcon,
          value,
          message: `logged ${value} ${habit.unit || ''} of ${categoryName}`,
        });

        // Streak milestone feed items
        if (newStreak === 7 || newStreak === 30 || newStreak === 100) {
          await createFeedItem(userId, userDataFresh, {
            type: 'streak_milestone',
            categoryName,
            categoryIcon,
            message: `hit a ${newStreak}-day streak in ${categoryName}! 🔥`,
          });
        }
      }

      // 8. CHECK BADGES
      await checkBadges(userId, habitId, newStreak, habit);

      console.log(`Log processed: ${userId}/${habitId} — +${totalXP} XP, streak: ${newStreak}`);
    } catch (error) {
      console.error('onLogCreated error:', error);
    }
  });

// Helper: Calculate level from XP
function calculateLevel(xp: number): { level: number; title: string } {
  const levels = [
    { level: 1, title: 'Rookie', xp: 0 },
    { level: 5, title: 'Grinder', xp: 500 },
    { level: 10, title: 'Contender', xp: 1200 },
    { level: 15, title: 'Rival', xp: 2100 },
    { level: 20, title: 'Warrior', xp: 3200 },
    { level: 25, title: 'Veteran', xp: 4500 },
    { level: 30, title: 'Champion', xp: 6000 },
    { level: 35, title: 'Elite', xp: 7700 },
    { level: 40, title: 'Master', xp: 9600 },
    { level: 45, title: 'Grandmaster', xp: 11700 },
    { level: 50, title: 'Legend', xp: 14000 },
    { level: 60, title: 'Mythic', xp: 19500 },
    { level: 70, title: 'Immortal', xp: 26000 },
    { level: 80, title: 'Ascended', xp: 33500 },
    { level: 90, title: 'Transcendent', xp: 42000 },
    { level: 100, title: 'The GOAT', xp: 52000 },
  ];

  let result = levels[0];
  for (const l of levels) {
    if (xp >= l.xp) result = l;
    else break;
  }
  return { level: result.level, title: result.title };
}

// Helper: Create notification
async function createNotification(
  userId: string,
  data: { type: string; message: string; relatedId: string; actorId: string; actorAvatar: string }
) {
  await db.collection(`notifications/${userId}/items`).add({
    ...data,
    isRead: false,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// Helper: Create feed item for all friends
async function createFeedItem(
  userId: string,
  userData: FirebaseFirestore.DocumentData,
  itemData: {
    type: string;
    categoryName?: string;
    categoryIcon?: string;
    value?: number;
    message: string;
  }
) {
  const feedItem = {
    type: itemData.type,
    actorId: userId,
    actorUsername: userData.username,
    actorAvatar: userData.avatarUrl || '',
    categoryName: itemData.categoryName || '',
    categoryIcon: itemData.categoryIcon || '',
    value: itemData.value || 0,
    message: `${userData.username} ${itemData.message}`,
    reactions: {},
    createdAt: admin.firestore.Timestamp.now(),
  };

  // Add to user's own feed
  await db.collection(`feed/${userId}/items`).add(feedItem);

  // Add to all friends' feeds
  const friendsSnap = await db
    .collection(`friendships/${userId}/friends`)
    .where('status', '==', 'accepted')
    .get();

  const batch = db.batch();
  for (const friendDoc of friendsSnap.docs) {
    const friendFeedRef = db.collection(`feed/${friendDoc.id}/items`).doc();
    batch.set(friendFeedRef, feedItem);
  }
  await batch.commit();
}

// Helper: Check and award badges
async function checkBadges(userId: string, habitId: string, streak: number, habit: FirebaseFirestore.DocumentData) {
  const earnedRef = db.collection(`userBadges/${userId}/earned`);

  const awardBadge = async (badgeId: string, xpReward: number) => {
    const exists = await earnedRef.doc(badgeId).get();
    if (exists.exists) return;

    await earnedRef.doc(badgeId).set({
      badgeId,
      earnedAt: admin.firestore.Timestamp.now(),
    });

    // Award XP
    await db.doc(`users/${userId}`).update({
      totalXP: admin.firestore.FieldValue.increment(xpReward),
    });

    // Notification
    await createNotification(userId, {
      type: 'badge_earned',
      message: `You earned the badge! 🎖️`,
      relatedId: badgeId,
      actorId: userId,
      actorAvatar: '',
    });
  };

  // First log ever
  if (habit.totalLogs === 0) {
    await awardBadge('first-steps', 20);
  }

  // Streak badges
  if (streak >= 7) await awardBadge('on-fire', 50);
  if (streak >= 30) await awardBadge('unstoppable', 100);
  if (streak >= 100) await awardBadge('centurion', 250);

  // Total logs badges
  const totalLogs = (habit.totalLogs || 0) + 1;
  if (totalLogs >= 100) await awardBadge('century', 50);

  // Category-specific badges
  if (habitId === 'books' && totalLogs >= 10) await awardBadge('bookworm', 50);
  if (habitId === 'gym' && streak >= 7) await awardBadge('iron-week', 50);
  if (habitId === 'cold-shower' && totalLogs >= 10) await awardBadge('cold-warrior', 100);
  if (habitId === 'alcohol-free' && totalLogs >= 30) await awardBadge('sober', 100);
  if (habitId === 'early-wake' && streak >= 14) await awardBadge('5am-club', 100);
}
