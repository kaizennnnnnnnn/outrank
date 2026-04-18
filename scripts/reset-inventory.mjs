/**
 * One-off admin script: resets fragments + cosmetic inventory for every user
 * EXCEPT the user specified by --spare-username (default: "jovan").
 *
 * WHAT IT DOES
 *   For every other user, it unsets/clears these fields only:
 *     - fragments            → 0
 *     - ownedCosmetics       → []
 *     - equippedFrame        → FieldValue.delete()
 *     - equippedNameEffect   → FieldValue.delete()
 *     - orbBaseColor         → FieldValue.delete()
 *     - orbPulseColor        → FieldValue.delete()
 *     - orbRingColor         → FieldValue.delete()
 *
 *   Nothing else is touched — habits, streaks, XP, level, username, avatar,
 *   friends, feed, badges, etc. all remain intact.
 *
 * HOW TO RUN (from the levelup/ directory)
 *   1. Download a Firebase Admin SDK service account key:
 *        Firebase Console → Project Settings → Service Accounts →
 *        "Generate new private key" → save as levelup/service-account.json
 *      (This file is gitignored below — do NOT commit it.)
 *
 *   2. Run:
 *        node scripts/reset-inventory.mjs
 *      or specify a different username to spare:
 *        node scripts/reset-inventory.mjs --spare-username=someoneelse
 *      add --dry-run to preview without writing:
 *        node scripts/reset-inventory.mjs --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPARE = 'jovan';

function parseArgs() {
  const args = { spareUsername: DEFAULT_SPARE, dryRun: false };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--spare-username=')) args.spareUsername = a.split('=')[1];
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function main() {
  const { spareUsername, dryRun } = parseArgs();

  const keyPath = resolve(__dirname, '..', 'service-account.json');
  if (!existsSync(keyPath)) {
    console.error('\n❌ Missing service-account.json at:', keyPath);
    console.error('   Download it from Firebase Console → Project Settings → Service Accounts,');
    console.error('   save as levelup/service-account.json, then re-run.\n');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  console.log(`\n🔎 Looking up spared user: username="${spareUsername}"`);
  const snap = await db.collection('users').where('username', '==', spareUsername).get();
  if (snap.empty) {
    console.error(`❌ No user found with username "${spareUsername}". Aborting.`);
    process.exit(1);
  }
  if (snap.size > 1) {
    console.error(`❌ Found ${snap.size} users with username "${spareUsername}" — ambiguous. Aborting.`);
    snap.docs.forEach(d => console.error('   - uid:', d.id));
    process.exit(1);
  }
  const spareUid = snap.docs[0].id;
  console.log(`✓ Spared UID: ${spareUid} (@${spareUsername})`);

  console.log('\n📋 Fetching all users…');
  const allUsers = await db.collection('users').get();
  console.log(`   Total users: ${allUsers.size}`);

  const targets = allUsers.docs.filter(d => d.id !== spareUid);
  console.log(`   To reset:    ${targets.length}`);
  if (dryRun) console.log('   (dry-run — no writes will be made)');

  const resetPayload = {
    fragments: 0,
    ownedCosmetics: [],
    equippedFrame: FieldValue.delete(),
    equippedNameEffect: FieldValue.delete(),
    orbBaseColor: FieldValue.delete(),
    orbPulseColor: FieldValue.delete(),
    orbRingColor: FieldValue.delete(),
  };

  // Batch in chunks of 400 (Firestore batch limit is 500, stay safe).
  const CHUNK = 400;
  let done = 0;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK);
    if (dryRun) {
      slice.forEach(d => console.log(`   [dry] would reset ${d.id} (@${d.data().username || '?'})`));
      done += slice.length;
      continue;
    }
    const batch = db.batch();
    slice.forEach(d => batch.update(d.ref, resetPayload));
    await batch.commit();
    done += slice.length;
    console.log(`   … ${done}/${targets.length}`);
  }

  console.log(`\n✅ Done. Reset ${done} user(s). Spared @${spareUsername} (${spareUid}).`);
}

main().catch(err => {
  console.error('\n❌ Script failed:', err);
  process.exit(1);
});
