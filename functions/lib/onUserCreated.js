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
exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onUserCreated = functions.firestore
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
    }
    catch (error) {
        console.error('onUserCreated error:', error);
    }
});
//# sourceMappingURL=onUserCreated.js.map