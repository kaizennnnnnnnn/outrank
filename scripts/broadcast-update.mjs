/**
 * One-off admin script: send a "big update" announcement to every
 * user. Writes a notification doc into `notifications/{uid}/items`
 * for each user — onNotificationCreated picks it up and fans out
 * to FCM, so users who have a token get a push too.
 *
 * Default message announces a major update + invites them to come
 * back and check it out. Override with --message="..." if needed.
 *
 * HOW TO RUN (from the levelup/ directory)
 *   1. Make sure service-account.json is in place (same one used
 *      for reset-inventory.mjs):
 *        Firebase Console → Project Settings → Service Accounts →
 *        "Generate new private key" → save as levelup/service-account.json
 *
 *   2. Run:
 *        node scripts/broadcast-update.mjs
 *      Custom message:
 *        node scripts/broadcast-update.mjs --message="Some text"
 *      Preview without writing:
 *        node scripts/broadcast-update.mjs --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const messageArg = args.find((a) => a.startsWith('--message='));
const DEFAULT_MESSAGE =
  'Big update just shipped — new tailored plans, history calendar, and more. Open Outrank to see what changed.';
const message = messageArg ? messageArg.slice('--message='.length) : DEFAULT_MESSAGE;

// ─── Firebase init ───────────────────────────────────────────────────────────
const keyPath = resolve(__dirname, '..', 'service-account.json');
if (!existsSync(keyPath)) {
  console.error(`Missing ${keyPath}.`);
  console.error('Create one in Firebase Console → Project Settings → Service Accounts → Generate new private key.');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf-8'))) });
const db = getFirestore();

// ─── Run ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Broadcast: ${dryRun ? '[DRY RUN] ' : ''}"${message}"`);

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users.`);

  let queued = 0;
  let written = 0;
  // Firestore batches max out at 500 ops; chunk the writes.
  const CHUNK = 400;
  let batch = db.batch();
  let inBatch = 0;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const ref = db.collection(`notifications/${uid}/items`).doc();
    if (!dryRun) {
      batch.set(ref, {
        type: 'admin_announcement',
        message,
        isRead: false,
        relatedId: '',
        actorId: '',
        actorAvatar: '',
        createdAt: Timestamp.now(),
      });
      inBatch += 1;
      if (inBatch >= CHUNK) {
        await batch.commit();
        written += inBatch;
        console.log(`  committed ${written}/${usersSnap.size}`);
        batch = db.batch();
        inBatch = 0;
      }
    }
    queued += 1;
  }

  if (!dryRun && inBatch > 0) {
    await batch.commit();
    written += inBatch;
  }

  console.log(`Done. Queued ${queued} notification${queued === 1 ? '' : 's'}, wrote ${written}.`);
  if (dryRun) {
    console.log('(dry run — nothing was actually written)');
  } else {
    console.log('FCM fan-out runs server-side via onNotificationCreated.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
