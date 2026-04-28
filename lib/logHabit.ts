import { db } from './firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { appendLogToRecap } from './recap';
import { RecapEntry } from '@/types/recap';
import { isPillarSlug } from '@/constants/pillars';

const XP_LOG = 10;
const XP_LOG_VERIFIED = 15;
const XP_STREAK_7 = 25;
const XP_STREAK_30 = 100;
const XP_STREAK_100 = 250;

interface LogHabitParams {
  userId: string;
  habitSlug: string;
  categoryId: string;
  value: number;
  note: string;
  proofImageUrl: string;
  username: string;
  avatarUrl: string;
}

export async function logHabit(params: LogHabitParams) {
  const { userId, habitSlug, categoryId, value, note, proofImageUrl, username, avatarUrl } = params;
  const hasProof = !!proofImageUrl;
  const maxBaseXP = hasProof ? XP_LOG_VERIFIED : XP_LOG;

  // 2. Get habit to check goal for XP scaling
  const habitRef = doc(db, `habits/${userId}/userHabits/${habitSlug}`);
  const habitSnap = await getDoc(habitRef);

  // Check if the user has an active XP boost (24h 2x), prestige bonus, and
  // awakening bonus (stacking +5% per Full Awakening — stored as a decimal
  // multiplier on `awakeningBonus`).
  let boostMultiplier = 1;
  let prestigeBonus = 0;
  let awakeningBonus = 0;
  try {
    const userDoc = await getDoc(doc(db, `users/${userId}`));
    const data = userDoc.data();
    const boostAt = data?.xpBoostActivatedAt;
    if (boostAt && typeof boostAt.toDate === 'function') {
      const elapsedMs = Date.now() - boostAt.toDate().getTime();
      if (elapsedMs < 24 * 60 * 60 * 1000) boostMultiplier = 2;
    }
    // +1% per prestige cycle, compounding onto the boost multiplier
    const prestigeLevel = (data?.prestige as number) || 0;
    prestigeBonus = prestigeLevel * 0.01;
    awakeningBonus = (data?.awakeningBonus as number) || 0;
  } catch { /* ignore */ }

  // Scale XP based on how much of the goal was achieved. Prestige +
  // awakening bonuses are additive (so 2 prestige + 2 full-awakenings =
  // +2% + +10% = +12% on top of the base boost multiplier).
  const goal = habitSnap.exists() ? (habitSnap.data().goal || 1) : 1;
  const completionRatio = Math.min(value / goal, 1);
  const baseXP = Math.max(
    1,
    Math.round(maxBaseXP * completionRatio * boostMultiplier * (1 + prestigeBonus + awakeningBonus)),
  );

  // 1. Create the log document
  const logRef = await addDoc(collection(db, `logs/${userId}/habitLogs`), {
    habitId: habitSlug,
    categoryId,
    categorySlug: habitSlug,
    value,
    goal,
    completionPercent: Math.round(completionRatio * 100),
    note,
    proofImageUrl,
    verified: hasProof,
    loggedAt: Timestamp.now(),
    xpEarned: baseXP,
    createdAt: Timestamp.now(),
  });

  if (!habitSnap.exists()) {
    // No habit doc (e.g. daily challenge for untracked category)
    // Still award XP
    try {
      await updateDoc(doc(db, `users/${userId}`), {
        totalXP: increment(baseXP),
        weeklyXP: increment(baseXP),
        monthlyXP: increment(baseXP),
        lastActiveAt: Timestamp.now(),
      });
    } catch { /* silent */ }
    return { xpEarned: baseXP, newStreak: 0 };
  }

  const habit = habitSnap.data();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = 1;
  let freezeUsed = false;
  if (habit.lastLogDate) {
    const lastLog = habit.lastLogDate.toDate();
    lastLog.setHours(0, 0, 0, 0);
    const dayGap = Math.round((today.getTime() - lastLog.getTime()) / 86_400_000);

    if (dayGap === 1) {
      // Consecutive day — extend streak
      newStreak = (habit.currentStreak || 0) + 1;
    } else if (dayGap === 0) {
      // Already logged today — keep current streak
      newStreak = habit.currentStreak || 1;
    } else if (dayGap > 1 && (habit.currentStreak || 0) >= 2) {
      // Streak would have broken — try to auto-apply a streak freeze if the
      // user has one available. Each freeze covers one missed day.
      try {
        const userDoc = await getDoc(doc(db, `users/${userId}`));
        const tokens = (userDoc.data()?.streakFreezeTokens as number) || 0;
        const missedDays = dayGap - 1;
        if (tokens >= missedDays) {
          // Consume tokens, preserve streak +1 for today's log
          await updateDoc(doc(db, `users/${userId}`), {
            streakFreezeTokens: increment(-missedDays),
          });
          newStreak = (habit.currentStreak || 0) + 1;
          freezeUsed = true;
        }
      } catch { /* if anything fails, streak resets as before */ }
    }
    // Otherwise (no freeze available / not enough tokens) streak resets to 1
  }

  const longestStreak = Math.max(newStreak, habit.longestStreak || 0);

  await updateDoc(habitRef, {
    currentStreak: newStreak,
    longestStreak,
    totalLogs: increment(1),
    lastLogDate: Timestamp.now(),
  });

  // 3. Calculate bonus XP from streak milestones
  let totalXP = baseXP;
  if (newStreak === 7) totalXP += XP_STREAK_7;
  if (newStreak === 30) totalXP += XP_STREAK_30;
  if (newStreak === 100) totalXP += XP_STREAK_100;

  // 3b. Apply Orb Aura XP multiplier
  try {
    const userSnap2 = await getDoc(doc(db, `users/${userId}`));
    const ud = userSnap2.data();
    const orbTier = ud?.orbTier || 1;
    const auraMultipliers: Record<number, number> = { 1: 1.0, 2: 1.05, 3: 1.10, 4: 1.15, 5: 1.20 };
    totalXP = Math.round(totalXP * (auraMultipliers[orbTier] || 1.0));

    // 3c. Add Orb Energy (+15 per log)
    const currentEnergy = ud?.orbEnergy ?? 50;
    const newEnergy = Math.min(100, currentEnergy + 15);
    await updateDoc(doc(db, `users/${userId}`), { orbEnergy: newEnergy });
  } catch { /* non-fatal */ }

  // Update XP on the log if bonus was added
  if (totalXP !== baseXP) {
    await updateDoc(doc(db, `logs/${userId}/habitLogs/${logRef.id}`), {
      xpEarned: totalXP,
    });
  }

  // 4. Update user XP
  const userRef = doc(db, `users/${userId}`);

  // --- Daily all-habits-done reward ---
  // The orb no longer auto-evolves per log. Instead: when the user logs the
  // LAST habit of the day (i.e. this log fills the final empty slot), they
  // earn +1 orbEvolutionCharges, +30 fragments, and +50 bonus XP — once
  // per calendar day. Evolution is then triggered manually from the profile.
  const DAILY_BONUS_FRAGMENTS = 30;
  const DAILY_BONUS_XP = 50;
  let dailyBonusEarned = false;
  let bonusXP = 0;
  let bonusFragments = 0;
  let evolutionChargeEarned = false;
  try {
    const allHabitsSnap = await getDocs(query(collection(db, `habits/${userId}/userHabits`)));
    const allHabits = allHabitsSnap.docs;
    if (allHabits.length > 0) {
      const todayStr = new Date().toDateString();
      const allLoggedToday = allHabits.every(h => {
        const d = h.data();
        // include this-very-log: current habit just got lastLogDate=Timestamp.now
        if (h.id === habitSlug) return true;
        return d.lastLogDate?.toDate?.()?.toDateString?.() === todayStr;
      });
      if (allLoggedToday) {
        const ud = (await getDoc(userRef)).data();
        const lastBonus = ud?.lastDailyBonusDate as { toDate?: () => Date } | undefined;
        const lastBonusStr = lastBonus?.toDate?.()?.toDateString?.();
        if (lastBonusStr !== todayStr) {
          dailyBonusEarned = true;
          bonusXP = DAILY_BONUS_XP;
          bonusFragments = DAILY_BONUS_FRAGMENTS;
          evolutionChargeEarned = true;
        }
      }
    }
  } catch { /* non-fatal */ }

  const finalXP = totalXP + bonusXP;

  // --- Awakening progression ---
  // Persistent 0-100 counter. Every habit log drips +1. Finishing every habit
  // of the day adds +5. Climbs slowly so high % always means the user earned
  // it. Read-then-clamp-then-write so we can't overshoot 100 via increment().
  let currentAwakening = 0;
  try {
    currentAwakening = ((await getDoc(userRef)).data()?.awakening as number) || 0;
  } catch { /* ignore — default to 0 */ }
  const awakeningGain = 1 + (dailyBonusEarned ? 5 : 0);
  const newAwakening = Math.min(100, currentAwakening + awakeningGain);

  await updateDoc(userRef, {
    totalXP: increment(finalXP),
    weeklyXP: increment(finalXP),
    monthlyXP: increment(finalXP),
    seasonPassXP: increment(finalXP),
    lastActiveAt: Timestamp.now(),
    awakening: newAwakening,
    ...(dailyBonusEarned
      ? {
          fragments: increment(bonusFragments),
          orbEvolutionCharges: increment(1),
          lastDailyBonusDate: Timestamp.now(),
        }
      : {}),
  });
  totalXP = finalXP;

  // 5. Recalculate level
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  let leveledUp = false;
  let newLevelNum = userData?.level || 1;
  if (userData) {
    const newLevel = calculateLevel(userData.totalXP);
    if (newLevel.level > (userData.level || 1)) {
      await updateDoc(userRef, {
        level: newLevel.level,
        currentTitle: newLevel.title,
      });
      leveledUp = true;
      newLevelNum = newLevel.level;
    }

    // Track best-ever league reached, using the fresh weeklyXP that just
    // incremented. Only bumps up, never down — this is the persistent record.
    try {
      const { LEAGUES } = await import('@/constants/seasons');
      const currentWeeklyXP = (userData.weeklyXP || 0) + totalXP;
      const currentLeagueIdx = LEAGUES.reduce(
        (acc, l, i) => (currentWeeklyXP >= l.minWeeklyXP ? i : acc),
        0,
      );
      const bestId = userData.bestLeagueId as string | undefined;
      const bestIdx = bestId ? LEAGUES.findIndex((l) => l.id === bestId) : -1;
      if (currentLeagueIdx > bestIdx) {
        await updateDoc(userRef, { bestLeagueId: LEAGUES[currentLeagueIdx].id });
      }
    } catch { /* silent */ }
  }

  // --- Secondary operations (non-fatal) ---
  // If any of these fail, the core log + XP + streak are already saved

  // 6. Update leaderboard
  try {
  const leaderboardData = {
    userId,
    username,
    avatarUrl,
    score: increment(value),
    delta: 0,
    updatedAt: Timestamp.now(),
  };

  const periods = ['weekly', 'monthly', 'alltime'];
  for (const period of periods) {
    const lbRef = doc(db, `leaderboards/${habitSlug}/${period}/${userId}`);
    const lbSnap = await getDoc(lbRef);
    if (lbSnap.exists()) {
      await updateDoc(lbRef, {
        score: increment(value),
        updatedAt: Timestamp.now(),
      });
    } else {
      await setDoc(lbRef, {
        ...leaderboardData,
        score: value,
        rank: 0,
      });
    }
  }
  // 6b. Update active duel scores for this category
  try {
    const duelsSnap = await getDocs(
      query(
        collection(db, 'competitions'),
        where('status', '==', 'active'),
        where('categorySlug', '==', habitSlug)
      )
    );
    for (const duelDoc of duelsSnap.docs) {
      const duel = duelDoc.data();
      const participants = duel.participants || [];
      const myIdx = participants.findIndex((p: { userId: string }) => p.userId === userId);
      if (myIdx >= 0) {
        participants[myIdx].score = (participants[myIdx].score || 0) + value;
        await updateDoc(doc(db, 'competitions', duelDoc.id), { participants });
      }
    }
  } catch (err) { console.error('Duel score update failed:', err); }

  } catch (err) { console.error('Leaderboard update failed:', err); }

  // 7. Append this log to today's draft Recap — pillars only.
  //
  // Soft path for custom habits: they still log to /logs and count toward
  // streaks, totals, and personal stats, but they DON'T flow into the
  // published recap on a friend's feed. Only the five pillars (gym,
  // steps, water, sleep, no-social) are recap-eligible. See
  // `constants/pillars.ts`.
  //
  // Replaces the old per-log feed fan-out (one feed item per friend per
  // log + one notification per friend per log → spam). Friends now see
  // a single curated recap when the user taps "Submit Today's Record"
  // on the dashboard. See `lib/recap.ts`.
  if (isPillarSlug(habitSlug)) {
    try {
      const entry: RecapEntry = {
        logId: logRef.id,
        habitSlug,
        categoryName: habit.categoryName || habitSlug,
        categoryIcon: habit.categoryIcon || '',
        categoryColor: habit.color || '#f97316',
        value,
        unit: habit.unit || '',
        note,
        proofImageUrl: proofImageUrl || '',
        verified: hasProof,
        xpEarned: totalXP,
        loggedAt: Timestamp.now(),
      };
      await appendLogToRecap({ userId, username, avatarUrl, entry });
    } catch (err) { console.error('Recap append failed:', err); }
  }

  return {
    xpEarned: totalXP,
    newStreak,
    freezeUsed,
    leveledUp,
    newLevel: newLevelNum,
    dailyBonusEarned,
    bonusFragments,
    bonusXP,
    evolutionChargeEarned,
  };
}

function calculateLevel(xp: number): { level: number; title: string } {
  const levels = [
    { level: 1, title: 'Rookie', xp: 0 },
    { level: 5, title: 'Grinder', xp: 500 },
    { level: 10, title: 'Contender', xp: 1200 },
    { level: 15, title: 'Rival', xp: 2100 },
    { level: 20, title: 'Warrior', xp: 3200 },
    { level: 25, title: 'Veteran', xp: 4500 },
    { level: 30, title: 'Champion', xp: 6000 },
    { level: 35, title: 'Elite', xp: 7700 },
    { level: 40, title: 'Master', xp: 9600 },
    { level: 45, title: 'Grandmaster', xp: 11700 },
    { level: 50, title: 'Legend', xp: 14000 },
    { level: 60, title: 'Mythic', xp: 19500 },
    { level: 70, title: 'Immortal', xp: 26000 },
    { level: 80, title: 'Ascended', xp: 33500 },
    { level: 90, title: 'Transcendent', xp: 42000 },
    { level: 100, title: 'The GOAT', xp: 52000 },
  ];

  let result = levels[0];
  for (const l of levels) {
    if (xp >= l.xp) result = l;
    else break;
  }
  return { level: result.level, title: result.title };
}
