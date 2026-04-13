import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onFriendAccepted = functions.firestore
  .document('friendships/{userId}/friends/{friendId}')
  .onUpdate(async (change, context) => {
    const { userId, friendId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'accepted'
    if (before.status === 'accepted' || after.status !== 'accepted') return;

    try {
      // 1. Update friend counts for both users
      await db.doc(`users/${userId}`).update({
        friendCount: admin.firestore.FieldValue.increment(1),
      });
      await db.doc(`users/${friendId}`).update({
        friendCount: admin.firestore.FieldValue.increment(1),
      });

      // 2. Notify the user who sent the request
      const acceptorSnap = await db.doc(`users/${userId}`).get();
      const acceptor = acceptorSnap.data();

      if (acceptor) {
        // Determine who sent the request based on direction
        const targetId = after.direction === 'received' ? friendId : userId;
        const actorName = after.direction === 'received' ? acceptor.username : '';

        await db.collection(`notifications/${targetId}/items`).add({
          type: 'friend_accepted',
          message: `${actorName || 'Someone'} accepted your friend request! 🤝`,
          isRead: false,
          relatedId: userId,
          actorId: userId,
          actorAvatar: acceptor.avatarUrl || '',
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

      // 3. Check "Social" badge (first friend)
      const userSnap = await db.doc(`users/${userId}`).get();
      const userData = userSnap.data();
      if (userData && userData.friendCount === 1) {
        const badgeRef = db.doc(`userBadges/${userId}/earned/social`);
        const badgeSnap = await badgeRef.get();
        if (!badgeSnap.exists) {
          await badgeRef.set({
            badgeId: 'social',
            earnedAt: admin.firestore.Timestamp.now(),
          });
          await db.doc(`users/${userId}`).update({
            totalXP: admin.firestore.FieldValue.increment(20),
          });
        }
      }

      // 4. Check "Social Butterfly" badge (10+ friends)
      if (userData && userData.friendCount >= 10) {
        const badgeRef = db.doc(`userBadges/${userId}/earned/social-butterfly`);
        const badgeSnap = await badgeRef.get();
        if (!badgeSnap.exists) {
          await badgeRef.set({
            badgeId: 'social-butterfly',
            earnedAt: admin.firestore.Timestamp.now(),
          });
          await db.doc(`users/${userId}`).update({
            totalXP: admin.firestore.FieldValue.increment(50),
          });
        }
      }

      console.log(`Friendship accepted: ${userId} <-> ${friendId}`);
    } catch (error) {
      console.error('onFriendAccepted error:', error);
    }
  });
