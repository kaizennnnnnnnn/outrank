'use client';

import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { LevelBadge } from '@/components/profile/LevelBadge';
import { XPProgressBar } from '@/components/profile/XPProgressBar';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { OverallProgressGraph } from '@/components/habits/OverallProgressGraph';
import { StreakFlame } from '@/components/habits/StreakFlame';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { BoltFullIcon, ChartBarIcon, UsersFullIcon, FireIcon } from '@/components/ui/AppIcons';
import { MasteryShelf } from '@/components/profile/MasteryShelf';
import { TitlesVault } from '@/components/profile/TitlesVault';
import { SeasonCard } from '@/components/profile/SeasonCard';
import { PrestigeCard } from '@/components/profile/PrestigeCard';
import { LevelRewardsModal } from '@/components/profile/LevelRewardsModal';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { ProfileHighlights } from '@/components/profile/ProfileHighlights';
import { getLevelForXP } from '@/constants/levels';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { friends } = useFriends();
  const [showLevelRewards, setShowLevelRewards] = useState(false);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const userAny = user as unknown as Record<string, number>;
  const level = getLevelForXP(user.totalXP);
  const totalLogs = habits.reduce((sum, h) => sum + h.totalLogs, 0);
  const longestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
  const friendCount = friends.length;

  // Profile now shows the orb as a passive visualization only — evolve,
  // ascend, and awaken live on /orb (reachable from the bottom-nav FAB).
  // We intentionally pass no onEvolve / onAscend / onFullAwaken handlers
  // so the orb's internal interaction UI is disabled here. Tapping the
  // orb goes to /orb.
  const orbIntensity = Math.min(100, userAny.awakening || 0);
  const orbTier = userAny.orbTier || 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Soul Orb — view-only. Click anywhere on it to jump to the orb
          command center where you can actually evolve/ascend/awaken. */}
      <Link
        href="/orb"
        className="block relative group"
        aria-label="Open orb command center"
      >
        <SoulOrb
          intensity={orbIntensity}
          tier={orbTier}
          size={300}
          baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
          pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
          ringColorId={(user as unknown as Record<string, string>).orbRingColor}
        />
        {/* Invisible click shield — SoulOrb has its own internal click
            targets (drag-to-rotate etc.) but on profile we want the
            whole area to navigate. pointer-events-none on the orb
            itself would kill its render loop too, so we just overlay
            a transparent anchor area. */}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'transparent' }}
        />
        <span className="absolute inset-x-0 -bottom-1 text-center pointer-events-none">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 group-hover:text-orange-400 transition-colors">
            Tap to open orb →
          </span>
        </span>
      </Link>

      {/* Season / League / Pass */}
      <SeasonCard user={user} />

      {/* Prestige banner (only shows at cap or if prestiged) */}
      <PrestigeCard user={user} />

      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-4">
          <FramedAvatar
            src={user.avatarUrl}
            alt={user.username}
            size="xl"
            frameId={(user as unknown as Record<string, string>).equippedFrame}
          />
        </div>
        <h1>
          <NamePlate
            name={user.username}
            effectId={(user as unknown as Record<string, string>).equippedNameEffect}
            size="xl"
          />
        </h1>
        <button
          onClick={() => setShowLevelRewards(true)}
          className="text-sm text-orange-400 font-heading hover:text-orange-300 transition-colors underline-offset-4 hover:underline"
          aria-label="View level rewards"
        >
          Lv.{level.level} {level.title}
        </button>
        {user.bio && <p className="text-sm text-slate-400 mt-2">{user.bio}</p>}

        {/* XP Bar */}
        <div className="mt-4 max-w-xs mx-auto">
          <XPProgressBar totalXP={user.totalXP} />
        </div>

        {/* Persistent achievements strip */}
        <ProfileHighlights user={user} />

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

      {/* Mastery shelf */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Habit Mastery</h2>
        <MasteryShelf habits={habits} />
      </div>

      {/* Titles vault */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Titles</h2>
        <TitlesVault user={user} habits={habits} />
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

      <LevelRewardsModal
        isOpen={showLevelRewards}
        onClose={() => setShowLevelRewards(false)}
        currentLevel={level.level}
        currentXP={user.totalXP}
      />
    </div>
  );
}
