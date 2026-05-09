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
 *   • **Workout**: a single push at the user's chosen
 *     `workoutReminderTime` (HH:MM 24h on the user doc) — only on
 *     days that match the user's `workoutDays` array (or every day
 *     if no specific days are set). Idempotent per local-date.
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
 *   • Workout: stores `pillarSettings.workoutReminderLastFiredDate`
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
  weekdayKey: string;    // 'mon' | 'tue' | ... in user's local TZ
}

const WEEKDAY_LOOKUP: Record<string, string> = {
  Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun',
};

function toLocal(date: Date, tz: string): LocalSnap | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hour12: false,
    }).formatToParts(date);
    const m: Record<string, string> = {};
    for (const p of parts) m[p.type] = p.value;
    const hour = parseInt(m.hour || '0', 10) % 24;
    const minute = parseInt(m.minute || '0', 10);
    const weekdayKey = WEEKDAY_LOOKUP[m.weekday || ''] || 'mon';
    return {
      hour,
      minute,
      dateKey: `${m.year}-${m.month}-${m.day}`,
      totalMinutes: hour * 60 + minute,
      weekdayKey,
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
  workoutReminderEnabled?: boolean;
  workoutReminderLastFiredDate?: string;
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

      // ----- Workout reminder -----
      // Reads `workoutReminderTime` (HH:MM 24h) + `workoutDays`
      // (array of 'mon'..'sun') OFF the user doc — these are written
      // straight from onboarding phase 5/8, no pillarSettings nesting.
      // Defaults: enabled if a time exists; fires every day if no
      // workoutDays were picked.
      const workoutReminderTime = (user.workoutReminderTime as string | undefined) || '';
      const workoutEnabled = settings.workoutReminderEnabled ?? !!workoutReminderTime;
      if (workoutEnabled && workoutReminderTime) {
        const workoutMin = timeToMinutes(workoutReminderTime);
        const diff = (local.totalMinutes - workoutMin + 24 * 60) % (24 * 60);
        // 15-minute fire window mirrors the sleep wind-down's logic.
        const inFireWindow = diff >= 0 && diff < 15;

        // Only fire on a workout day. If `workoutDays` is empty / not
        // set, treat every day as a workout day (the user picked
        // "by count" rather than specific days).
        const workoutDays = (user.workoutDays as string[] | undefined) || [];
        const isWorkoutDay = workoutDays.length === 0 || workoutDays.includes(local.weekdayKey);

        if (
          inFireWindow
          && isWorkoutDay
          && settings.workoutReminderLastFiredDate !== local.dateKey
        ) {
          try {
            await userDoc.ref.update({
              'pillarSettings.workoutReminderLastFiredDate': local.dateKey,
            });
            await db.collection(`notifications/${userId}/items`).add({
              type: 'pillar_reminder',
              message: `Workout time, ${username} — your session is queued. Tap to start.`,
              isRead: false,
              relatedId: 'workout',
              actorId: '',
              actorAvatar: '',
              createdAt: admin.firestore.Timestamp.now(),
            });
          } catch (err) {
            console.error(`workout reminder failed for ${userId}`, err);
          }
        }
      }
    }
  });
