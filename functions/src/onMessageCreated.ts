import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Fires an FCM push when a DM is created. Title = sender's username,
// body = the message preview (the recipient can read what was sent
// straight from the OS notification shade). Tapping deep-links into
// /messages/{senderId}.
export const onMessageCreated = functions.firestore
  .document('messages/{threadId}/items/{messageId}')
  .onCreate(async (snap, context) => {
    const msg = snap.data() as {
      senderId?: string;
      content?: string;
      participants?: string[];
    };
    const senderId = msg.senderId;
    const content = msg.content || '';
    const participants = msg.participants || [];
    const recipientId = participants.find((p) => p !== senderId);

    if (!senderId || !recipientId) return;

    try {
      const [recipientSnap, senderSnap] = await Promise.all([
        db.doc(`users/${recipientId}`).get(),
        db.doc(`users/${senderId}`).get(),
      ]);

      const recipient = recipientSnap.data();
      const sender = senderSnap.data();
      if (!recipient?.fcmToken || !sender) return;

      const senderName = (sender.username as string) || 'Someone';
      const preview =
        content.length > 140 ? content.slice(0, 137) + '...' : content;
      const deepLink = `/messages/${senderId}`;
      const appIcon = 'https://outrank-ten.vercel.app/icon-192.png';
      const tag = `msg_${senderId}`;

      const message: admin.messaging.Message = {
        token: recipient.fcmToken as string,
        notification: {
          title: senderName,
          body: preview || 'Sent you a message',
        },
        data: {
          type: 'message',
          senderId,
          threadId: context.params.threadId,
        },
        android: {
          notification: {
            icon: 'ic_stat_outrank',
            color: '#ec4899',
            channelId: 'outrank-default',
            priority: 'high',
            defaultVibrateTimings: true,
            tag,
          },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            icon: appIcon,
            badge: appIcon,
            tag,
            renotify: true,
            vibrate: [200, 100, 200],
            requireInteraction: false,
          },
          fcmOptions: { link: deepLink },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'thread-id': tag,
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
        await db.doc(`users/${recipientId}`).update({ fcmToken: '' });
      } else {
        console.error(`Message push failed for ${recipientId}:`, error);
      }
    }
  });
