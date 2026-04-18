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
  const isPremium = (userRaw?.seasonPassPremium as boolean) || false;
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
      await updateDocument('users', user.uid, {
        fragments: increment(row.fragments),
        claimedPassTiers: arrayUnion(key),
      });
      addToast({ type: 'success', message: `Tier ${row.tier} claimed · +${row.fragments} fragments` });
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

        {!isPremium && (
          <button
            onClick={async () => {
              try {
                await updateDocument('users', user.uid, { seasonPassPremium: true });
                addToast({ type: 'success', message: 'Premium track unlocked!' });
              } catch {
                addToast({ type: 'error', message: 'Could not unlock' });
              }
            }}
            className="relative mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white bg-gradient-to-r from-pink-600 via-orange-500 to-yellow-400 hover:opacity-90 transition-opacity"
          >
            Unlock Premium Track
          </button>
        )}
      </div>

      {/* Track legend */}
      <div className="flex items-center justify-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-600" /> Free</div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gradient-to-r from-pink-500 to-orange-400" /> Premium
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
          return (
            <div
              key={free.tier}
              className={cn(
                'grid grid-cols-[46px_1fr_1fr] gap-2 p-2 rounded-xl border transition-colors',
                reached ? 'border-[#1e1e30] bg-[#0b0b14]' : 'border-[#12121c] bg-[#08080e] opacity-70',
              )}
            >
              {/* Tier badge */}
              <div
                className="flex flex-col items-center justify-center rounded-lg"
                style={{
                  background: reached ? 'rgba(249,115,22,0.12)' : '#0b0b14',
                  border: `1px solid ${reached ? 'rgba(249,115,22,0.5)' : '#1e1e30'}`,
                }}
              >
                <span className="font-heading font-bold text-lg"
                  style={{ color: reached ? '#f97316' : '#475569' }}>{free.tier}</span>
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
  return (
    <div
      className="rounded-lg p-2"
      style={{
        background: reached ? s.bg : '#0b0b14',
        border: `1px solid ${reached ? s.border : '#1e1e30'}`,
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[8px] font-bold uppercase tracking-wider"
          style={{ color: reached ? s.color : '#475569' }}>
          {row.track}{locked ? ' · locked' : ''}
        </span>
        {claimed && <span className="text-[8px] font-bold text-emerald-400 uppercase">Claimed</span>}
      </div>
      <p className="font-mono text-sm font-bold text-white mt-0.5">+{row.fragments}</p>
      {row.extra && <p className="text-[9px] text-slate-500 leading-tight">{row.extra}</p>}
      {reached && !claimed && !locked && (
        <Button size="sm" className="w-full mt-1.5" loading={claiming} onClick={onClaim}>
          Claim
        </Button>
      )}
    </div>
  );
}
