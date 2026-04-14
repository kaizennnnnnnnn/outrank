import { db } from './firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';

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

  // Scale XP based on how much of the goal was achieved
  // e.g. goal=10, logged=3 → 30% XP. Capped at 100%.
  const goal = habitSnap.exists() ? (habitSnap.data().goal || 1) : 1;
  const completionRatio = Math.min(value / goal, 1);
  const baseXP = Math.max(1, Math.round(maxBaseXP * completionRatio));

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

  if (!habitSnap.exists()) return { xpEarned: baseXP, newStreak: 0 };

  const habit = habitSnap.data();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newStreak = 1;
  if (habit.lastLogDate) {
    const lastLog = habit.lastLogDate.toDate();
    lastLog.setHours(0, 0, 0, 0);

    if (lastLog.getTime() === yesterday.getTime()) {
      // Consecutive day — extend streak
      newStreak = (habit.currentStreak || 0) + 1;
    } else if (lastLog.getTime() === today.getTime()) {
      // Already logged today — keep current streak
      newStreak = habit.currentStreak || 1;
    }
    // Otherwise streak resets to 1
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

  // Update XP on the log if bonus was added
  if (totalXP !== baseXP) {
    await updateDoc(doc(db, `logs/${userId}/habitLogs/${logRef.id}`), {
      xpEarned: totalXP,
    });
  }

  // 4. Update user XP
  const userRef = doc(db, `users/${userId}`);
  await updateDoc(userRef, {
    totalXP: increment(totalXP),
    weeklyXP: increment(totalXP),
    monthlyXP: increment(totalXP),
    lastActiveAt: Timestamp.now(),
  });

  // 5. Recalculate level
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  if (userData) {
    const newLevel = calculateLevel(userData.totalXP);
    if (newLevel.level > (userData.level || 1)) {
      await updateDoc(userRef, {
        level: newLevel.level,
        currentTitle: newLevel.title,
      });
    }
  }

  // 6. Update leaderboard
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

  // 7. Create feed item for friends to see
  await addDoc(collection(db, `feed/${userId}/items`), {
    type: 'log',
    actorId: userId,
    actorUsername: username,
    actorAvatar: avatarUrl,
    categoryName: habit.categoryName || habitSlug,
    categoryIcon: habit.categoryIcon || '',
    value,
    message: `${username} logged ${value} ${habit.unit || ''} of ${habit.categoryName || habitSlug}`,
    reactions: {},
    createdAt: Timestamp.now(),
  });

  return { xpEarned: totalXP, newStreak };
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
