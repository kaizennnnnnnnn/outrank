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
import { StreakFire } from '@/components/habits/StreakFire';
import { TargetFullIcon, UsersFullIcon } from '@/components/ui/AppIcons';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { getCategoryByName, getCategoryBySlug } from '@/constants/categories';
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
          <Link
            href="/schedule"
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/10 border border-orange-500/30 hover:border-orange-400/60 transition-all"
            aria-label="Open schedule"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs font-semibold text-orange-400 group-hover:text-orange-300">Schedule</span>
          </Link>
          <StreakFire streak={Math.max(...habits.map(h => h.currentStreak), 0)} size={45} />
          <Link href="/profile">
            <SoulOrb intensity={Math.min(Math.round(
              Math.min(user.totalXP / 500, 40) + Math.min(habits.reduce((s, h) => s + h.currentStreak, 0) / 10, 30) +
              Math.min(habits.reduce((s, h) => s + h.totalLogs, 0) / 20, 20) + Math.min(level.level / 10, 10)
            ), 100)} tier={(user as unknown as Record<string, number>).orbTier || 1} size={80} hideLabel
              baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
              pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
              ringColorId={(user as unknown as Record<string, string>).orbRingColor}
            />
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
              {feedItems.filter((item) => item.actorId !== user.uid).slice(0, 10).map((item) => {
                const resolvedCat = item.categorySlug
                  ? getCategoryBySlug(item.categorySlug)
                  : item.categoryName
                    ? getCategoryByName(item.categoryName)
                    : undefined;
                const color = item.categoryColor || resolvedCat?.color || '#f97316';
                return (
                  <Link key={item.id} href={`/profile/${item.actorUsername}`}>
                    <div
                      className="group relative overflow-hidden rounded-xl p-3 transition-all hover:-translate-y-[1px]"
                      style={{
                        background: `linear-gradient(145deg, ${color}06 0%, #10101a 50%, #0b0b14 100%)`,
                        border: `1px solid ${color}1a`,
                      }}
                    >
                      <div
                        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.06] blur-2xl pointer-events-none"
                        style={{ background: color }}
                      />
                      <div className="relative flex items-center gap-3">
                        <Avatar src={item.actorAvatar} alt={item.actorUsername} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-semibold truncate group-hover:text-orange-400 transition-colors">
                            {item.actorUsername}
                          </p>
                          <p className="text-[10px] text-slate-600">
                            {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
                          </p>
                        </div>
                        <CategoryIcon
                          slug={item.categorySlug}
                          name={item.categoryName}
                          icon={item.categoryIcon || ''}
                          color={color}
                          size="sm"
                        />
                      </div>
                      <p className="relative text-xs text-slate-400 mt-2 pl-11">{item.message}</p>
                    </div>
                  </Link>
                );
              })}
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
