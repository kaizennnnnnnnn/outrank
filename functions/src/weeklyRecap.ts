import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Runs every Sunday at 9:00 AM UTC
export const weeklyRecap = functions.pubsub
  .schedule('0 9 * * 0')
  .timeZone('UTC')
  .onRun(async () => {
    try {
      const usersSnap = await db.collection('users').where('isBanned', '==', false).get();

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Get this week's logs
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const logsSnap = await db
          .collection(`logs/${userId}/habitLogs`)
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
          .get();

        const totalLogs = logsSnap.size;
        const totalXPEarned = logsSnap.docs.reduce((sum, d) => sum + (d.data().xpEarned || 0), 0);

        // Get habits for streak info
        const habitsSnap = await db.collection(`habits/${userId}/userHabits`).get();
        let bestStreak = 0;
        let bestStreakHabit = '';

        for (const habitDoc of habitsSnap.docs) {
          const habit = habitDoc.data();
          if (habit.currentStreak > bestStreak) {
            bestStreak = habit.currentStreak;
            bestStreakHabit = habit.categoryName;
          }
        }

        // Build recap message
        let message = `Weekly Recap: You earned ${totalXPEarned} XP from ${totalLogs} logs this week.`;

        if (bestStreak > 0) {
          message += ` Best streak: ${bestStreak}d in ${bestStreakHabit}! 🔥`;
        }

        if (totalXPEarned > (userData.weeklyXP || 0)) {
          message += ' That\'s a personal best! 🎉';
        } else if (totalLogs === 0) {
          message = 'Weekly Recap: No logs this week. Get back on track today! 💪';
        }

        // Create notification
        await db.collection(`notifications/${userId}/items`).add({
          type: 'weekly_recap',
          message,
          isRead: false,
          relatedId: '',
          actorId: 'system',
          actorAvatar: '',
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

      console.log('weeklyRecap completed');
    } catch (error) {
      console.error('weeklyRecap error:', error);
    }
  });
