import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Pillar reminder fan-out. Runs every 15 minutes:
 *
 *   • **Water**: every ~90 minutes inside the user's waking window
 *     (default 08:00–21:00). Pushes a soft reminder so the user
 *     remembers to log a glass.
 *
 *   • **Sleep wind-down**: a single push 30 minutes before the user's
 *     chosen bedtime (default 23:00). Idempotent per local-date.
 *
 * Reads sensible defaults from the user doc's `pillarSettings` field
 * (see types/user.ts). All fields optional — if the doc has nothing,
 * defaults apply. Set `pillarSettings.disabled = true` to fully opt
 * out without losing other preferences.
 *
 * Idempotency:
 *   • Water: stores `pillarSettings.waterLastFiredAt` (unix ms). Next
 *     fire is gated on `now - lastFired >= cadence`.
 *   • Sleep: stores `pillarSettings.sleepReminderLastFiredDate`
 *     (YYYY-MM-DD in user's local TZ). One per day, max.
 *
 * Notifications go to `notifications/{uid}/items` like every other
 * push channel — `onNotificationCreated` fans them out to FCM.
 */

const DEFAULTS = {
  waterEnabled: true,
  waterWakeAt: '08:00',
  waterSleepAt: '21:00',
  waterCadenceMinutes: 90,
  sleepReminderEnabled: true,
  sleepBedtimeAt: '23:00',
  sleepWindDownMinutes: 30,
};

interface LocalSnap {
  hour: number;
  minute: number;
  dateKey: string;       // YYYY-MM-DD in user's local TZ
  totalMinutes: number;  // hour*60 + minute
}

function toLocal(date: Date, tz: string): LocalSnap | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const hour = parseInt(m.hour || '0', 10) % 24;
    const minute = parseInt(m.minute || '0', 10);
    return {
      hour,
      minute,
      dateKey: `${m.year}-${m.month}-${m.day}`,
      totalMinutes: hour * 60 + minute,
    };
  } catch {
    return null;
  }
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface PillarSettings {
  disabled?: boolean;
  waterEnabled?: boolean;
  waterWakeAt?: string;
  waterSleepAt?: string;
  waterCadenceMinutes?: number;
  waterLastFiredAt?: number;
  sleepReminderEnabled?: boolean;
  sleepBedtimeAt?: string;
  sleepWindDownMinutes?: number;
  sleepReminderLastFiredDate?: string;
}

export const pillarReminders = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    const now = new Date();
    const nowMs = now.getTime();

    // Only iterate users with an FCM token — no point reminding someone
    // whose device can't receive a push.
    const usersSnap = await db.collection('users').where('fcmToken', '!=', '').get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const tz = (user.timezone as string) || 'UTC';
      const local = toLocal(now, tz);
      if (!local) continue;

      const settings = (user.pillarSettings || {}) as PillarSettings;
      if (settings.disabled) continue;

      const userId = userDoc.id;
      const username = (user.username as string) || 'you';

      // ----- Water -----
      const waterEnabled = settings.waterEnabled ?? DEFAULTS.waterEnabled;
      if (waterEnabled) {
        const wakeMin = timeToMinutes(settings.waterWakeAt || DEFAULTS.waterWakeAt);
        const sleepMin = timeToMinutes(settings.waterSleepAt || DEFAULTS.waterSleepAt);
        const cadence = settings.waterCadenceMinutes || DEFAULTS.waterCadenceMinutes;
        const inWindow = local.totalMinutes >= wakeMin && local.totalMinutes <= sleepMin;

        if (inWindow) {
          const lastFiredAt = settings.waterLastFiredAt || 0;
          const minsSince = (nowMs - lastFiredAt) / 60_000;
          // Subtract 1 to forgive cron jitter — we'd rather fire ~89min
          // out than hold for 105min on a 15-min cron with bad luck.
          if (minsSince >= cadence - 1) {
            try {
              await userDoc.ref.update({ 'pillarSettings.waterLastFiredAt': nowMs });
              await db.collection(`notifications/${userId}/items`).add({
                type: 'pillar_reminder',
                message: `Hey ${username} — quick water break. Tap +0.25L if you sipped.`,
                isRead: false,
                relatedId: 'water',
                actorId: '',
                actorAvatar: '',
                createdAt: admin.firestore.Timestamp.now(),
              });
            } catch (err) {
              console.error(`water reminder failed for ${userId}`, err);
            }
          }
        }
      }

      // ----- Sleep wind-down -----
      const sleepEnabled = settings.sleepReminderEnabled ?? DEFAULTS.sleepReminderEnabled;
      if (sleepEnabled) {
        const bedMin = timeToMinutes(settings.sleepBedtimeAt || DEFAULTS.sleepBedtimeAt);
        const windDown = settings.sleepWindDownMinutes || DEFAULTS.sleepWindDownMinutes;
        const targetMin = (bedMin - windDown + 24 * 60) % (24 * 60);

        // Fire window: a 15-minute slot around the target so the cron
        // can't miss it. Wraparound near midnight handled by modular math.
        const diff = (local.totalMinutes - targetMin + 24 * 60) % (24 * 60);
        const inFireWindow = diff >= 0 && diff < 15;

        if (inFireWindow && settings.sleepReminderLastFiredDate !== local.dateKey) {
          try {
            await userDoc.ref.update({
              'pillarSettings.sleepReminderLastFiredDate': local.dateKey,
            });
            await db.collection(`notifications/${userId}/items`).add({
              type: 'pillar_reminder',
              message: `Wind-down time, ${username} — bedtime in ${windDown}m. Phones away.`,
              isRead: false,
              relatedId: 'sleep',
              actorId: '',
              actorAvatar: '',
              createdAt: admin.firestore.Timestamp.now(),
            });
          } catch (err) {
            console.error(`sleep reminder failed for ${userId}`, err);
          }
        }
      }
    }
  });
