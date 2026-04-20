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
import { getLevelForXP } from '@/constants/levels';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const { friends } = useFriends();

  // Hooks must run unconditionally — derive from user? with safe fallbacks.
  const userAny = user as unknown as Record<string, number> | null;
  const realTier = userAny?.orbTier || 1;
  const evolveCharges = userAny?.orbEvolutionCharges || 0;
  const storedAwakening = Math.min(100, userAny?.awakening || 0);
  const [localTier, setLocalTier] = useState(realTier);
  const [localCharges, setLocalCharges] = useState(evolveCharges);
  const [localAwakening, setLocalAwakening] = useState(storedAwakening);
  const [showOrbHistory, setShowOrbHistory] = useState(false);
  const [showLevelRewards, setShowLevelRewards] = useState(false);
  useEffect(() => { setLocalTier(realTier); }, [realTier]);
  useEffect(() => { setLocalCharges(evolveCharges); }, [evolveCharges]);
  useEffect(() => { setLocalAwakening(storedAwakening); }, [storedAwakening]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const level = getLevelForXP(user.totalXP);
  const totalLogs = habits.reduce((sum, h) => sum + h.totalLogs, 0);
  const longestStreak = Math.max(...habits.map((h) => h.longestStreak), 0);
  const friendCount = friends.length;

  // Awakening is now a persistent 0-100 counter stored on the user doc.
  // It climbs via daily logins + habit logs and is NEVER reset by evolve
  // or ascend — only Full Awakening (at 100%) resets it to 0. This is the
  // value passed to SoulOrb as `intensity` (it drives visual richness +
  // determines the size of the bonus on each regular evolve).
  const orbIntensity = localAwakening;

  const handleEvolve = async () => {
    if (localTier >= 10 || localCharges <= 0) return;
    const newTier = localTier + 1;
    // Rewards scale with current awakening. 0% = tiny, 100% = hefty.
    const bonusFrags = 25 + Math.floor(localAwakening * 0.5); // 25..75
    const bonusXP    = 20 + Math.floor(localAwakening * 0.5); // 20..70
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        orbTier: newTier,
        orbEvolutionCharges: increment(-1),
        fragments: increment(bonusFrags),
        totalXP: increment(bonusXP),
        weeklyXP: increment(bonusXP),
        monthlyXP: increment(bonusXP),
        seasonPassXP: increment(bonusXP),
      });
    } catch { /* silent */ }
    setLocalTier(newTier);
    setLocalCharges((c) => Math.max(0, c - 1));
  };

  const handleAscend = async () => {
    if (!user) return;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        orbTier: 1,
        orbAscensions: increment(1),
        fragments: increment(500),
        ownedCosmetics: arrayUnion('frame_ascension', 'name_ascendant'),
      });
      setLocalTier(1);
    } catch { /* silent */ }
  };

  // Full Awakening — special cash-out at 100% awakening. Grants a permanent
  // +5% XP multiplier (stackable), mythic Awakened cosmetics on the first
  // awakening, a big fragment + XP payout, and 2 evolution charges. Then
  // resets awakening to 0 so the user can climb again for another
  // stack of the permanent bonus.
  const handleFullAwaken = async () => {
    if (!user || localAwakening < 100) return;
    const userRaw = user as unknown as Record<string, number>;
    const firstTime = (userRaw.fullAwakenings || 0) === 0;
    try {
      const { updateDocument } = await import('@/lib/firestore');
      const { increment, arrayUnion } = await import('firebase/firestore');
      await updateDocument('users', user.uid, {
        awakening: 0,
        fullAwakenings: increment(1),
        awakeningBonus: increment(0.05),
        fragments: increment(2000),
        totalXP: increment(1000),
        weeklyXP: increment(1000),
        monthlyXP: increment(1000),
        seasonPassXP: increment(1000),
        orbEvolutionCharges: increment(2),
        ...(firstTime
          ? {
              ownedCosmetics: arrayUnion('frame_awakened', 'name_awakened'),
              equippedFrame: 'frame_awakened',
              equippedNameEffect: 'name_awakened',
            }
          : {}),
      });
    } catch { /* silent */ }
    setLocalAwakening(0);
    setLocalCharges((c) => c + 2);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Soul Orb */}
      <div onClick={() => setShowOrbHistory(true)} className="cursor-pointer">
        <SoulOrb
          intensity={orbIntensity}
          tier={localTier}
          size={300}
          onEvolve={localCharges > 0 ? handleEvolve : undefined}
          onAscend={handleAscend}
          onFullAwaken={localAwakening >= 100 ? handleFullAwaken : undefined}
          baseColorId={(user as unknown as Record<string, string>).orbBaseColor}
          pulseColorId={(user as unknown as Record<string, string>).orbPulseColor}
          ringColorId={(user as unknown as Record<string, string>).orbRingColor}
        />
      </div>

      {/* Fragments + evolution charges */}
      <div className="flex items-center justify-center gap-3 flex-wrap -mt-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" /></svg>
          <span className="font-mono text-sm font-bold text-orange-400">{(user as unknown as Record<string, number>).fragments || 0}</span>
          <span className="text-[10px] text-slate-500">fragments</span>
        </div>
        {localTier < 10 && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border',
              localCharges > 0
                ? 'bg-pink-500/10 border-pink-500/30 animate-frame-pulse'
                : 'bg-[#10101a] border-[#1e1e30]'
            )}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={localCharges > 0 ? 'text-pink-300' : 'text-slate-600'}>
              <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" />
            </svg>
            <span className={cn('font-mono text-sm font-bold', localCharges > 0 ? 'text-pink-300' : 'text-slate-500')}>
              {localCharges}
            </span>
            <span className="text-[10px] text-slate-500">evolution{localCharges === 1 ? '' : 's'}</span>
          </div>
        )}
        <button onClick={() => setShowOrbHistory(true)} className="text-[10px] text-slate-500 hover:text-orange-400 transition-colors underline">
          View Orb Details
        </button>
      </div>

      {/* Awakening progress bar — persistent 0-100 counter, survives evolve +
          ascend. Only Full Awakening resets it. Higher % = bigger rewards on
          every regular evolve you do. */}
      <AwakeningBar awakening={localAwakening} />
      {localCharges === 0 && localTier < 10 ? (
        <p className="text-[10px] text-center text-slate-500 -mt-3 max-w-sm mx-auto leading-relaxed">
          Log <b className="text-orange-400">every habit today</b> for extra rewards.
        </p>
      ) : localAwakening >= 100 ? (
        <p className="text-[10px] text-center -mt-3 max-w-sm mx-auto leading-relaxed">
          <b className="text-pink-300">100% reached.</b> Full Awaken for a permanent XP bonus + exclusive skin.
        </p>
      ) : (
        <p className="text-[10px] text-center text-slate-500 -mt-3 max-w-sm mx-auto leading-relaxed">
          Evolve now for <b className="text-orange-400">+{25 + Math.floor(localAwakening * 0.5)} frags</b>, <b className="text-orange-400">+{20 + Math.floor(localAwakening * 0.5)} XP</b>. Higher awakening = bigger prize.
        </p>
      )}
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

