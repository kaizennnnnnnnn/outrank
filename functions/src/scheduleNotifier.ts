import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Maps short weekday name -> our dayOfWeek convention (Mon=0, Sun=6)
const WEEKDAY_MAP: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

interface LocalTime { dayOfWeek: number; hour: number; minute: number; dateKey: string; }

/** Convert a UTC Date to a local time descriptor in the given IANA timezone. */
function toLocalTime(date: Date, timezone: string): LocalTime | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;

    const weekday = map.weekday;
    const hour = parseInt(map.hour || '0', 10) % 24;
    const minute = parseInt(map.minute || '0', 10);
    const dayOfWeek = WEEKDAY_MAP[weekday] ?? 0;
    const dateKey = `${map.year}-${map.month}-${map.day}`;
    return { dayOfWeek, hour, minute, dateKey };
  } catch {
    return null;
  }
}

// Runs every minute. For each user at local minute 0, fires any scheduled
// habit reminders for the current (dayOfWeek, hour). Each entry stores
// lastFiredDateKey so we don't double-fire if the cron overlaps.
export const scheduleNotifier = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = new Date();

    // Pull users that actually have a token (so we don't iterate everyone).
    const usersSnap = await db.collection('users').where('fcmToken', '!=', '').get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const tz = (user.timezone as string) || 'UTC';
      const local = toLocalTime(now, tz);
      if (!local) continue;

      // Fire within the first 5 minutes of the hour. The cron itself only
      // runs every minute, so this widens forgiveness for cold starts and
      // slow queries without risking duplicate delivery (lastFiredDateKey).
      if (local.minute > 4) continue;

      // Query this user's entries for the current (dayOfWeek, hour)
      const userId = userDoc.id;
      let entriesSnap;
      try {
        entriesSnap = await db
          .collection(`scheduleEntries/${userId}/items`)
          .where('dayOfWeek', '==', local.dayOfWeek)
          .where('hour', '==', local.hour)
          .get();
      } catch (err) {
        console.error(`schedule query failed for ${userId}`, err);
        continue;
      }

      // Collect all entries for this hour that haven't fired today, and
      // send ONE consolidated notification covering all of them. Marking
      // each entry's lastFiredDateKey is still per-entry so the
      // idempotency guarantee holds even if a future fire moves an entry
      // to a different hour mid-day.
      const dueEntries: { name: string; doc: typeof entriesSnap.docs[number] }[] = [];
      for (const entryDoc of entriesSnap.docs) {
        const entry = entryDoc.data();
        if (entry.lastFiredDateKey === local.dateKey) continue;
        dueEntries.push({
          name: entry.habitName || 'your habit',
          doc: entryDoc,
        });
      }

      if (dueEntries.length === 0) continue;

      // Stamp idempotency keys first so the digest can fail without
      // double-firing on the next minute's cron.
      try {
        const stampBatch = db.batch();
        for (const { doc } of dueEntries) {
          stampBatch.update(doc.ref, { lastFiredDateKey: local.dateKey });
        }
        await stampBatch.commit();
      } catch (err) {
        console.error(`fire schedule stamp failed for ${userId}`, err);
        continue;
      }

      // Compose one message. Singular for one habit, name-list for two
      // or three, count + first three for more.
      const names = dueEntries.map((e) => e.name);
      let message: string;
      if (names.length === 1) {
        message = `Time for ${names[0]} — let's go.`;
      } else if (names.length <= 3) {
        message = `Time for ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`;
      } else {
        const head = names.slice(0, 3).join(', ');
        message = `Time for ${names.length} habits — ${head} and ${names.length - 3} more.`;
      }

      try {
        await db.collection(`notifications/${userId}/items`).add({
          type: 'schedule_reminder',
          message,
          isRead: false,
          relatedId: '',
          actorId: '',
          actorAvatar: '',
          createdAt: admin.firestore.Timestamp.now(),
        });
      } catch (err) {
        console.error(`fire schedule notify failed for ${userId}`, err);
      }
    }
  });
