import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Runs every day at midnight UTC
export const scheduledStreaks = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get all users
      const usersSnap = await db.collection('users').where('isBanned', '==', false).get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;

        // Get all habits for this user
        const habitsSnap = await db.collection(`habits/${userId}/userHabits`).get();

        for (const habitDoc of habitsSnap.docs) {
          const habit = habitDoc.data();

          if (!habit.lastLogDate || habit.currentStreak === 0) continue;

          const lastLog = habit.lastLogDate.toDate();
          lastLog.setHours(0, 0, 0, 0);

          // If last log was before yesterday, streak is broken
          if (lastLog.getTime() < yesterday.getTime()) {
            const userData = userDoc.data();

            // Check if user has streak freeze tokens
            if (userData.streakFreezeTokens > 0) {
              // Consume a freeze token
              await db.doc(`users/${userId}`).update({
                streakFreezeTokens: admin.firestore.FieldValue.increment(-1),
              });

              // Notify user that freeze was used
              await db.collection(`notifications/${userId}/items`).add({
                type: 'streak_at_risk',
                message: `Streak freeze used for ${habit.categoryName}! You have ${userData.streakFreezeTokens - 1} left. ❄️`,
                isRead: false,
                relatedId: habitDoc.id,
                actorId: 'system',
                actorAvatar: '',
                createdAt: admin.firestore.Timestamp.now(),
              });

              console.log(`Streak freeze used: ${userId}/${habitDoc.id}`);
            } else {
              // Break the streak
              const oldStreak = habit.currentStreak;
              await habitDoc.ref.update({ currentStreak: 0 });

              // Notify user
              await db.collection(`notifications/${userId}/items`).add({
                type: 'streak_broken',
                message: `Your ${oldStreak}-day streak in ${habit.categoryName} ended. Start again today! 💪`,
                isRead: false,
                relatedId: habitDoc.id,
                actorId: 'system',
                actorAvatar: '',
                createdAt: admin.firestore.Timestamp.now(),
              });

              console.log(`Streak broken: ${userId}/${habitDoc.id} (was ${oldStreak})`);
            }
          }
        }
      }

      // Refill streak freeze tokens weekly (every Monday)
      if (today.getDay() === 1) {
        const allUsers = await db.collection('users').get();
        const batch = db.batch();
        let count = 0;

        for (const userDoc of allUsers.docs) {
          const data = userDoc.data();
          if (data.streakFreezeTokens < 3) {
            batch.update(userDoc.ref, {
              streakFreezeTokens: Math.min((data.streakFreezeTokens || 0) + 1, 3),
            });
            count++;
          }

          // Batch limit
          if (count >= 400) {
            await batch.commit();
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

// Runs every day at 8PM UTC — "streak at risk" reminder
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

        for (const habitDoc of habitsSnap.docs) {
          const habit = habitDoc.data();
          if (habit.currentStreak === 0) continue;

          const lastLog = habit.lastLogDate?.toDate();
          if (!lastLog) continue;

          lastLog.setHours(0, 0, 0, 0);

          // If not logged today, send reminder
          if (lastLog.getTime() < today.getTime()) {
            await db.collection(`notifications/${userId}/items`).add({
              type: 'streak_at_risk',
              message: `Your ${habit.currentStreak}-day streak in ${habit.categoryName} is at risk! Log now to keep it alive. ⚠️`,
              isRead: false,
              relatedId: habitDoc.id,
              actorId: 'system',
              actorAvatar: '',
              createdAt: admin.firestore.Timestamp.now(),
            });
          }
        }
      }

      console.log('streakReminder completed');
    } catch (error) {
      console.error('streakReminder error:', error);
    }
  });