/**
 * Premium awakening progress bar. Multi-layered animation intentionally
 * builds anticipation — the closer you are to 100%, the more dramatic it
 * gets. At 100% the whole bar goes rainbow and emits sparkles.
 *
 *   Base track    — static dark pill with subtle colored glow backdrop
 *   Outer halo    — soft radial glow, intensity scales with %
 *   Fill          — gradient that flows horizontally (bg-position animation)
 *   Shimmer sweep — bright diagonal streak scrolls across the fill
 *   Progress head — pulsing gem-dot at the end of the fill
 *   Milestones    — 4 dots (25/50/75/100) below the bar, light up as passed
 *   Ready badge   — shows only at 100%, floats over the head with sparkles
 *
 * Every animation is GPU-composited (transform + opacity + bg-position) so
 * rendering is cheap even though the composition looks rich.
 */
function AwakeningBar({ awakening }: { awakening: number }) {
  const pct = Math.max(0, Math.min(100, awakening));
  const atMax = pct >= 100;
  const milestones = [25, 50, 75, 100];

  return (
    <div className="-mt-3 max-w-sm mx-auto relative">
      {/* Outer halo — grows with progress, subtle at low %, intense at max. */}
      <div
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background: atMax
            ? 'radial-gradient(ellipse at center, rgba(253,224,71,0.35), rgba(236,72,153,0.25) 40%, transparent 75%)'
            : `radial-gradient(ellipse at center, rgba(236,72,153,${Math.min(0.35, pct / 400)}), transparent 75%)`,
          filter: 'blur(6px)',
          opacity: atMax ? 1 : pct / 100,
        }}
      />

      {/* Header row */}
      <div className="relative flex items-center justify-between mb-1.5">
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.25em]',
            atMax ? 'bg-clip-text text-transparent' : 'text-pink-300/90'
          )}
          style={
            atMax
              ? {
                  background: 'linear-gradient(90deg, #fde047, #f9a8d4, #a855f7, #22d3ee, #fde047)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  animation: 'awakening-fill-flow 2.5s linear infinite',
                }
              : undefined
          }
        >
          {atMax ? 'Awakening · Ready!' : 'Awakening'}
        </span>
        <span
          className="font-heading text-base font-bold bg-clip-text text-transparent tabular-nums"
          style={{
            background: atMax
              ? 'linear-gradient(90deg, #fde047, #f9a8d4, #22d3ee, #fde047)'
              : 'linear-gradient(90deg, #fbbf24, #ec4899, #a855f7)',
            backgroundSize: atMax ? '200% 100%' : undefined,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            animation: atMax ? 'awakening-fill-flow 2.5s linear infinite' : undefined,
            filter: `drop-shadow(0 0 ${Math.min(8, pct / 14)}px rgba(236,72,153,${Math.min(0.8, pct / 140)}))`,
          }}
        >
          {pct}%
        </span>
      </div>

      {/* The track */}
      <div
        className="relative h-3 rounded-full overflow-hidden border"
        style={{
          background:
            'radial-gradient(ellipse at 50% -20%, rgba(236,72,153,0.12), transparent 60%), #06060c',
          borderColor: atMax ? 'rgba(253,224,71,0.6)' : 'rgba(236,72,153,0.22)',
          boxShadow: atMax
            ? 'inset 0 0 12px rgba(253,224,71,0.4), 0 0 14px rgba(253,224,71,0.45)'
            : 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }}
      >
        {/* The fill — gradient that flows laterally */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full transition-[width] duration-700 ease-out overflow-hidden"
          style={{
            width: `${pct}%`,
            background: atMax
              ? 'linear-gradient(90deg, #fde047, #f472b6, #a855f7, #22d3ee, #fde047, #f472b6)'
              : 'linear-gradient(90deg, #7c3aed, #ec4899, #fbbf24, #ec4899, #7c3aed)',
            backgroundSize: '220% 100%',
            animation: `awakening-fill-flow ${atMax ? '2.2s' : '3.2s'} linear infinite`,
            willChange: 'background-position',
          }}
        >
          {/* Diagonal shimmer sweep — sweeps across fill every 2.2s */}
          <div
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(95deg, transparent, rgba(255,255,255,0.65), transparent)',
              animation: 'awakening-shimmer 2.2s ease-in-out infinite',
              willChange: 'transform',
            }}
          />
        </div>

        {/* Progress head — bright gem at the tip of the fill */}
        {pct > 0 && (
          <div
            className="absolute top-1/2 pointer-events-none rounded-full"
            style={{
              left: `${pct}%`,
              width: atMax ? 14 : 12,
              height: atMax ? 14 : 12,
              marginLeft: atMax ? -10 : -8,
              marginTop: atMax ? -7 : -6,
              background: atMax
                ? 'radial-gradient(circle, #ffffff 0%, #fde047 40%, #ec4899 80%, transparent 100%)'
                : 'radial-gradient(circle, #ffffff 0%, #f9a8d4 50%, #ec4899 100%)',
              boxShadow: atMax
                ? '0 0 18px #fde047, 0 0 10px #ec4899, 0 0 4px #ffffff'
                : '0 0 12px #ec4899, 0 0 5px #ffffff',
              animation: `awakening-head 1.4s ease-in-out infinite`,
              willChange: 'transform, opacity',
            }}
          />
        )}

        {/* At 100%: extra twinkle sparkles inside the track */}
        {atMax && (
          <>
            {[15, 38, 62, 85].map((x, i) => (
              <span
                key={x}
                className="absolute top-1/2 w-1 h-1 rounded-full animate-frame-spark pointer-events-none"
                style={{
                  left: `${x}%`,
                  marginLeft: -2,
                  marginTop: -2,
                  background: ['#fde047', '#f9a8d4', '#22d3ee', '#fde047'][i],
                  boxShadow: `0 0 6px ${['#fde047', '#f9a8d4', '#22d3ee', '#fde047'][i]}, 0 0 2px #ffffff`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Milestone markers — light up as you cross them */}
      <div className="relative mt-1.5 h-2">
        {milestones.map((m) => {
          const reached = pct >= m;
          const isMax = m === 100;
          return (
            <div
              key={m}
              className="absolute top-0"
              style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: reached ? (isMax ? 5 : 4) : 3,
                  height: reached ? (isMax ? 5 : 4) : 3,
                  background: reached
                    ? (isMax ? '#fde047' : '#ec4899')
                    : '#1e1e30',
                  boxShadow: reached
                    ? `0 0 ${isMax ? 8 : 5}px ${isMax ? '#fde047' : '#ec4899'}`
                    : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
