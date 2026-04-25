'use client';

import { useEffect, useState } from 'react';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { getDocument } from '@/lib/firestore';
import { getDuelRewards } from '@/lib/duelRewards';
import { CATEGORIES } from '@/constants/categories';
import { Competition, CompetitionParticipant } from '@/types/competition';
import { cn } from '@/lib/utils';

interface Props {
  comp: Competition;
  currentUserId: string;
}

type LiveSkin = {
  avatarUrl?: string;
  equippedFrame?: string;
  equippedNameEffect?: string;
};

// Page-scoped cache so lots of cards on the Compete page don't refetch
// the same friend doc multiple times.
const liveCache: Record<string, LiveSkin> = {};

/**
 * Active duel card — the in-progress version of DuelEndedCard. Goal is
 * to make a running duel look as much like an arena ticket as the ended
 * version does: live score bar showing who's ahead, countdown to the
 * end of the duel, prize preview, animated "live" indicator, framed
 * avatars + name effects pulled live (so cosmetics equipped after
 * challenge creation still show up).
 */
export function DuelActiveCard({ comp, currentUserId }: Props) {
  const me = comp.participants.find((p) => p.userId === currentUserId);
  const opp = comp.participants.find((p) => p.userId !== currentUserId);
  const [myLive, setMyLive] = useState<LiveSkin>(() => liveCache[me?.userId ?? ''] || {});
  const [oppLive, setOppLive] = useState<LiveSkin>(() => liveCache[opp?.userId ?? ''] || {});

  useEffect(() => {
    if (!me || !opp) return;
    let cancelled = false;
    const pull = async (uid: string, setter: (s: LiveSkin) => void) => {
      if (liveCache[uid]) { setter(liveCache[uid]); return; }
      try {
        const docData = await getDocument<Record<string, unknown>>('users', uid);
        if (!docData) return;
        const skin: LiveSkin = {
          avatarUrl: (docData.avatarUrl as string) || undefined,
          equippedFrame: (docData.equippedFrame as string) || undefined,
          equippedNameEffect: (docData.equippedNameEffect as string) || undefined,
        };
        liveCache[uid] = skin;
        if (!cancelled) setter(skin);
      } catch { /* best-effort, fall back to snapshot */ }
    };
    pull(me.userId, setMyLive);
    pull(opp.userId, setOppLive);
    return () => { cancelled = true; };
  }, [me, opp]);

  if (!me || !opp) return null;

  const myScore = me.score;
  const oppScore = opp.score;
  const total = Math.max(1, myScore + oppScore);
  const myPct = (myScore / total) * 100;
  const oppPct = (oppScore / total) * 100;

  const leading =
    myScore === oppScore ? 'tie' : myScore > oppScore ? 'me' : 'opp';

  // Countdown to endDate. Falls back to "—" if missing.
  const endMs = comp.endDate?.toDate?.()?.getTime?.();
  const remaining = formatRemaining(endMs);

  const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
  const winRewards = getDuelRewards('win', comp.durationDays);

  return (
    <div className="relative group">
      {/* Animated gradient border — slower + cooler than the ended-card
          version so an active duel feels in-progress rather than urgent. */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          padding: 1,
          background:
            'linear-gradient(115deg, rgba(220,38,38,0.55), rgba(249,115,22,0.45) 35%, rgba(236,72,153,0.55) 65%, rgba(220,38,38,0.55))',
          backgroundSize: '220% 100%',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: 'duel-active-border 7s linear infinite',
        }}
      />

      <div
        className="relative rounded-2xl p-4 transition-shadow group-hover:shadow-[0_14px_40px_-18px_rgba(239,68,68,0.5)]"
        style={{
          background:
            'radial-gradient(ellipse 90% 130% at 50% -10%, rgba(239,68,68,0.12), transparent 55%),' +
            'linear-gradient(160deg, #11111c 0%, #07070c 100%)',
        }}
      >
        {/* Top stripe — category + duration + LIVE pill */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 min-w-0">
            <span className="text-base leading-none shrink-0" aria-hidden>{cat?.icon ?? '⚔️'}</span>
            <span className="font-semibold tracking-wide truncate">{cat?.name ?? comp.title}</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="font-mono text-slate-500 hidden sm:inline">{comp.durationDays ?? 7}d</span>
          </div>
          <LivePill remaining={remaining} />
        </div>

        {/* Participant row — avatars + scores + center column */}
        <div className="flex items-center gap-3">
          <Side
            participant={me}
            live={myLive}
            score={myScore}
            highlight={leading === 'me' ? 'leader' : leading === 'tie' ? 'tie' : 'trail'}
            align="left"
          />

          <div className="flex-none flex flex-col items-center px-1 select-none">
            <span
              className="font-heading font-bold text-base leading-none"
              style={{
                background: 'linear-gradient(180deg, #fb923c, #ffffff 50%, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VS
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mt-1">
              {cat?.unit ?? 'score'}
            </span>
          </div>

          <Side
            participant={opp}
            live={oppLive}
            score={oppScore}
            highlight={leading === 'opp' ? 'leader' : leading === 'tie' ? 'tie' : 'trail'}
            align="right"
          />
        </div>

        {/* Live score progress bar — splits toward the leader. */}
        <div className="mt-3 h-2 rounded-full bg-[#0a0a14] overflow-hidden flex border border-[#1e1e30]">
          <div
            className="h-full transition-[width] duration-700"
            style={{
              width: `${myPct}%`,
              background:
                leading === 'me'
                  ? 'linear-gradient(90deg, #f97316, #fbbf24)'
                  : leading === 'tie'
                    ? 'linear-gradient(90deg, #fbbf24, #fde68a)'
                    : 'linear-gradient(90deg, #475569, #334155)',
            }}
          />
          <div
            className="h-full transition-[width] duration-700"
            style={{
              width: `${oppPct}%`,
              background:
                leading === 'opp'
                  ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                  : leading === 'tie'
                    ? 'linear-gradient(90deg, #fde68a, #fbbf24)'
                    : 'linear-gradient(90deg, #334155, #475569)',
            }}
          />
        </div>

        {/* Bottom stripe — prize preview + CTA hint */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="font-bold uppercase tracking-widest text-slate-500">Win</span>
            <span className="font-mono text-orange-300">+{winRewards.xp} XP</span>
            <span className="text-slate-700">·</span>
            <span className="font-mono text-amber-300">+{winRewards.fragments}</span>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-orange-300 transition-colors group-hover:text-orange-200"
            style={{
              background:
                'linear-gradient(90deg, rgba(220,38,38,0.18), rgba(249,115,22,0.10))',
              border: '1px solid rgba(249,115,22,0.30)',
            }}
          >
            Enter arena <span aria-hidden>→</span>
          </span>
        </div>
      </div>

      <style>{`
        @keyframes duel-active-border {
          0%, 100% { background-position: 0% 0%; }
          50%      { background-position: 100% 0%; }
        }
      `}</style>
    </div>
  );
}

function Side({
  participant, live, score, highlight, align,
}: {
  participant: CompetitionParticipant;
  live: LiveSkin;
  score: number;
  highlight: 'leader' | 'trail' | 'tie';
  align: 'left' | 'right';
}) {
  const avatarUrl = live.avatarUrl ?? participant.avatarUrl;
  const frame = live.equippedFrame;
  const nameEffect = live.equippedNameEffect;

  const halo =
    highlight === 'leader'
      ? 'shadow-[0_0_22px_-4px_rgba(249,115,22,0.7)]'
      : highlight === 'tie'
        ? 'shadow-[0_0_18px_-4px_rgba(251,191,36,0.5)]'
        : 'opacity-80';

  return (
    <div
      className={cn(
        'flex-1 min-w-0 flex items-center gap-3',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <div className={cn('relative rounded-full transition-shadow', halo)}>
        <FramedAvatar src={avatarUrl} alt={participant.username} size="md" frameId={frame} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate">
          <NamePlate name={participant.username} effectId={nameEffect} size="sm" />
        </div>
        <p
          className={cn(
            'font-mono text-base font-bold leading-none mt-0.5',
            highlight === 'leader'
              ? 'text-orange-400'
              : highlight === 'tie'
                ? 'text-yellow-400'
                : 'text-slate-500',
          )}
        >
          {score}
        </p>
      </div>
    </div>
  );
}

function LivePill({ remaining }: { remaining: string }) {
  return (
    <span
      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-md"
      style={{
        color: '#fef3c7',
        background:
          'linear-gradient(90deg, rgba(220,38,38,0.20), rgba(249,115,22,0.12))',
        border: '1px solid rgba(239,68,68,0.40)',
      }}
    >
      <span className="relative flex w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping" />
        <span className="relative w-full h-full rounded-full bg-red-500" />
      </span>
      <span className="hidden sm:inline">Live ·</span>
      <span className="font-mono">{remaining}</span>
    </span>
  );
}

function formatRemaining(endMs: number | undefined): string {
  if (!endMs) return '—';
  const ms = endMs - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
