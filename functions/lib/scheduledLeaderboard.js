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
exports.monthlyLeaderboardReset = exports.weeklyLeaderboardReset = exports.scheduledLeaderboard = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
// Runs every hour — recompute ranks and detect overtakes
exports.scheduledLeaderboard = functions.pubsub
    .schedule('0 * * * *')
    .timeZone('UTC')
    .onRun(async () => {
    try {
        // Get all category slugs from leaderboards
        const categoriesSnap = await db.collection('categories').get();
        const slugs = categoriesSnap.docs.map((d) => d.data().slug);
        for (const slug of slugs) {
            await recomputeRanks(slug, 'weekly');
            await recomputeRanks(slug, 'monthly');
            await recomputeRanks(slug, 'alltime');
        }
        console.log('scheduledLeaderboard completed');
    }
    catch (error) {
        console.error('scheduledLeaderboard error:', error);
    }
});
async function recomputeRanks(categorySlug, period) {
    const leaderboardRef = db.collection(`leaderboards/${categorySlug}/${period}`);
    const entriesSnap = await leaderboardRef.orderBy('score', 'desc').limit(200).get();
    if (entriesSnap.empty)
        return;
    const batch = db.batch();
    let rank = 1;
    for (const entryDoc of entriesSnap.docs) {
        const data = entryDoc.data();
        const oldRank = data.rank || 0;
        const newRank = rank;
        const delta = oldRank > 0 ? oldRank - newRank : 0;
        batch.update(entryDoc.ref, {
            rank: newRank,
            delta,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        // Send "overtaken" notification if someone lost rank
        if (oldRank > 0 && newRank < oldRank && newRank <= 10) {
            // Find who was previously at this rank
            // Only notify if significant change
            if (delta >= 2) {
                await db.collection(`notifications/${data.userId}/items`).add({
                    type: 'leaderboard_overtaken',
                    message: `You climbed to #${newRank} in ${categorySlug} (${period})! ▲${delta} 🏆`,
                    isRead: false,
                    relatedId: categorySlug,
                    actorId: 'system',
                    actorAvatar: '',
                    createdAt: admin.firestore.Timestamp.now(),
                });
            }
        }
        rank++;
    }
    await batch.commit();
}
// Weekly leaderboard reset — runs every Monday at 00:05 UTC
exports.weeklyLeaderboardReset = functions.pubsub
    .schedule('5 0 * * 1')
    .timeZone('UTC')
    .onRun(async () => {
    try {
        const categoriesSnap = await db.collection('categories').get();
        for (const catDoc of categoriesSnap.docs) {
            const slug = catDoc.data().slug;
            const weeklyRef = db.collection(`leaderboards/${slug}/weekly`);
            const entries = await weeklyRef.get();
            const batch = db.batch();
            for (const entry of entries.docs) {
                batch.update(entry.ref, { score: 0, rank: 0, delta: 0 });
            }
            await batch.commit();
        }
        // Reset weekly XP on all users
        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        for (const userDoc of usersSnap.docs) {
            batch.update(userDoc.ref, { weeklyXP: 0 });
        }
        await batch.commit();
        console.log('Weekly leaderboard reset completed');
    }
    catch (error) {
        console.error('weeklyLeaderboardReset error:', error);
    }
});
// Monthly leaderboard reset — runs 1st of each month at 00:10 UTC
exports.monthlyLeaderboardReset = functions.pubsub
    .schedule('10 0 1 * *')
    .timeZone('UTC')
    .onRun(async () => {
    try {
        const categoriesSnap = await db.collection('categories').get();
        for (const catDoc of categoriesSnap.docs) {
            const slug = catDoc.data().slug;
            const monthlyRef = db.collection(`leaderboards/${slug}/monthly`);
            const entries = await monthlyRef.get();
            const batch = db.batch();
            for (const entry of entries.docs) {
                batch.update(entry.ref, { score: 0, rank: 0, delta: 0 });
            }
            await batch.commit();
        }
        // Reset monthly XP on all users
        const usersSnap = await db.collection('users').get();
        const batch = db.batch();
        for (const userDoc of usersSnap.docs) {
            batch.update(userDoc.ref, { monthlyXP: 0 });
        }
        await batch.commit();
        console.log('Monthly leaderboard reset completed');
    }
    catch (error) {
        console.error('monthlyLeaderboardReset error:', error);
    }
});
//# sourceMappingURL=scheduledLeaderboard.js.map