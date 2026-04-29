import { doc, runTransaction, increment } from 'firebase/firestore';
import { db } from './firebase';
import { UserHabit } from '@/types/habit';

/**
 * Streak repair — fragment-spend to restore a broken streak.
 *
 * Pattern mirrors the pact freeze: real losses smoothed at a real
 * cost. logHabit captures `previousStreak` + `streakBrokenAt` on the
 * habit doc when a break happens (gap > 1, no freeze rescue, prior
 * streak ≥ 3). The repair surface offers to spend fragments to bring
 * `currentStreak` back up.
 *
 * Window: 48 hours after the break. After that the offer expires and
 * the user has to start the streak over. Stops repair-as-time-machine.
 *
 * Cost tiers reward keeping longer streaks worth saving without
 * letting whales restore a 100-day streak for pocket change.
 */

export const STREAK_REPAIR_WINDOW_MS = 48 * 60 * 60 * 1000;

export const STREAK_REPAIR_MIN = 3;

export function streakRepairCost(streak: number): number {
  if (streak < STREAK_REPAIR_MIN) return 0;
  if (streak < 7) return 50;
  if (streak < 14) return 100;
  if (streak < 30) return 200;
  if (streak < 100) return 400;
  return 800;
}

/**
 * Whether the habit currently shows a repair offer. Returns true only
 * when previousStreak is captured + meaningful + still inside the
 * 48-hour window.
 */
export function canRepairStreak(habit: UserHabit): boolean {
  if (!habit.previousStreak || habit.previousStreak < STREAK_REPAIR_MIN) return false;
  const brokenAt = habit.streakBrokenAt?.toDate?.();
  if (!brokenAt) return false;
  return Date.now() - brokenAt.getTime() < STREAK_REPAIR_WINDOW_MS;
}

export interface RepairResult {
  cost: number;
  restoredTo: number;
}

export async function repairStreak(userId: string, habitSlug: string): Promise<RepairResult> {
  const habitRef = doc(db, `habits/${userId}/userHabits/${habitSlug}`);
  const userRef = doc(db, 'users', userId);

  // Wrapped in a transaction so a rapid double-click (or cross-device
  // race) can't double-spend fragments. The transaction re-reads the
  // habit's previousStreak on retry — once the first repair clears it,
  // the second invocation aborts cleanly with "Nothing to repair."
  return runTransaction(db, async (tx) => {
    const habitSnap = await tx.get(habitRef);
    if (!habitSnap.exists()) throw new Error('Habit not found');
    const habit = habitSnap.data() as UserHabit;

    const previousStreak = habit.previousStreak || 0;
    if (previousStreak < STREAK_REPAIR_MIN) throw new Error('Nothing to repair');

    const brokenAt = habit.streakBrokenAt?.toDate?.();
    if (!brokenAt || Date.now() - brokenAt.getTime() > STREAK_REPAIR_WINDOW_MS) {
      throw new Error('Repair window expired');
    }

    const cost = streakRepairCost(previousStreak);
    const userSnap = await tx.get(userRef);
    const fragments = (userSnap.data()?.fragments as number) || 0;
    if (fragments < cost) throw new Error(`Not enough fragments — need ${cost}`);

    // Today's log already counted as currentStreak = 1; stitching the
    // saved history back on lifts it to previousStreak + 1.
    const restoredTo = previousStreak + 1;
    const longestStreak = Math.max(habit.longestStreak || 0, restoredTo);

    tx.update(habitRef, {
      currentStreak: restoredTo,
      longestStreak,
      previousStreak: null,
      streakBrokenAt: null,
    });
    tx.update(userRef, {
      fragments: increment(-cost),
    });

    return { cost, restoredTo };
  });
}

/**
 * Hours remaining in the repair window — used by the banner to show
 * urgency. Returns 0 once the window has expired.
 */
export function repairHoursLeft(habit: UserHabit): number {
  const brokenAt = habit.streakBrokenAt?.toDate?.();
  if (!brokenAt) return 0;
  const elapsed = Date.now() - brokenAt.getTime();
  if (elapsed >= STREAK_REPAIR_WINDOW_MS) return 0;
  return Math.max(1, Math.ceil((STREAK_REPAIR_WINDOW_MS - elapsed) / (60 * 60 * 1000)));
}
