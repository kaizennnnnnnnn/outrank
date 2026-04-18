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
      {/* Header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.18), rgba(220,38,38,0.08) 40%, #10101a 90%)',
          border: '1px solid rgba(249,115,22,0.35)',
        }}
      >
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-[0.18] blur-3xl pointer-events-none"
          style={{ background: '#f97316' }} />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
              Season {season} · {daysLeft} days left
            </p>
            <h1 className="font-heading text-3xl font-bold text-white mt-1">Battle Pass</h1>
            <p className="text-xs text-slate-500 mt-1">
              Earn season-pass XP from every log and claim rewards here.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tier</p>
            <p className="font-mono text-3xl font-bold text-white">{currentTier}<span className="text-slate-600 text-base"> / {SEASON_PASS_TIERS}</span></p>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="h-2 bg-[#18182a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, (currentTier / SEASON_PASS_TIERS) * 100)}%`,
                background: 'linear-gradient(90deg, #dc2626, #f97316, #fbbf24)',
              }}
            />
          </div>
        </div>

        {/* Premium track — locked for now */}
        <div className="relative mt-4 w-full rounded-xl py-2.5 px-3 text-center border border-pink-500/20 bg-gradient-to-r from-pink-600/10 via-orange-500/10 to-yellow-400/10 flex items-center justify-center gap-2">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-300">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span className="text-xs font-semibold text-pink-300">Premium Track — coming soon</span>
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
