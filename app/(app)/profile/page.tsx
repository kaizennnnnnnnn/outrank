'use client';

import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { LevelBadge } from '@/components/profile/LevelBadge';
import { XPProgressBar } from '@/components/profile/XPProgressBar';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { OverallProgressGraph } from '@/components/habits/OverallProgressGraph';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { BoltFullIcon, ChartBarIcon, UsersFullIcon, FireIcon } from '@/components/ui/AppIcons';
import { getLevelForXP, getXPProgress } from '@/constants/levels';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { friends } = useFriends();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const level = getLevelForXP(user.totalXP);
  const xpProgress = getXPProgress(user.totalXP);
  const totalLogs = habits.reduce((sum, h) => sum + h.totalLogs, 0);
  const longestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
  const friendCount = friends.length; // Use actual count, not Firestore field

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <Avatar src={user.avatarUrl} alt={user.username} size="xl" level={xpProgress.percentage} />
        </div>
        <h1 className="text-xl font-bold text-white">{user.username}</h1>
        <p className="text-sm text-orange-400 font-heading">
          Lv.{level.level} {level.title}
        </p>
        {user.bio && <p className="text-sm text-slate-400 mt-2">{user.bio}</p>}

        {/* XP Bar */}
        <div className="mt-4 max-w-xs mx-auto">
          <XPProgressBar totalXP={user.totalXP} />
        </div>

        <div className="flex justify-center mt-4">
          <Link href="/settings">
            <Button variant="secondary" size="sm">Edit Profile</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="flex justify-center"><BoltFullIcon size={24} className="text-orange-400" /></div>
          <p className="font-mono text-lg font-bold text-white mt-1">{user.totalXP.toLocaleString()}</p>
          <p className="text-xs text-slate-500">Total XP</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="flex justify-center"><ChartBarIcon size={24} className="text-red-400" /></div>
          <p className="font-mono text-lg font-bold text-white mt-1">{totalLogs}</p>
          <p className="text-xs text-slate-500">Total Logs</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="flex justify-center"><UsersFullIcon size={24} className="text-red-400" /></div>
          <p className="font-mono text-lg font-bold text-white mt-1">{friendCount}</p>
          <p className="text-xs text-slate-500">Friends</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <div className="flex justify-center"><FireIcon size={24} className="text-orange-400" /></div>
          <p className="font-mono text-lg font-bold text-white mt-1">{longestStreak}d</p>
          <p className="text-xs text-slate-500">Best Streak</p>
        </div>
      </div>

      {/* Weekly Progress */}
      <OverallProgressGraph />

      {/* Activity Heatmap */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Activity</h2>
        <ActivityHeatmap userId={user.uid} />
      </div>

      {/* Badges */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Badges</h2>
        <BadgeGrid userId={user.uid} />
      </div>

      {/* Active Habits */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Active Habits</h2>
        <div className="flex flex-wrap gap-2">
          {habits.map((h) => (
            <Link key={h.categorySlug} href={`/habits/${h.categorySlug}`}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18182a] border border-[#2d2d45] text-xs hover:border-red-500/30 transition-colors">
                <CategoryIcon icon={h.categoryIcon} color={h.color} size="sm" slug={h.categorySlug} />
                <span className="text-slate-300">{h.categoryName}</span>
                {h.currentStreak > 0 && (
                  <StreakFlame streak={h.currentStreak} size="sm" />
                )}
              </div>
            </Link>
          ))}
          {habits.length === 0 && (
            <p className="text-xs text-slate-600">No habits yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
