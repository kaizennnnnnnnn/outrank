'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { BATTLE_PASS, PassRow, MISSIONS, Mission, isoWeekKey } from '@/constants/battlePass';
import { getCurrentSeason, getSeasonDaysLeft, getSeasonPassTier, SEASON_PASS_TIERS, SEASON_PASS_XP_PER_TIER } from '@/constants/seasons';
import { updateDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const rankStyles = {
  minor:    { color: '#cbd5e1', bg: 'rgba(148,163,184,0.08)',  border: 'rgba(148,163,184,0.22)' },
  medium:   { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',   border: 'rgba(59,130,246,0.40)' },
  major:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',   border: 'rgba(245,158,11,0.50)' },
  capstone: { color: '#f9a8d4', bg: 'rgba(236,72,153,0.18)',   border: 'rgba(236,72,153,0.55)' },
} as const;

export default function BattlePassPage() {
  const { user } = useAuth();
  const { habits } = useHabits();
  const addToast = useUIStore((s) => s.addToast);

  const userRaw = user as unknown as Record<string, unknown> | undefined;
  const seasonPassXP = (userRaw?.seasonPassXP as number) || 0;
  const currentTier = getSeasonPassTier(seasonPassXP);
  const season = getCurrentSeason();
  const daysLeft = getSeasonDaysLeft();
  // XP position within the current tier — used for the progress bar so the
  // user can see exactly how much is needed to tier up. Before this, pass
  // progression was invisible.
  const xpInTier = seasonPassXP % SEASON_PASS_XP_PER_TIER;
  const xpToNext = SEASON_PASS_XP_PER_TIER - xpInTier;
  const tierProgress = (xpInTier / SEASON_PASS_XP_PER_TIER) * 100;
  // Premium track is permanently locked for now (coming soon).
  const isPremium = false;
  const claimed = (userRaw?.claimedPassTiers as number[]) || [];

  const [claiming, setClaiming] = useState<string | null>(null);

  // ---- Mission progress + claim bookkeeping ----
  const todayStr = new Date().toDateString();
  const weekStr = isoWeekKey();
  const dailyClaimed = (userRaw?.dailyMissionsClaimed as Record<string, string>) || {};
  const weeklyClaimed = (userRaw?.weeklyMissionsClaimed as Record<string, string>) || {};
  const permClaimed = (userRaw?.permanentMissionsClaimed as string[]) || [];

  const habitsLoggedToday = habits.filter(
    (h) => h.lastLogDate?.toDate?.()?.toDateString?.() === todayStr,
  ).length;
  const allHabitsDoneToday =
    (userRaw?.lastDailyBonusDate as { toDate?: () => Date } | undefined)?.toDate?.()?.toDateString?.() ===
    todayStr;
  const weeklyXP = (userRaw?.weeklyXP as number) || 0;
  const longestCurrentStreak = Math.max(...habits.map((h) => h.currentStreak), 0);

  const missionProgress = (m: Mission): number => {
    switch (m.id) {
      case 'log_3':     return Math.min(habitsLoggedToday, m.goal);
      case 'log_all':   return allHabitsDoneToday ? 1 : 0;
      case 'weekly_xp': return Math.min(weeklyXP, m.goal);
      case 'streak_7':
      case 'streak_30': return Math.min(longestCurrentStreak, m.goal);
    }
    return 0;
  };

  const missionClaimed = (m: Mission): boolean => {
    if (m.kind === 'daily')     return dailyClaimed[m.id] === todayStr;
    if (m.kind === 'weekly')    return weeklyClaimed[m.id] === weekStr;
    if (m.kind === 'permanent') return permClaimed.includes(m.id);
    return false;
  };

  const handleClaimMission = async (m: Mission) => {
    if (!user) return;
    if (missionClaimed(m)) return;
    if (missionProgress(m) < m.goal) return;
    setClaiming(`mission-${m.id}`);
    try {
      const update: Record<string, unknown> = {
        seasonPassXP: increment(m.reward),
      };
      if (m.kind === 'daily')     update[`dailyMissionsClaimed.${m.id}`]  = todayStr;
      if (m.kind === 'weekly')    update[`weeklyMissionsClaimed.${m.id}`] = weekStr;
      if (m.kind === 'permanent') update.permanentMissionsClaimed = arrayUnion(m.id);
      await updateDocument('users', user.uid, update);
      addToast({ type: 'success', message: `Mission claimed · +${m.reward} Pass XP` });
    } catch {
      addToast({ type: 'error', message: 'Could not claim mission' });
    } finally {
      setClaiming(null);
    }
  };

  const claimKey = (row: PassRow) => `${row.tier}-${row.track}`;

  const canClaim = (row: PassRow) =>
    row.tier <= currentTier &&
    !claimed.includes(parseInt(claimKey(row)) as never) &&
    !claimedSet().has(claimKey(row)) &&
    (row.track === 'free' || isPremium);

  // We store claimed rows as string keys `${tier}-free` or `${tier}-premium` in
  // the same claimedPassTiers array for simplicity.
  function claimedSet(): Set<string> {
    return new Set((claimed as unknown as string[]).map(String));
  }

  const handleClaim = async (row: PassRow) => {
    if (!user) return;
    const key = claimKey(row);
    setClaiming(key);
    try {
      const update: Record<string, unknown> = {
        fragments: increment(row.fragments),
        claimedPassTiers: arrayUnion(key),
      };
      if (row.cosmetic) update.ownedCosmetics = arrayUnion(row.cosmetic);
      await updateDocument('users', user.uid, update);
      addToast({
        type: 'success',
        message: `Tier ${row.tier} claimed · +${row.fragments} fragments${row.cosmetic ? ' + cosmetic' : ''}`,
      });
    } catch {
      addToast({ type: 'error', message: 'Could not claim' });
    } finally {
      setClaiming(null);
    }
  };

  // Group free + premium rows per tier so we render one row per tier with two reward cells
  const grouped: Record<number, { free: PassRow; premium: PassRow }> = {};
  for (const r of BATTLE_PASS) {
    grouped[r.tier] = grouped[r.tier] || ({} as { free: PassRow; premium: PassRow });
    grouped[r.tier][r.track] = r;
  }
  const tiers = Object.values(grouped).sort((a, b) => a.free.tier - b.free.tier);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header — premium banner with layered gradients + chromatic dust + animated progress */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{
          background:
            'radial-gradient(ellipse 120% 100% at 100% 0%, rgba(236,72,153,0.22), transparent 50%),' +
            'radial-gradient(ellipse 120% 100% at 0% 100%, rgba(251,191,36,0.18), transparent 60%),' +
            'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(220,38,38,0.1) 40%, #0b0b14 100%)',
          borderColor: 'rgba(251,191,36,0.35)',
          boxShadow: '0 0 44px -14px rgba(249,115,22,0.55), inset 0 1px 0 rgba(251,191,36,0.18)',
        }}
      >
        {/* Chromatic dust — scattered gems */}
        {Array.from({ length: 20 }).map((_, i) => {
          const left = (i * 37) % 100;
          const top = (i * 61) % 100;
          const size = 2 + (i % 3);
          const colors = ['#fbbf24', '#ec4899', '#60a5fa', '#f97316', '#a855f7'];
          return (
            <span
              key={i}
              className="absolute rounded-full pointer-events-none animate-frame-pulse"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                background: colors[i % colors.length],
                boxShadow: `0 0 6px ${colors[i % colors.length]}`,
                opacity: 0.55,
                animationDelay: `${(i % 7) * 0.3}s`,
              }}
            />
          );
        })}

        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  Season {season}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">·</span>
                <span className="text-[10px] text-slate-400 font-mono">{daysLeft}d left</span>
              </div>
              <h1 className="font-heading text-4xl font-bold mt-1.5 leading-none">
                <span className="bg-gradient-to-r from-yellow-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                  Battle Pass
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[260px]">
                Every habit log earns season-pass XP. Climb 60 tiers to claim exclusive cosmetics.
              </p>
            </div>

            {/* Big tier crystal */}
            <div
              className="relative flex flex-col items-center justify-center py-3 px-4 rounded-xl animate-frame-pulse"
              style={{
                background: 'linear-gradient(145deg, rgba(251,191,36,0.18), rgba(236,72,153,0.12))',
                border: '1px solid rgba(251,191,36,0.5)',
                boxShadow: '0 0 24px -6px rgba(251,191,36,0.6), inset 0 0 12px rgba(251,191,36,0.15)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-300">Tier</p>
              <p className="font-heading text-4xl font-bold leading-none mt-0.5 bg-gradient-to-b from-yellow-100 to-orange-400 bg-clip-text text-transparent">
                {currentTier}
              </p>
              <p className="text-[9px] text-slate-500 font-mono mt-1">/ {SEASON_PASS_TIERS}</p>
            </div>
          </div>

          {/* Season progress bar — tiers 0 → 60 */}
          <div className="relative mt-5">
            <div className="h-3 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30] relative">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.max(3, (currentTier / SEASON_PASS_TIERS) * 100)}%`,
                  background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24, #ec4899)',
                  backgroundSize: '200% 100%',
                  animation: 'awakening-fill-flow 3.5s linear infinite',
                  boxShadow: '0 0 16px rgba(251,191,36,0.55)',
                }}
              />
              {[10, 20, 30, 40, 50].map((n) => (
                <span
                  key={n}
                  className="absolute top-0 bottom-0 w-[1.5px] bg-[#08080f]"
                  style={{ left: `${(n / SEASON_PASS_TIERS) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1 px-0.5">
              <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60</span>
            </div>
          </div>

          {/* Current-tier XP bar — shows exactly how close you are to the
              next tier, so progress stops feeling "random". */}
          {currentTier < SEASON_PASS_TIERS && (
            <div className="relative mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-200/90">
                  Tier {currentTier} → {currentTier + 1}
                </span>
                <span className="text-[11px] font-mono text-yellow-200">
                  <b>{xpInTier}</b>
                  <span className="text-slate-500"> / {SEASON_PASS_XP_PER_TIER}</span>
                </span>
              </div>
              <div className="h-2 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30] relative">
                <div
                  className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                  style={{
                    width: `${Math.max(2, tierProgress)}%`,
                    background: 'linear-gradient(90deg, #fbbf24, #f97316, #ec4899)',
                    backgroundSize: '200% 100%',
                    animation: 'awakening-fill-flow 2.4s linear infinite',
                    boxShadow: '0 0 10px rgba(251,191,36,0.6)',
                  }}
                >
                  <div
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{
                      background: 'linear-gradient(95deg, transparent, rgba(255,255,255,0.55), transparent)',
                      animation: 'awakening-shimmer 2.4s ease-in-out infinite',
                      willChange: 'transform',
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                <b className="text-yellow-200">{xpToNext} Pass XP</b> to tier {currentTier + 1}. Complete missions below for chunky rewards.
              </p>
            </div>
          )}

          {/* Premium track — locked banner */}
          <div
            className="relative mt-4 w-full rounded-xl py-2.5 px-3 text-center flex items-center justify-center gap-2"
            style={{
              background:
                'linear-gradient(90deg, rgba(236,72,153,0.18), rgba(249,115,22,0.14) 50%, rgba(251,191,36,0.14))',
              border: '1px solid rgba(236,72,153,0.35)',
              boxShadow: 'inset 0 1px 0 rgba(236,72,153,0.25)',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-300">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="text-xs font-bold bg-gradient-to-r from-pink-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
              Premium Track — coming soon
            </span>
          </div>
        </div>
      </div>

      {/* Missions — primary way to earn Pass XP. Separate from random habit
          logging so the user always has concrete "claim +200" tasks visible. */}
      <MissionsPanel
        missions={MISSIONS}
        progressFor={missionProgress}
        claimedFor={missionClaimed}
        onClaim={handleClaimMission}
        claimingId={claiming}
      />

      {/* Column headers */}
      <div className="grid grid-cols-[52px_1fr_1fr] gap-2 px-1">
        <div />
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Free</span>
        </div>
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
            Premium
          </span>
        </div>
      </div>

      {/* Tier list */}
      <div className="space-y-1.5">
        {tiers.map(({ free, premium }) => {
          const reached = free.tier <= currentTier;
          const freeKey = `${free.tier}-free`;
          const premKey = `${free.tier}-premium`;
          const freeClaimed = claimedSet().has(freeKey);
          const premClaimed = claimedSet().has(premKey);
          const isMilestone = free.tier % 10 === 0 || free.tier === 60;
          return (
            <div
              key={free.tier}
              className={cn(
                'grid grid-cols-[52px_1fr_1fr] gap-2 p-2 rounded-xl border transition-colors relative overflow-hidden',
                reached ? 'bg-[#0b0b14]' : 'bg-[#08080e] opacity-80',
              )}
              style={{
                border: `1px solid ${isMilestone && reached ? 'rgba(251,191,36,0.35)' : '#1e1e30'}`,
                boxShadow: isMilestone && reached ? '0 0 22px -10px rgba(251,191,36,0.5)' : undefined,
              }}
            >
              {/* Milestone ambient glow */}
              {isMilestone && reached && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-40 h-16 blur-3xl pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse, rgba(251,191,36,0.35), transparent 70%)' }}
                />
              )}

              {/* Tier badge */}
              <div
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg font-heading font-bold',
                  isMilestone && 'shadow-[inset_0_0_12px_rgba(251,191,36,0.2)]',
                )}
                style={{
                  background: isMilestone && reached
                    ? 'linear-gradient(145deg, rgba(251,191,36,0.18), rgba(249,115,22,0.1))'
                    : reached
                      ? 'rgba(249,115,22,0.12)'
                      : '#0b0b14',
                  border: `1px solid ${isMilestone && reached ? 'rgba(251,191,36,0.55)' : reached ? 'rgba(249,115,22,0.5)' : '#1e1e30'}`,
                }}
              >
                <span className="text-lg"
                  style={{ color: isMilestone && reached ? '#fbbf24' : reached ? '#f97316' : '#475569' }}>
                  {free.tier}
                </span>
              </div>

              <RewardCell row={free} reached={reached} claimed={freeClaimed} locked={false} onClaim={() => handleClaim(free)} claiming={claiming === freeKey} />
              <RewardCell row={premium} reached={reached} claimed={premClaimed} locked={!isPremium} onClaim={() => handleClaim(premium)} claiming={claiming === premKey} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RewardCell({
  row, reached, claimed, locked, onClaim, claiming,
}: {
  row: PassRow; reached: boolean; claimed: boolean; locked: boolean; onClaim: () => void; claiming: boolean;
}) {
  const s = rankStyles[row.rank];
  const isPremium = row.track === 'premium';

  return (
    <div
      className="relative rounded-lg p-2 overflow-hidden"
      style={{
        background: isPremium
          // Premium cells get a pink→orange→yellow tinted surface regardless of rank,
          // so at-a-glance the two tracks look different.
          ? reached
            ? 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(249,115,22,0.08) 50%, rgba(251,191,36,0.08))'
            : 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(251,191,36,0.04))'
          : reached ? s.bg : '#0b0b14',
        border: `1px solid ${
          isPremium
            ? reached ? 'rgba(251,191,36,0.4)' : 'rgba(236,72,153,0.25)'
            : reached ? s.border : '#1e1e30'
        }`,
      }}
    >
      {/* Premium lock overlay + shimmer */}
      {isPremium && locked && (
        <>
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              background:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0 6px, transparent 6px 12px)',
            }}
          />
          <div className="absolute top-1 right-1">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-300">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
        </>
      )}

      <div className="relative flex items-center justify-between gap-1">
        <span
          className={cn('text-[8px] font-bold uppercase tracking-wider',
            isPremium && 'bg-gradient-to-r from-pink-400 to-yellow-300 bg-clip-text text-transparent')}
          style={{ color: isPremium ? undefined : reached ? s.color : '#475569' }}
        >
          {isPremium ? 'Premium' : s === rankStyles.minor ? 'Free' : s === rankStyles.capstone ? 'Capstone' : s === rankStyles.major ? 'Major' : 'Milestone'}
        </span>
        {claimed && <span className="text-[8px] font-bold text-emerald-400 uppercase">Claimed</span>}
      </div>
      <p className={cn('relative font-mono text-sm font-bold mt-0.5', isPremium ? 'text-yellow-200' : 'text-white')}>
        +{row.fragments}
      </p>
      {row.extra && <p className={cn('relative text-[9px] leading-tight', isPremium ? 'text-pink-200/80' : 'text-slate-500')}>{row.extra}</p>}
      {reached && !claimed && !locked && (
        <Button size="sm" className="w-full mt-1.5" loading={claiming} onClick={onClaim}>
          Claim
        </Button>
      )}
    </div>
  );
}

