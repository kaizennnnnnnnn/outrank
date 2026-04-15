'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFeed } from '@/hooks/useFeed';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DailyChallenge } from '@/components/habits/DailyChallenge';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { HabitCard } from '@/components/habits/HabitCard';
import { Avatar } from '@/components/ui/Avatar';
import { FlameIcon, BoltIcon } from '@/components/ui/Icons';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { TargetFullIcon, UsersFullIcon } from '@/components/ui/AppIcons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { useUIStore } from '@/store/uiStore';
import { UserHabit } from '@/types/habit';
import { OverallProgressGraph } from '@/components/habits/OverallProgressGraph';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const { items: feedItems, loading: feedLoading } = useFeed();
  const router = useRouter();

  const [logModal, setLogModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<UserHabit | null>(null);

  // Safety net: if Firebase user exists but no Firestore profile after 3s,
  // the user likely signed in before profile creation was fixed — redirect to onboarding
  useEffect(() => {
    if (firebaseUser && !user) {
      const timeout = setTimeout(() => {
        router.push('/onboarding');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [firebaseUser, user, router]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const level = getLevelForXP(user.totalXP);
  const xpProgress = getXPProgress(user.totalXP);

  const openLogModal = (habit: UserHabit) => {
    setSelectedHabit(habit);
    setLogModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider">
            <span className="text-white">Out</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-orange-400">rank</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <StreakFlame streak={Math.max(...habits.map(h => h.currentStreak), 0)} size="sm" />
          </div>
          <Link href="/profile">
            <SoulOrb intensity={Math.min(Math.round(
              Math.min(user.totalXP / 500, 40) + Math.min(habits.reduce((s, h) => s + h.currentStreak, 0) / 10, 30) +
              Math.min(habits.reduce((s, h) => s + h.totalLogs, 0) / 20, 20) + Math.min(level.level / 10, 10)
            ), 100)} tier={(user as unknown as Record<string, number>).orbTier || 1} size={48} hideLabel />
          </Link>
        </div>
      </div>

      {/* XP Progress */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Level {level.level} Progress</span>
          <span className="text-xs font-mono text-slate-500">
            {xpProgress.current}/{xpProgress.needed} XP
          </span>
        </div>
        <div className="w-full h-3 bg-[#18182a] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress.percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Weekly Overview Graph */}
      <OverallProgressGraph />

      {/* Daily Challenge */}
      <DailyChallenge />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Habits */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Today&apos;s Habits</h2>
            <Link href="/habits">
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          </div>

          {habitsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : habits.length === 0 ? (
            <EmptyState
              icon={<TargetFullIcon size={40} className="text-orange-400" />}
              title="No habits yet"
              description="Add your first habit to start tracking and competing."
              action={
                <Link href="/habits">
                  <Button>Browse Categories</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const isLoggedToday = habit.lastLogDate
                  ? new Date(habit.lastLogDate.toDate()).toDateString() === new Date().toDateString()
                  : false;

                return (
                  <HabitCard
                    key={habit.categorySlug}
                    habit={habit}
                    isLoggedToday={isLoggedToday}
                    onLog={() => openLogModal(habit)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Friend Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Friend Activity</h2>
          {feedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : feedItems.length === 0 ? (
            <EmptyState
              icon={<UsersFullIcon size={40} className="text-red-400" />}
              title="No activity yet"
              description="Add friends to see their progress here."
              action={
                <Link href="/friends">
                  <Button variant="secondary" size="sm">Find Friends</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {feedItems.filter((item) => item.actorId !== user.uid).slice(0, 10).map((item) => (
                <div key={item.id} className="glass-card rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={item.actorAvatar} alt={item.actorUsername} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{item.actorUsername}</p>
                      <p className="text-[10px] text-slate-600">
                        {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
                      </p>
                    </div>
                    {item.categoryIcon && <span className="text-lg">{item.categoryIcon}</span>}
                  </div>
                  <p className="text-xs text-slate-400">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Log Modal */}
      <QuickLogModal
        isOpen={logModal}
        onClose={() => setLogModal(false)}
        habit={selectedHabit}
        userId={user.uid}
      />
    </div>
  );
}
