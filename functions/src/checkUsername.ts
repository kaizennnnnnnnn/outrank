import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const checkUsername = functions.https.onCall(async (data) => {
  const username = (data.username || '').toLowerCase().trim();

  if (!username || username.length < 3 || username.length > 20) {
    return { available: false, error: 'Username must be 3-20 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { available: false, error: 'Only letters, numbers, and underscores' };
  }

  const docSnap = await db.doc(`usernames/${username}`).get();
  return { available: !docSnap.exists };
});
