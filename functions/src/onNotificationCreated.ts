import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Fires an FCM push when a notification document is created.
 *
 * The Firestore notification doc is always written (in-app bell shows
 * everything). FCM push is gated by user preferences in
 * `users/{uid}.settings.notifications`, mapped via `categoryFor(type)`.
 * Default behavior: missing preferences treated as ON (the existing
 * `?? true` convention in the settings UI).
 *
 * Push payload kept intentionally minimal:
 *   - icon / badge = Outrank app icon (no sender avatar — that's what was
 *     rendering as the big photo on Android)
 *   - no imageUrl / image field at all
 *   - no attachments
 * Sender context stays in the app (bell, feed), not the OS shade.
 */
export const onNotificationCreated = functions.firestore
  .document('notifications/{userId}/items/{notificationId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const notification = snap.data();

    try {
      const userDoc = await db.doc(`users/${userId}`).get();
      const userData = userDoc.data();
      if (!userData?.fcmToken) return;

      // Per-category opt-out — gate the OS push, not the doc write.
      const category = categoryFor(notification.type);
      if (category) {
        const prefs = userData?.settings?.notifications as Record<string, boolean> | undefined;
        if (prefs && prefs[category] === false) return;
      }

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
    case 'friend_recap':
    case 'friend_logged':
      return '/feed';
    case 'pact_invite':
    case 'pact_accepted':
    case 'pact_declined':
    case 'pact_succeeded':
    case 'pact_broken':
    case 'pact_freeze_used':
      return '/pacts';
    case 'friends_league_settled':
      return '/friends-league';
    case 'pillar_reminder':
      return '/dashboard';
    default:
      return '/notifications';
  }
}

/**
 * Map a notification type string to the user-prefs key that gates it.
 * Returns null for types that should always send (no opt-out, e.g. a
 * friend_request because dismissing those is itself an action).
 */
function categoryFor(type: string): string | null {
  switch (type) {
    case 'streak_reminder':
    case 'schedule_reminder':
      return 'streakReminder';
    case 'friend_logged':
    case 'friend_recap':
      return 'friendActivity';
    case 'duel_challenge':
    case 'duel_accepted':
    case 'duel_ended':
      return 'duelUpdates';
    case 'pact_invite':
    case 'pact_accepted':
    case 'pact_declined':
    case 'pact_succeeded':
    case 'pact_broken':
    case 'pact_freeze_used':
      return 'pactUpdates';
    case 'friends_league_settled':
      return 'leagueUpdates';
    case 'pillar_reminder':
      return 'pillarReminders';
    case 'leaderboard_overtaken':
      return 'leaderboardChanges';
    case 'weekly_recap':
      return 'weeklyRecap';
    // Friend graph + system events stay always-on.
    case 'friend_request':
    case 'friend_accepted':
    default:
      return null;
  }
}
