import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Runs every day at midnight UTC. Streaks that weren't extended yesterday
// either consume a freeze token or break. We batch all per-user actions
// into a SINGLE consolidated notification so the user doesn't get
// blasted with one message per affected habit.
export const scheduledStreaks = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const usersSnap = await db.collection('users').where('isBanned', '==', false).get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const habitsSnap = await db.collection(`habits/${userId}/userHabits`).get();

        // Collect, don't notify per-habit. We send one digest at the end.
        const broken: { name: string; days: number }[] = [];
        const frozen: { name: string }[] = [];
        let freezesLeft = (userDoc.data().streakFreezeTokens as number) || 0;

        for (const habitDoc of habitsSnap.docs) {
          const habit = habitDoc.data();
          if (!habit.lastLogDate || habit.currentStreak === 0) continue;

          const lastLog = habit.lastLogDate.toDate();
          lastLog.setHours(0, 0, 0, 0);

          if (lastLog.getTime() < yesterday.getTime()) {
            if (freezesLeft > 0) {
              freezesLeft -= 1;
              await db.doc(`users/${userId}`).update({
                streakFreezeTokens: admin.firestore.FieldValue.increment(-1),
              });
              frozen.push({ name: habit.categoryName });
              console.log(`Streak freeze used: ${userId}/${habitDoc.id}`);
            } else {
              const oldStreak = habit.currentStreak;
              await habitDoc.ref.update({ currentStreak: 0 });
              broken.push({ name: habit.categoryName, days: oldStreak });
              console.log(`Streak broken: ${userId}/${habitDoc.id} (was ${oldStreak})`);
            }
          }
        }

        // Single consolidated notification.
        if (broken.length > 0 || frozen.length > 0) {
          const message = composeStreakDigest(broken, frozen, freezesLeft);
          await db.collection(`notifications/${userId}/items`).add({
            type: broken.length > 0 ? 'streak_broken' : 'streak_at_risk',
            message,
            isRead: false,
            relatedId: '',
            actorId: 'system',
            actorAvatar: '',
            createdAt: admin.firestore.Timestamp.now(),
          });
        }
      }

      // Refill streak freeze tokens weekly (every Monday)
      if (today.getDay() === 1) {
        const allUsers = await db.collection('users').get();
        let batch = db.batch();
        let count = 0;

        for (const userDoc of allUsers.docs) {
          const data = userDoc.data();
          if (data.streakFreezeTokens < 3) {
            batch.update(userDoc.ref, {
              streakFreezeTokens: Math.min((data.streakFreezeTokens || 0) + 1, 3),
            });
            count++;
          }

          if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }

        if (count > 0) await batch.commit();
        console.log('Weekly streak freeze tokens refilled');
      }

      console.log('scheduledStreaks completed');
    } catch (error) {
      console.error('scheduledStreaks error:', error);
    }
  });

/**
 * Build one message that covers everything that happened to this user's
 * streaks last night. Order: broken first (the bad news), frozen second,
 * with the remaining freeze count tagged on if any freezes consumed.
 */
function composeStreakDigest(
  broken: { name: string; days: number }[],
  frozen: { name: string }[],
  freezesLeft: number,
): string {
  const parts: string[] = [];

  if (broken.length === 1) {
    parts.push(`Your ${broken[0].days}-day ${broken[0].name} streak ended.`);
  } else if (broken.length > 1) {
    parts.push(`${broken.length} streaks ended overnight.`);
  }

  if (frozen.length === 1) {
    parts.push(
      `${frozen[0].name} streak saved with a freeze (${freezesLeft} left).`,
    );
  } else if (frozen.length > 1) {
    parts.push(
      `${frozen.length} streaks saved with freezes (${freezesLeft} left).`,
    );
  }

  return parts.join(' ') || 'Streak update';
}

// Runs every day at 8PM UTC — "streak at risk" reminder. Sends ONE
// consolidated notification per user instead of one per habit.
export const streakReminder = functions.pubsub
  .schedule('0 20 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usersSnap = await db.collection('users')
        .where('isBanned', '==', false)
        .where('settings.notifications.streakReminder', '==', true)
        .get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const habitsSnap = await db.collection(`habits/${userId}/userHabits`).get();

        // Gather every streak that's at risk for this user.
        const atRisk: { name: string; days: number }[] = [];

        for (const habitDoc of habitsSnap.docs) {
          const habit = habitDoc.data();
          if (habit.currentStreak === 0) continue;

          const lastLog = habit.lastLogDate?.toDate();
          if (!lastLog) continue;
          lastLog.setHours(0, 0, 0, 0);

          if (lastLog.getTime() < today.getTime()) {
            atRisk.push({
              name: habit.categoryName,
              days: habit.currentStreak,
            });
          }
        }

        if (atRisk.length === 0) continue;

        // Single message. Singular if one habit, plural otherwise.
        let message: string;
        if (atRisk.length === 1) {
          message = `Your streak is in danger — ${atRisk[0].days}-day ${atRisk[0].name}. Log it before midnight.`;
        } else {
          // Cap the listed names so the FCM body doesn't get truncated.
          const names = atRisk.map((h) => h.name).slice(0, 3).join(', ');
          const more = atRisk.length > 3 ? ` and ${atRisk.length - 3} more` : '';
          message = `Your ${atRisk.length} streaks are in danger — ${names}${more}. Log them before midnight.`;
        }

        await db.collection(`notifications/${userId}/items`).add({
          type: 'streak_at_risk',
          message,
          isRead: false,
          relatedId: '',
          actorId: 'system',
          actorAvatar: '',
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

      console.log('streakReminder completed');
    } catch (error) {
      console.error('streakReminder error:', error);
    }
  });
