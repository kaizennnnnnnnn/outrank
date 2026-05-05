'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Competition } from '@/types/competition';
import Link from 'next/link';

interface DuelCardProps {
  competition: Competition;
  currentUserId: string;
}

export function DuelCard({ competition, currentUserId }: DuelCardProps) {
  const me = competition.participants.find((p) => p.userId === currentUserId);
  const opponent = competition.participants.find((p) => p.userId !== currentUserId);

  if (!me || !opponent) return null;

  const isWinning = me.score > opponent.score;
  const isTied = me.score === opponent.score;
  const diff = isTied ? 'Tied' : isWinning ? `+${me.score - opponent.score}` : `−${opponent.score - me.score}`;
  const diffColor = isWinning ? 'var(--b-accent)' : isTied ? 'var(--b-ink-60)' : 'var(--b-ink-40)';
  const stateColor = competition.status === 'active' ? 'var(--b-accent)' : 'var(--b-ink-60)';

  return (
    <Link
      href={`/compete/duel/${competition.id}`}
      className="dir-b"
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'var(--b-ink)',
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        borderLeft: `3px solid ${stateColor}`,
        padding: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          {competition.status === 'active' ? 'Active Duel' : competition.status}
        </div>
        <div
          className="font-mono tabular"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
        >
          § {competition.title}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Me */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar src={me.avatarUrl} alt={me.username} size="md" />
          <div style={{ minWidth: 0 }}>
            <p
              className="font-body"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--b-ink)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {me.username}
            </p>
            <p
              className="font-display tabular"
              style={{
                fontSize: 22,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {me.score}
            </p>
          </div>
        </div>

        {/* VS */}
        <div style={{ textAlign: 'center', padding: '0 12px' }}>
          <div
            className="font-display"
            style={{
              fontSize: 22,
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--b-ink-40)',
              lineHeight: 1,
            }}
          >
            vs
          </div>
          <div
            className="font-mono tabular"
            style={{
              fontSize: 10,
              fontWeight: 700,
              marginTop: 4,
              color: diffColor,
              letterSpacing: '0.04em',
            }}
          >
            {diff}
          </div>
        </div>

        {/* Opponent */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            justifyContent: 'flex-end',
            textAlign: 'right',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              className="font-body"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--b-ink)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {opponent.username}
            </p>
            <p
              className="font-display tabular"
              style={{
                fontSize: 22,
                fontStyle: 'italic',
                fontWeight: 500,
                color: 'var(--b-ink)',
                margin: 0,
                lineHeight: 1,
              }}
            >
              {opponent.score}
            </p>
          </div>
          <Avatar src={opponent.avatarUrl} alt={opponent.username} size="md" />
        </div>
      </div>
    </Link>
  );
}
