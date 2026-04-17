import * as functions from 'firebase-functions';
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

      // Only fire at the top of the hour (0-1 minute window).
      if (local.minute > 1) continue;

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

      for (const entryDoc of entriesSnap.docs) {
        const entry = entryDoc.data();
        // Idempotency: skip if we already fired for this date
        if (entry.lastFiredDateKey === local.dateKey) continue;

        try {
          await entryDoc.ref.update({ lastFiredDateKey: local.dateKey });
          await db.collection(`notifications/${userId}/items`).add({
            type: 'schedule_reminder',
            message: `Time for ${entry.habitName || 'your habit'} — let's go`,
            isRead: false,
            relatedId: entry.habitSlug || '',
            actorId: '',
            actorAvatar: '',
            createdAt: admin.firestore.Timestamp.now(),
          });
        } catch (err) {
          console.error(`fire schedule failed for ${userId}/${entryDoc.id}`, err);
        }
      }
    }
  });
