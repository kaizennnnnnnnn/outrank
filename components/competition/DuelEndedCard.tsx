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
 * Editorial "duel ended, come claim your rewards" card.
 *
 * Avatars on duels were stored as a snapshot at challenge-creation
 * time, so if the user hadn't uploaded a picture / hadn't equipped a
 * frame, that stale '' sat in the participants array. We pull the
 * live user doc per participant and use whatever's current — that
 * restores missing PFPs and lights up freshly equipped cosmetics.
 *
 * The card winner gets a 2px ink top-rule. Defeat / draw stay on the
 * normal hairline. The whole card is a button — tapping it opens the
 * full-screen DuelResultModal claim flow.
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

  const verdictLabel = tie ? 'Draw' : won ? 'Victory' : 'Defeat';
  const verdictColor = tie ? 'var(--b-ink)' : won ? 'var(--b-accent)' : 'var(--b-ink-60)';

  return (
    <button
      type="button"
      onClick={() => onClaim(comp)}
      className="dir-b"
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        color: 'var(--b-ink)',
        border: '1px solid var(--b-rule)',
        borderTop: won ? '2px solid var(--b-ink)' : '1px solid var(--b-rule)',
        padding: 16,
        cursor: 'pointer',
      }}
    >
      {/* Top strip — eyebrow + verdict */}
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
          Duel Ended · {cat?.name ?? comp.title}
        </div>
        <span
          className="spread"
          style={{
            fontSize: 9,
            padding: '2px 8px',
            border: `1px solid ${verdictColor}`,
            color: verdictColor,
          }}
        >
          {verdictLabel}
        </span>
      </div>

      {/* Participant row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <ParticipantSide
          participant={me}
          live={myLive}
          score={myScore}
          highlight={won ? 'winner' : tie ? 'tie' : 'loser'}
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

        <ParticipantSide
          participant={opp}
          live={oppLive}
          score={oppScore}
          highlight={!won && !tie ? 'winner' : tie ? 'tie' : 'loser'}
          align="right"
        />
      </div>

      {/* Reward preview + CTA */}
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
          <span style={{ color: 'var(--b-ink)' }}>+{xp} XP</span>
          <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
          <span style={{ color: 'var(--b-accent)' }}>+{fragments} frags</span>
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
          Tap to claim →
        </span>
      </div>
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
  // Live avatar takes priority; fall back to stored snapshot only if
  // the user doc fetch failed. This is what restores missing PFPs.
  const avatarUrl = live.avatarUrl ?? participant.avatarUrl;
  const frame = live.equippedFrame;
  const nameEffect = live.equippedNameEffect;

  const scoreColor =
    highlight === 'winner' ? 'var(--b-accent)'
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
