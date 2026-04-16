import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// When a notification document is created, send a real FCM push notification
export const onNotificationCreated = functions.firestore
  .document('notifications/{userId}/items/{notificationId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const notification = snap.data();

    try {
      // Get the user's FCM token
      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();

      if (!userData?.fcmToken) {
        console.log(`No FCM token for user ${userId}, skipping push`);
        return;
      }

      // Get sender's avatar if available
      let senderAvatar = '';
      if (notification.actorId) {
        try {
          const actorDoc = await db.doc(`users/${notification.actorId}`).get();
          const actorData = actorDoc.data();
          if (actorData?.avatarUrl) senderAvatar = actorData.avatarUrl;
        } catch { /* ignore */ }
      }

      const message: admin.messaging.Message = {
        token: userData.fcmToken,
        notification: {
          title: 'Outrank',
          body: notification.message || 'You have a new notification',
          imageUrl: senderAvatar || undefined,
        },
        data: {
          type: notification.type || 'general',
          relatedId: notification.relatedId || '',
          actorId: notification.actorId || '',
        },
        webpush: {
          notification: {
            icon: senderAvatar || 'https://outrank-ten.vercel.app/icon-192.png',
            badge: 'https://outrank-ten.vercel.app/icon-192.png',
            vibrate: [200, 100, 200],
          },
          fcmOptions: {
            link: getNotificationLink(notification.type),
          },
        },
      };

      await admin.messaging().send(message);
      console.log(`Push sent to ${userId}: ${notification.message}`);
    } catch (error: unknown) {
      const err = error as { code?: string };
      // If token is invalid, remove it
      if (err.code === 'messaging/invalid-registration-token' ||
          err.code === 'messaging/registration-token-not-registered') {
        await db.doc(`users/${userId}`).update({ fcmToken: '' });
        console.log(`Removed invalid FCM token for ${userId}`);
      } else {
        console.error(`Push failed for ${userId}:`, error);
      }
    }
  });

function getNotificationLink(type: string): string {
  switch (type) {
    case 'duel_challenge':
    case 'duel_accepted':
    case 'duel_ended':
      return '/compete';
    case 'friend_request':
    case 'friend_accepted':
      return '/friends';
    case 'leaderboard_overtaken':
      return '/leaderboard';
    default:
      return '/notifications';
  }
}
