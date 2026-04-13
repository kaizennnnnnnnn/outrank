import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const onReportCreated = functions.firestore
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
    } catch (error) {
      console.error('onReportCreated error:', error);
    }
  });
