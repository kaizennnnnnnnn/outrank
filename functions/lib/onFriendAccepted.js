"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onFriendAccepted = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onFriendAccepted = functions.firestore
    .document('friendships/{userId}/friends/{friendId}')
    .onUpdate(async (change, context) => {
    const { userId, friendId } = context.params;
    const before = change.before.data();
    const after = change.after.data();
    // Only trigger when status changes to 'accepted'
    if (before.status === 'accepted' || after.status !== 'accepted')
        return;
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
    }
    catch (error) {
        console.error('onFriendAccepted error:', error);
    }
});
//# sourceMappingURL=onFriendAccepted.js.map