// ---- Missions panel ----

const kindAccent: Record<Mission['kind'], { label: string; color: string; chipBg: string; chipBorder: string }> = {
  daily:     { label: 'Daily',     color: '#f97316', chipBg: 'rgba(249,115,22,0.14)', chipBorder: 'rgba(249,115,22,0.45)' },
  weekly:    { label: 'Weekly',    color: '#60a5fa', chipBg: 'rgba(96,165,250,0.14)', chipBorder: 'rgba(96,165,250,0.45)' },
  permanent: { label: 'Milestone', color: '#fbbf24', chipBg: 'rgba(251,191,36,0.16)', chipBorder: 'rgba(251,191,36,0.55)' },
};

function MissionsPanel({
  missions, progressFor, claimedFor, onClaim, claimingId,
}: {
  missions: Mission[];
  progressFor: (m: Mission) => number;
  claimedFor: (m: Mission) => boolean;
  onClaim: (m: Mission) => void;
  claimingId: string | null;
}) {
  // Sort: ready-to-claim first, then in-progress, then claimed
  const ready = missions.filter((m) => !claimedFor(m) && progressFor(m) >= m.goal);
  const inProgress = missions.filter((m) => !claimedFor(m) && progressFor(m) < m.goal);
  const done = missions.filter((m) => claimedFor(m));
  const ordered = [...ready, ...inProgress, ...done];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-200">
          Missions
        </p>
        {ready.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/15 border border-orange-500/40 px-1.5 py-0.5 rounded animate-notif-dot-pulse">
            {ready.length} ready
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ordered.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            progress={progressFor(m)}
            claimed={claimedFor(m)}
            claiming={claimingId === `mission-${m.id}`}
            onClaim={() => onClaim(m)}
          />
        ))}
      </div>
    </section>
  );
}

