'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BATTLE_PASS, PassRow } from '@/constants/battlePass';
import { getCurrentSeason, getSeasonDaysLeft, getSeasonPassTier, SEASON_PASS_TIERS } from '@/constants/seasons';
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
  const addToast = useUIStore((s) => s.addToast);

  const userRaw = user as unknown as Record<string, unknown> | undefined;
  const seasonPassXP = (userRaw?.seasonPassXP as number) || 0;
  const currentTier = getSeasonPassTier(seasonPassXP);
  const season = getCurrentSeason();
  const daysLeft = getSeasonDaysLeft();
  // Premium track is permanently locked for now (coming soon).
  const isPremium = false;
  const claimed = (userRaw?.claimedPassTiers as number[]) || [];

  const [claiming, setClaiming] = useState<string | null>(null);

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

          {/* Progress bar with segment ticks */}
          <div className="relative mt-5">
            <div className="h-3 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30] relative">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(3, (currentTier / SEASON_PASS_TIERS) * 100)}%`,
                  background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24, #ec4899)',
                  boxShadow: '0 0 16px rgba(251,191,36,0.55)',
                }}
              />
              {/* Milestone notches */}
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
