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
exports.onReportCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.onReportCreated = functions.firestore
    .document('reports/{reportId}')
    .onCreate(async (snap) => {
    const report = snap.data();
    const targetId = report.targetId;
    try {
        // Count total reports against this user
        const reportsSnap = await db
            .collection('reports')
            .where('targetId', '==', targetId)
            .where('status', '==', 'pending')
            .get();
        const reportCount = reportsSnap.size;
        // Auto-flag user if reported 3+ times
        if (reportCount >= 3) {
            await db.doc(`users/${targetId}`).update({
                isBanned: true,
            });
            // Write audit log
            await db.collection('auditLogs').add({
                userId: targetId,
                action: 'auto_banned',
                metadata: {
                    reason: `Auto-banned after ${reportCount} reports`,
                    reportId: snap.id,
                },
                timestamp: admin.firestore.Timestamp.now(),
            });
            console.log(`User auto-banned: ${targetId} (${reportCount} reports)`);
        }
        // Write audit log for the report
        await db.collection('auditLogs').add({
            userId: report.reporterId,
            action: 'report_created',
            metadata: {
                targetId,
                reason: report.reason,
                reportId: snap.id,
            },
            timestamp: admin.firestore.Timestamp.now(),
        });
        console.log(`Report created: ${snap.id} against ${targetId}`);
    }
    catch (error) {
        console.error('onReportCreated error:', error);
    }
});
//# sourceMappingURL=onReportCreated.js.map