'use client';

import { use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useDocument } from '@/hooks/useFirestore';
import { getCategoryBySlug } from '@/constants/categories';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { HabitLogHistory } from '@/components/habits/HabitLogHistory';
import { HabitProgressGraph } from '@/components/habits/HabitProgressGraph';
import { LeaderboardRow } from '@/components/competition/LeaderboardRow';
import { StatCard } from '@/components/profile/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserHabit } from '@/types/habit';
import { FireIcon, TrophyIconFull, ChartBarIcon, TargetFullIcon, SearchIcon } from '@/components/ui/AppIcons';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'alltime', label: 'All Time' },
];

export default function HabitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const category = getCategoryBySlug(slug);
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const { entries, loading: lbLoading } = useLeaderboard(slug, period);

  const { data: habit, loading: habitLoading } = useDocument<UserHabit>(
    `habits/${user?.uid}/userHabits`,
    user ? slug : null
  );

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600 mx-auto" />
        <h1 className="text-xl font-bold text-white mt-4">Category not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: `${category.color}15` }}
          >
            {category.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white font-heading">{category.name}</h1>
            <p className="text-sm text-slate-500">{category.section} &bull; {category.unit}</p>
          </div>
          {habit && habit.currentStreak > 0 && (
            <StreakFlame streak={habit.currentStreak} size="lg" />
          )}
        </div>
      </div>

      {/* My Stats */}
      {habitLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : habit ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<FireIcon size={24} className="text-orange-400" />} value={`${habit.currentStreak}d`} label="Current Streak" />
          <StatCard icon={<TrophyIconFull size={24} className="text-yellow-400" />} value={`${habit.longestStreak}d`} label="Best Streak" />
          <StatCard icon={<ChartBarIcon size={24} className="text-red-400" />} value={habit.totalLogs.toString()} label="Total Logs" />
          <StatCard icon={<TargetFullIcon size={24} className="text-orange-400" />} value={`${habit.goal} ${habit.unit}`} label="Daily Goal" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-slate-500">You haven&apos;t added this habit yet.</p>
        </div>
      )}

      {/* Progress Graph */}
      {user && habit && (
        <div className="glass-card rounded-2xl p-4">
          <h2 className="text-sm font-bold text-white mb-3">Progress vs Goal</h2>
          <HabitProgressGraph
            userId={user.uid}
            habitId={slug}
            goal={habit.goal}
            unit={habit.unit}
            color={category.color}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white">Leaderboard</h2>
          <div className="flex gap-1 bg-[#10101a] rounded-xl p-1 border border-[#1e1e30] w-fit">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  period === p.value ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#1e1e30]">
            {lbLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : entries.length === 0 ? (
              <p className="p-8 text-center text-slate-600">No entries yet</p>
            ) : (
              entries.slice(0, 20).map((entry, i) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={i + 1}
                  username={entry.username}
                  avatarUrl={entry.avatarUrl}
                  score={entry.score}
                  delta={entry.delta}
                  isCurrentUser={entry.userId === user?.uid}
                  index={i}
                />
              ))
            )}
          </div>
        </div>

        {/* Log History */}
        {user && habit && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Recent Logs</h2>
            <HabitLogHistory userId={user.uid} habitId={slug} />
          </div>
        )}
      </div>
    </div>
  );
}
