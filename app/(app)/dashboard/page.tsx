'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { DailyChallenge } from '@/components/habits/DailyChallenge';
import { QuickLogModal } from '@/components/habits/QuickLogModal';
import { HabitCard } from '@/components/habits/HabitCard';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { StreakFire } from '@/components/habits/StreakFire';
import { TargetFullIcon } from '@/components/ui/AppIcons';
import { EmptyState } from '@/components/ui/EmptyState';
import { getLeague } from '@/constants/seasons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import { UserHabit } from '@/types/habit';
import { OverallProgressGraph } from '@/components/habits/OverallProgressGraph';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, firebaseUser } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
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
      {/* Premium header banner — gradient backdrop, league crest + streak + orb, XP progress integrated */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{
          background:
            'radial-gradient(ellipse 120% 100% at 100% 0%, rgba(249,115,22,0.18), transparent 55%),' +
            'radial-gradient(ellipse 100% 100% at 0% 100%, rgba(220,38,38,0.12), transparent 60%),' +
            'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(249,115,22,0.25)',
          boxShadow: '0 0 40px -14px rgba(249,115,22,0.45), inset 0 1px 0 rgba(249,115,22,0.12)',
        }}
      >
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-wider leading-none">
                <span className="text-white">Out</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300">rank</span>
              </h1>
              {/* League + level pill row */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {(() => {
                  const lg = getLeague(user.weeklyXP || 0);
                  return (
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border"
                      style={{
                        background: `linear-gradient(135deg, ${lg.color}28, #10101a 80%)`,
                        borderColor: `${lg.color}55`,
                        boxShadow: `0 0 10px -2px ${lg.color}55`,
                      }}
                      title={`${lg.name} league · tap for details`}
                    >
                      <span
                        className="w-2.5 h-3 inline-block"
                        style={{
                          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                          background: lg.color,
                        }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: lg.color }}>
                        {lg.name}
                      </span>
                    </Link>
                  );
                })()}
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-orange-400 border border-orange-500/35 bg-orange-500/10 px-2 py-0.5 rounded-lg">
                  Lv. {level.level} · {level.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StreakFire streak={Math.max(...habits.map(h => h.currentStreak), 0)} size={50} />
              <Link href="/profile">
                <SoulOrb intensity={Math.min(Math.round(
                  Math.min(user.totalXP / 500, 40) + Math.min(habits.reduce((s, h) => s + h.currentStreak, 0) / 10, 30) +
                  Math.min(habits.reduce((s, h) => s + h.totalLogs, 0) / 20, 20) + Math.min(level.level / 10, 10)
                ), 100)} tier={(user as unknown as Record<string, number>).orbTier || 1} size={88} hideLabel
                  baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
                  pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
                  ringColorId={(user as unknown as Record<string, string>).orbRingColor}
                />
              </Link>
            </div>
          </div>

          {/* XP bar — inline in the banner so there's no separate pill below */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Progress to Level {level.level + 1}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {xpProgress.current.toLocaleString()} / {xpProgress.needed.toLocaleString()} XP
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30]">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
                  boxShadow: '0 0 12px rgba(249,115,22,0.6)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress.percentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Overview Graph */}
      <OverallProgressGraph />

      {/* Daily Challenge */}
      <DailyChallenge />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Habits — wrapped in a premium container */}
        <div className="lg:col-span-2">
          <div
            className="relative overflow-hidden rounded-2xl p-5 border"
            style={{
              background:
                'radial-gradient(ellipse 90% 60% at 0% 0%, rgba(220,38,38,0.08), transparent 55%),' +
                'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
              borderColor: 'rgba(249,115,22,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(249,115,22,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: '#f97316', boxShadow: '0 0 6px #f97316' }}
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-400">
                  Today&rsquo;s Habits
                </p>
                {!habitsLoading && habits.length > 0 && (
                  <span className="text-[10px] font-mono text-slate-500 ml-1">
                    · {habits.filter((h) => h.lastLogDate && new Date(h.lastLogDate.toDate()).toDateString() === new Date().toDateString()).length}/{habits.length}
                  </span>
                )}
              </div>
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
