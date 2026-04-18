'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useFriends } from '@/hooks/useFriends';
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
import { OrbHistory } from '@/components/profile/OrbHistory';
import { BoltFullIcon, ChartBarIcon, UsersFullIcon, FireIcon } from '@/components/ui/AppIcons';
import { OrbNickname } from '@/components/profile/OrbNickname';
import { MasteryShelf } from '@/components/profile/MasteryShelf';
import { TitlesVault } from '@/components/profile/TitlesVault';
import { SeasonCard } from '@/components/profile/SeasonCard';
import { PrestigeCard } from '@/components/profile/PrestigeCard';
import { LevelRewardsModal } from '@/components/profile/LevelRewardsModal';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { ProfileHighlights } from '@/components/profile/ProfileHighlights';
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
  const friendCount = friends.length;
  // currentStreaks reserved for the production intensity formula (see comment below)

  // TEST MODE: always allow evolving (intensity pinned to 100). Remove both of
  // these lines and uncomment the block below to go back to earned intensity.
  const orbIntensity = 100;
  // const orbIntensity = Math.min(
  //   Math.round(
  //     Math.min(user.totalXP / 500, 40) +
  //     Math.min(currentStreaks / 10, 30) +
  //     Math.min(totalLogs / 20, 20) +
  //     Math.min(level.level / 10, 10)
  //   ),
  //   100,
  // );

  const realTier = (user as unknown as Record<string, number>).orbTier || 1;
  const [localTier, setLocalTier] = useState(realTier);
  useEffect(() => { setLocalTier(realTier); }, [realTier]);

  // TEST MODE: reset tier helper so you can re-test the full 1→10 chain.
  const resetTier = async () => {
    try {
      const { updateDocument } = await import('@/lib/firestore');
      await updateDocument('users', user.uid, { orbTier: 1 });
    } catch { /* silent */ }
    setLocalTier(1);
  };

  const [showOrbHistory, setShowOrbHistory] = useState(false);
  const [showLevelRewards, setShowLevelRewards] = useState(false);

  const handleEvolve = async () => {
    if (localTier >= 10) return;
    const newTier = localTier + 1;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment } = await import('firebase/firestore');
      await updateDocument('users', user.uid, { orbTier: newTier });
      // Award 30 fragments for evolution
      await updateDocument('users', user.uid, { fragments: increment(30) });
    } catch { /* silent */ }
    setLocalTier(newTier);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Soul Orb */}
      <div onClick={() => setShowOrbHistory(true)} className="cursor-pointer">
        <SoulOrb
          intensity={orbIntensity}
          tier={localTier}
          size={300}
          onEvolve={handleEvolve}
          baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
          pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
          ringColorId={(user as unknown as Record<string, string>).orbRingColor}
        />
      </div>

      {/* Fragments display */}
      <div className="flex items-center justify-center gap-6 -mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
          <span className="font-mono text-sm font-bold text-orange-400">{(user as unknown as Record<string, number>).fragments || 0}</span>
          <span className="text-[10px] text-slate-500">fragments</span>
        </div>
        <button onClick={() => setShowOrbHistory(true)} className="text-[10px] text-slate-500 hover:text-orange-400 transition-colors underline">
          View Orb Details
        </button>
        {/* TEST MODE: reset tier to 1 so you can re-evolve all the way to 10 */}
        <button
          onClick={resetTier}
          className="text-[10px] text-slate-500 hover:text-red-400 transition-colors underline"
          title="Reset to tier 1 for testing"
        >
          Reset Tier
        </button>
      </div>
      <OrbHistory isOpen={showOrbHistory} onClose={() => setShowOrbHistory(false)} />

      {/* Orb nickname + mood */}
      <OrbNickname user={user} />

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
