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

  // Check if the user has an active XP boost (24h 2x)
  let boostMultiplier = 1;
  try {
    const userDoc = await getDoc(doc(db, `users/${userId}`));
    const boostAt = userDoc.data()?.xpBoostActivatedAt;
    if (boostAt && typeof boostAt.toDate === 'function') {
      const elapsedMs = Date.now() - boostAt.toDate().getTime();
      if (elapsedMs < 24 * 60 * 60 * 1000) boostMultiplier = 2;
    }
  } catch { /* ignore */ }

  // Scale XP based on how much of the goal was achieved
  const goal = habitSnap.exists() ? (habitSnap.data().goal || 1) : 1;
  const completionRatio = Math.min(value / goal, 1);
  const baseXP = Math.max(1, Math.round(maxBaseXP * completionRatio * boostMultiplier));

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

    // 3d. Award fragments for daily completion
    // Check if all habits are logged today
    const allHabitsSnap = await getDocs(query(collection(db, `habits/${userId}/userHabits`)));
    const allHabits = allHabitsSnap.docs;
    const todayStr = new Date().toDateString();
    const allLoggedToday = allHabits.every(h => {
      const d = h.data();
      return d.lastLogDate?.toDate?.()?.toDateString?.() === todayStr;
    });
    if (allLoggedToday && allHabits.length > 0) {
      await updateDoc(doc(db, `users/${userId}`), {
        fragments: increment(5), // Daily completion bonus
      });
    }
  } catch { /* non-fatal */ }

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
    seasonPassXP: increment(totalXP),
    lastActiveAt: Timestamp.now(),
  });

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

  // 7. Create feed item for friends to see
  try {
  // Generate a shared origin ID so reactions are shared across all copies
  const originId = `${userId}_${habitSlug}_${Date.now()}`;

  const feedItem = {
    type: 'log',
    actorId: userId,
    actorUsername: username,
    actorAvatar: avatarUrl,
    categoryName: habit.categoryName || habitSlug,
    categoryIcon: habit.categoryIcon || '',
    categorySlug: habitSlug,
    categoryColor: habit.color || '#f97316',
    value,
    // Proof image + verified flag so the feed can show the photo and a
    // "verified" badge on logs that were submitted with evidence.
    proofImageUrl: proofImageUrl || '',
    verified: hasProof,
    message: `${username} logged ${value} ${habit.unit || ''} of ${habit.categoryName || habitSlug}`,
    originId,
    reactions: {},
    createdAt: Timestamp.now(),
  };

  // Initialize shared reactions document
  await setDoc(doc(db, `reactions/${originId}`), { reactions: {} });

  // Write to own feed
  await addDoc(collection(db, `feed/${userId}/items`), feedItem);

  // Write to all friends' feeds so they can see it
  try {
    const friendsSnap = await getDocs(
      query(
        collection(db, `friendships/${userId}/friends`),
        where('status', '==', 'accepted')
      )
    );
    for (const friendDoc of friendsSnap.docs) {
      await addDoc(collection(db, `feed/${friendDoc.id}/items`), feedItem);
      // Notify friend
      await addDoc(collection(db, `notifications/${friendDoc.id}/items`), {
        type: 'friend_logged',
        message: `${username} logged ${value} ${habit.unit || ''} of ${habit.categoryName || habitSlug}`,
        isRead: false,
        relatedId: habitSlug,
        actorId: userId,
        actorAvatar: avatarUrl,
        createdAt: Timestamp.now(),
      });
    }
  } catch (err) {
    console.error('Failed to write to friends feeds:', err);
  }
  } catch (err) { console.error('Feed/notifications failed:', err); }

  return { xpEarned: totalXP, newStreak, freezeUsed, leveledUp, newLevel: newLevelNum };
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
