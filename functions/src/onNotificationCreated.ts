import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Fires an FCM push when a notification document is created.
// Push payload kept intentionally minimal:
//   - icon / badge = Outrank app icon (no sender avatar — that's what was
//     rendering as the big photo on Android)
//   - no imageUrl / image field at all
//   - no attachments
// Sender context stays in the app (bell, feed), not the OS shade.
export const onNotificationCreated = functions.firestore
  .document('notifications/{userId}/items/{notificationId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const notification = snap.data();

    try {
      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      if (!userData?.fcmToken) return;

      const appIcon = 'https://outrank-ten.vercel.app/icon-192.png';

      const message: admin.messaging.Message = {
        token: userData.fcmToken,
        // Keep title/body on the FCM level so OS-level delivery works
        notification: {
          title: 'Outrank',
          body: notification.message || 'You have a new notification',
        },
        data: {
          type: notification.type || 'general',
          relatedId: notification.relatedId || '',
          actorId: notification.actorId || '',
        },
        android: {
          notification: {
            icon: 'ic_stat_outrank',
            color: '#dc2626',
            channelId: 'outrank-default',
            priority: 'high',
            defaultVibrateTimings: true,
            // No imageUrl here on purpose
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: appIcon,
            badge: appIcon,
            vibrate: [200, 100, 200],
            // Explicitly drop any image
            requireInteraction: false,
            silent: false,
          },
          fcmOptions: { link: getNotificationLink(notification.type) },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        await db.doc(`users/${userId}`).update({ fcmToken: '' });
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
    case 'schedule_reminder':
      return '/schedule';
    default:
      return '/notifications';
  }
}
