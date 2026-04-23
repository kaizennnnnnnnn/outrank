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
  onClaim: (comp: Competition) => void;
}

type LiveSkin = {
  avatarUrl?: string;
  equippedFrame?: string;
  equippedNameEffect?: string;
};

// Keep live-user cache simple and page-scoped. Avoids refetching the
// same user doc across multiple cards on the same render.
const liveCache: Record<string, LiveSkin> = {};

/**
 * Premium "duel ended, come claim your rewards" card.
 *
 * Why it's built this way:
 * - Avatars on duels were stored as a snapshot at challenge-creation time,
 *   so if a user hadn't uploaded a picture back then (or hadn't equipped a
 *   frame/name effect), that stale '' sat in the participants array forever.
 *   We pull the live user doc per participant and use whatever's current —
 *   that restores missing PFPs and also lights up any cosmetics they've
 *   equipped since.
 * - The verdict + rewards are visible *before* tapping, so the card is
 *   its own preview of the full-screen reveal (the reveal still plays
 *   the animation on claim).
 */
export function DuelEndedCard({ comp, currentUserId, onClaim }: Props) {
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
        const doc = await getDocument<Record<string, unknown>>('users', uid);
        if (!doc) return;
        const skin: LiveSkin = {
          avatarUrl: (doc.avatarUrl as string) || undefined,
          equippedFrame: (doc.equippedFrame as string) || undefined,
          equippedNameEffect: (doc.equippedNameEffect as string) || undefined,
        };
        liveCache[uid] = skin;
        if (!cancelled) setter(skin);
      } catch { /* best-effort; fall back to stored snapshot */ }
    };
    pull(me.userId, setMyLive);
    pull(opp.userId, setOppLive);
    return () => { cancelled = true; };
  }, [me, opp]);

  if (!me || !opp) return null;

  const myScore = me.score;
  const oppScore = opp.score;
  const tie = myScore === oppScore;
  const won = !tie && myScore > oppScore;
  const outcome = won ? 'win' : tie ? 'tie' : 'loss';
  const { xp, fragments } = getDuelRewards(outcome, comp.durationDays);
  const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);

  const total = Math.max(1, myScore + oppScore);
  const myPct = (myScore / total) * 100;
  const oppPct = (oppScore / total) * 100;

  const verdictLabel = tie ? 'Draw' : won ? 'Victory' : 'Defeat';
  const verdictColor = tie ? '#fbbf24' : won ? '#f97316' : '#64748b';

  return (
    <button
      type="button"
      onClick={() => onClaim(comp)}
      className="group relative w-full text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60"
    >
      {/* Animated pulsing border on unclaimed duels to draw attention */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-90"
        style={{
          padding: 1,
          background:
            'linear-gradient(120deg, rgba(249,115,22,0.55), rgba(251,191,36,0.35) 40%, rgba(220,38,38,0.55) 80%)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: 'duel-ended-border 3.5s ease-in-out infinite',
        }}
      />

      {/* Body */}
      <div
        className="relative rounded-2xl p-4"
        style={{
          background:
            'radial-gradient(ellipse 90% 130% at 50% -10%, rgba(249,115,22,0.10), transparent 55%),' +
            'linear-gradient(160deg, #0f0f18 0%, #07070c 100%)',
          boxShadow: '0 10px 30px -18px rgba(249,115,22,0.4)',
        }}
      >
        {/* Top strip — category + duration + verdict ribbon */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-base leading-none" aria-hidden>{cat?.icon ?? '🏆'}</span>
            <span className="font-semibold tracking-wide">{cat?.name ?? comp.title}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-500">{comp.durationDays ?? 7}d</span>
          </div>
          <VerdictRibbon label={verdictLabel} color={verdictColor} />
        </div>

        {/* Participant row */}
        <div className="flex items-center gap-3">
          <ParticipantSide
            participant={me}
            live={myLive}
            score={myScore}
            highlight={won ? 'winner' : tie ? 'tie' : 'loser'}
            align="left"
          />

          <div className="flex-none flex flex-col items-center px-1">
            <span
              className="font-heading font-bold text-lg leading-none"
              style={{
                background: `linear-gradient(180deg, ${verdictColor}, #ffffff 50%, ${verdictColor})`,
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

          <ParticipantSide
            participant={opp}
            live={oppLive}
            score={oppScore}
            highlight={!won && !tie ? 'winner' : tie ? 'tie' : 'loser'}
            align="right"
          />
        </div>

        {/* Score progress — fills toward the winner */}
        <div className="mt-3 h-1.5 rounded-full bg-[#12121c] overflow-hidden flex">
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${myPct}%`,
              background: won
                ? 'linear-gradient(90deg, #f97316, #fbbf24)'
                : tie
                  ? 'linear-gradient(90deg, #fbbf24, #fde68a)'
                  : 'linear-gradient(90deg, #334155, #475569)',
            }}
          />
          <div
            className="h-full transition-[width] duration-500"
            style={{
              width: `${oppPct}%`,
              background: !won && !tie
                ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                : tie
                  ? 'linear-gradient(90deg, #fde68a, #fbbf24)'
                  : 'linear-gradient(90deg, #475569, #334155)',
            }}
          />
        </div>

        {/* Reward preview + CTA */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RewardPill value={`+${xp}`} label="XP" tint="#f97316" />
            <RewardPill value={`+${fragments}`} label="Fragments" tint="#fbbf24" />
          </div>
          <span
            className="text-[11px] font-bold uppercase tracking-wider pl-2 pr-1 py-1 rounded-md"
            style={{
              color: '#fde68a',
              background:
                'linear-gradient(90deg, rgba(249,115,22,0.18), rgba(251,191,36,0.10))',
              border: '1px solid rgba(251,191,36,0.35)',
            }}
          >
            Tap to claim <span aria-hidden>→</span>
          </span>
        </div>
      </div>

      <style>{`
        @keyframes duel-ended-border {
          0%, 100% { opacity: 0.65; filter: hue-rotate(0deg); }
          50%      { opacity: 1;    filter: hue-rotate(-12deg); }
        }
      `}</style>
    </button>
  );
}

function ParticipantSide({
  participant,
  live,
  score,
  highlight,
  align,
}: {
  participant: CompetitionParticipant;
  live: LiveSkin;
  score: number;
  highlight: 'winner' | 'loser' | 'tie';
  align: 'left' | 'right';
}) {
  // Live avatar takes priority; fall back to stored snapshot only if the
  // user doc fetch failed. This is what restores the missing PFPs.
  const avatarUrl = live.avatarUrl ?? participant.avatarUrl;
  const frame = live.equippedFrame;
  const nameEffect = live.equippedNameEffect;

  const haloClass =
    highlight === 'winner'
      ? 'shadow-[0_0_32px_-4px_rgba(249,115,22,0.75)]'
      : highlight === 'tie'
        ? 'shadow-[0_0_24px_-4px_rgba(251,191,36,0.55)]'
        : 'opacity-75';

  return (
    <div
      className={cn(
        'flex-1 min-w-0 flex items-center gap-3',
        align === 'right' && 'flex-row-reverse text-right',
      )}
    >
      <div className={cn('relative rounded-full transition-shadow', haloClass)}>
        <FramedAvatar src={avatarUrl} alt={participant.username} size="md" frameId={frame} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate">
          <NamePlate name={participant.username} effectId={nameEffect} size="sm" />
        </div>
        <p
          className={cn(
            'font-mono text-lg leading-none mt-0.5',
            highlight === 'winner'
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

function VerdictRibbon({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="relative overflow-hidden text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-md"
      style={{
        color: '#fff',
        background: `linear-gradient(110deg, ${color}33, ${color}11 50%, ${color}33)`,
        border: `1px solid ${color}55`,
        textShadow: `0 0 12px ${color}88`,
      }}
    >
      {label}
    </span>
  );
}

function RewardPill({ value, label, tint }: { value: string; label: string; tint: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{
        background: `linear-gradient(145deg, ${tint}18, #0b0b14 75%)`,
        border: `1px solid ${tint}33`,
      }}
    >
      <span className="font-mono text-sm font-bold leading-none" style={{ color: tint }}>{value}</span>
      <span className="text-[9px] uppercase tracking-wider text-slate-500 leading-none">{label}</span>
    </div>
  );
}