function MissionCard({
  mission, progress, claimed, claiming, onClaim,
}: {
  mission: Mission;
  progress: number;
  claimed: boolean;
  claiming: boolean;
  onClaim: () => void;
}) {
  const accent = kindAccent[mission.kind];
  const pct = Math.min(100, (progress / mission.goal) * 100);
  const ready = !claimed && progress >= mission.goal;

  return (
    <div
      className={cn(
        'relative rounded-xl p-3 border overflow-hidden transition-all',
        ready && 'animate-notif-unread-pulse',
      )}
      style={{
        background: claimed
          ? 'linear-gradient(145deg, rgba(16,185,129,0.08), #0b0b14 70%)'
          : ready
            ? `linear-gradient(145deg, ${accent.chipBg}, ${accent.chipBg.replace('0.14', '0.06').replace('0.16', '0.06')} 60%, #0b0b14 100%)`
            : 'linear-gradient(145deg, #10101a, #0b0b14 80%)',
        borderColor: claimed
          ? 'rgba(16,185,129,0.3)'
          : ready
            ? accent.chipBorder
            : '#1e1e30',
        boxShadow: ready ? `inset 0 0 12px ${accent.color}22` : undefined,
      }}
    >
      {/* Accent stripe */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[2px]"
        style={{
          background: claimed ? '#10b981' : accent.color,
          opacity: claimed ? 0.8 : ready ? 1 : 0.5,
          boxShadow: ready ? `0 0 6px ${accent.color}` : undefined,
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded inline-block"
              style={{
                background: accent.chipBg,
                color: accent.color,
                border: `1px solid ${accent.chipBorder}`,
              }}
            >
              {accent.label}
            </span>
            <p className={cn('text-sm font-semibold mt-1.5 leading-tight', claimed ? 'text-slate-500 line-through' : 'text-white')}>
              {mission.text}
            </p>
            {mission.hint && !claimed && (
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{mission.hint}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Pass XP</p>
            <p
              className="font-mono text-lg font-bold leading-none mt-0.5"
              style={{ color: claimed ? '#64748b' : accent.color }}
            >
              +{mission.reward}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
            <span>{progress} / {mission.goal}</span>
            <span>{Math.floor(pct)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-[#08080f] border border-[#1e1e30]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(2, pct)}%`,
                background: claimed
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : `linear-gradient(90deg, ${accent.color}, ${accent.color}cc)`,
                boxShadow: ready ? `0 0 8px ${accent.color}` : undefined,
              }}
            />
          </div>
        </div>

        {/* Action */}
        <div className="mt-2.5">
          {claimed ? (
            <p className="text-[10px] text-center text-emerald-400 font-bold uppercase tracking-widest py-1">
              Claimed ✓
            </p>
          ) : ready ? (
            <Button size="sm" className="w-full" loading={claiming} onClick={onClaim}>
              Claim +{mission.reward} XP
            </Button>
          ) : (
            <p className="text-[10px] text-center text-slate-600 py-1">
              {mission.goal - progress} to go
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
