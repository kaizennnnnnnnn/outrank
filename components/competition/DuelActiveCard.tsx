'use client';

import { useEffect, useState } from 'react';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { getDocument } from '@/lib/firestore';
import { getDuelRewards } from '@/lib/duelRewards';
import { CATEGORIES } from '@/constants/categories';
import { Competition, CompetitionParticipant } from '@/types/competition';

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
 * Active duel card — editorial paper-and-ink. Shows live scores, a
 * countdown to the end of the duel, prize preview, and a hairline
 * divider down the middle. Avatars + cosmetics are pulled live so any
 * post-creation equipment shows up correctly.
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
  const leading =
    myScore === oppScore ? 'tie' : myScore > oppScore ? 'me' : 'opp';

  // Countdown to endDate. Falls back to "—" if missing.
  const endMs = comp.endDate?.toDate?.()?.getTime?.();
  const remaining = formatRemaining(endMs);

  const cat = CATEGORIES.find((c) => c.slug === comp.categorySlug);
  const winRewards = getDuelRewards('win', comp.durationDays);

  return (
    <div
      className="dir-b"
      style={{
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        borderLeft: '3px solid var(--b-accent)',
        padding: 16,
        color: 'var(--b-ink)',
      }}
    >
      {/* Top stripe — eyebrow + LIVE pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 8,
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
          Active Duel · {cat?.name ?? comp.title}
        </div>
        <LivePill remaining={remaining} />
      </div>

      {/* Participant row — avatars + scores + center column */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Side
          participant={me}
          live={myLive}
          score={myScore}
          highlight={leading === 'me' ? 'leader' : leading === 'tie' ? 'tie' : 'trail'}
          align="left"
        />

        <div
          style={{
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0 6px',
            borderLeft: '1px solid var(--b-rule)',
            borderRight: '1px solid var(--b-rule)',
            alignSelf: 'stretch',
            justifyContent: 'center',
            userSelect: 'none',
          }}
        >
          <span
            className="font-display"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--b-ink)',
            }}
          >
            vs
          </span>
          <span
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 4 }}
          >
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

      {/* Bottom stripe — prize preview + CTA hint */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: '1px solid var(--b-rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', letterSpacing: '0.04em' }}
        >
          <span className="spread" style={{ fontSize: 9, marginRight: 6 }}>Win</span>
          <span style={{ color: 'var(--b-ink)' }}>+{winRewards.xp} XP</span>
          <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--b-accent)' }}>+{winRewards.fragments} frags</span>
        </div>
        <span
          className="spread"
          style={{
            fontSize: 9,
            color: 'var(--b-ink)',
            borderBottom: '1px solid var(--b-ink)',
            paddingBottom: 1,
          }}
        >
          Enter arena →
        </span>
      </div>
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

  const scoreColor =
    highlight === 'leader' ? 'var(--b-accent)'
      : highlight === 'tie' ? 'var(--b-ink)'
        : 'var(--b-ink-60)';

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexDirection: align === 'right' ? 'row-reverse' : 'row',
        textAlign: align === 'right' ? 'right' : 'left',
      }}
    >
      <FramedAvatar src={avatarUrl} alt={participant.username} size="md" frameId={frame} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <NamePlate name={participant.username} effectId={nameEffect} size="sm" />
        </div>
        <p
          className="font-display tabular"
          style={{
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 22,
            lineHeight: 1,
            color: scoreColor,
            margin: '2px 0 0',
          }}
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        border: '1px solid var(--b-accent)',
        color: 'var(--b-accent)',
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex', width: 6, height: 6 }}>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 9999,
            background: 'var(--b-accent)',
            animation: 'b-live-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
            opacity: 0.6,
          }}
        />
        <span
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 9999,
            background: 'var(--b-accent)',
          }}
        />
      </span>
      <span className="font-mono tabular" style={{ letterSpacing: '0.04em' }}>{remaining}</span>
      <style>{`
        @keyframes b-live-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
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
