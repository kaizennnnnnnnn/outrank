'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { CompetitionParticipant } from '@/types/competition';

interface DuelVsScreenProps {
  player1: CompetitionParticipant;
  player2: CompetitionParticipant;
  title: string;
  timeRemaining?: string;
}

export function DuelVsScreen({ player1, player2, title, timeRemaining }: DuelVsScreenProps) {
  const total = Math.max(1, player1.score + player2.score);
  const p1Pct = (player1.score / total) * 100;
  const p2Pct = (player2.score / total) * 100;
  const leader =
    player1.score === player2.score ? 'tie'
      : player1.score > player2.score ? 'p1' : 'p2';

  return (
    <div
      className="dir-b"
      style={{
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        borderTop: '2px solid var(--b-ink)',
        padding: 28,
        color: 'var(--b-ink)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
          The Duel
        </div>
        <p
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Player 1 */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Avatar src={player1.avatarUrl} alt={player1.username} size="xl" />
          <p
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--b-ink)',
              margin: 0,
            }}
          >
            {player1.username}
          </p>
          <p
            className="font-display tabular"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1,
              color: leader === 'p1' ? 'var(--b-accent)' : 'var(--b-ink)',
              margin: 0,
            }}
          >
            {player1.score}
          </p>
        </motion.div>

        {/* VS Center — hairline divider both sides */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.3, duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '0 16px',
            borderLeft: '1px solid var(--b-rule)',
            borderRight: '1px solid var(--b-rule)',
            alignSelf: 'stretch',
            justifyContent: 'center',
            minHeight: 140,
          }}
        >
          <span
            className="font-display"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 1,
              color: 'var(--b-ink)',
            }}
          >
            vs
          </span>
          {timeRemaining && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <p className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
                Time Left
              </p>
              <p
                className="font-mono tabular"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--b-ink)',
                  marginTop: 2,
                  letterSpacing: '0.04em',
                }}
              >
                {timeRemaining}
              </p>
            </div>
          )}
        </motion.div>

        {/* Player 2 */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Avatar src={player2.avatarUrl} alt={player2.username} size="xl" />
          <p
            className="font-body"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--b-ink)',
              margin: 0,
            }}
          >
            {player2.username}
          </p>
          <p
            className="font-display tabular"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1,
              color: leader === 'p2' ? 'var(--b-accent)' : 'var(--b-ink)',
              margin: 0,
            }}
          >
            {player2.score}
          </p>
        </motion.div>
      </div>

      {/* Score split rule */}
      <div
        style={{
          marginTop: 28,
          height: 3,
          display: 'flex',
          border: '1px solid var(--b-ink)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${p1Pct}%`,
            background: leader === 'p1' ? 'var(--b-accent)' : 'var(--b-ink-40)',
            transition: 'width 500ms ease',
          }}
        />
        <div
          style={{
            height: '100%',
            width: `${p2Pct}%`,
            background: leader === 'p2' ? 'var(--b-accent)' : 'var(--b-ink-40)',
            transition: 'width 500ms ease',
          }}
        />
      </div>
    </div>
  );
}
