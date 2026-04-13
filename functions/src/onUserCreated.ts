import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const { userId } = context.params;
    const user = snap.data();

    try {
      // 1. Write audit log
      await db.collection('auditLogs').add({
        userId,
        action: 'user_created',
        metadata: {
          username: user.username,
          email: user.email,
        },
        timestamp: admin.firestore.Timestamp.now(),
      });

      // 2. Create welcome notification
      await db.collection(`notifications/${userId}/items`).add({
        type: 'level_up',
        message: 'Welcome to LevelUp! Start by choosing your habits and challenging friends. ⚡',
        isRead: false,
        relatedId: '',
        actorId: 'system',
        actorAvatar: '',
        createdAt: admin.firestore.Timestamp.now(),
      });

      // 3. Award "Newcomer" badge once they complete onboarding
      // This will be triggered separately when onboarding is completed

      console.log(`User created: ${userId} (${user.username})`);
    } catch (error) {
      console.error('onUserCreated error:', error);
    }
  });
