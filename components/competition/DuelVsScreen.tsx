'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { CompetitionParticipant } from '@/types/competition';

interface DuelVsScreenProps {
  player1: CompetitionParticipant;
  player2: CompetitionParticipant;
  title: string;
  timeRemaining?: string;
  /** Which player's score just changed — drives the brief scale pulse on
   *  the matching score number. Set on each onSnapshot tick, cleared a
   *  beat later by the parent. */
  pulseSide?: 'p1' | 'p2' | null;
}

export function DuelVsScreen({ player1, player2, title, timeRemaining, pulseSide }: DuelVsScreenProps) {
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
        background: 'var(--b-paper)',
        border: '1px solid var(--b-ink)',
        borderTop: '3px solid var(--b-accent)',
        padding: '24px 22px 22px',
        color: 'var(--b-ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 18,
          paddingBottom: 8,
          borderBottom: '1px solid var(--b-rule)',
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          The Duel
        </div>
        <span
          className="font-mono tabular"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-60)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
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
        <PlayerSide
          username={player1.username}
          avatarUrl={player1.avatarUrl}
          score={player1.score}
          isLeader={leader === 'p1'}
          slideFrom={-40}
          pulse={pulseSide === 'p1'}
        />

        {/* VS Center — bigger italic display + a hairline halo
            framing the centerpiece */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.25, duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '0 14px',
            alignSelf: 'stretch',
            minHeight: 180,
            position: 'relative',
          }}
        >
          {/* Hairline diamond frame around the VS */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 78,
              height: 78,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              border: '1px solid var(--b-rule)',
              pointerEvents: 'none',
            }}
          />
          <span
            className="font-display metallic-shine"
            style={{
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 64,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            vs
          </span>
          {timeRemaining && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <p className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)' }}>
                Time Left
              </p>
              <p
                className="font-mono tabular"
                style={{
                  fontSize: 11,
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
        <PlayerSide
          username={player2.username}
          avatarUrl={player2.avatarUrl}
          score={player2.score}
          isLeader={leader === 'p2'}
          slideFrom={40}
          pulse={pulseSide === 'p2'}
        />
      </div>

      {/* Score split rule — fattened to 5px and capped with hairline ink */}
      <div
        style={{
          marginTop: 24,
          height: 5,
          display: 'flex',
          border: '1px solid var(--b-ink)',
          background: 'var(--b-paper)',
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
      <div
        className="font-mono tabular"
        style={{
          marginTop: 6,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: 'var(--b-ink-60)',
          letterSpacing: '0.04em',
        }}
      >
        <span>{Math.round(p1Pct)}%</span>
        <span>{Math.round(p2Pct)}%</span>
      </div>
    </div>
  );
}

function PlayerSide({
  username,
  avatarUrl,
  score,
  isLeader,
  slideFrom,
  pulse,
}: {
  username: string;
  avatarUrl: string;
  score: number;
  isLeader: boolean;
  slideFrom: number;
  pulse?: boolean;
}) {
  const isLeft = slideFrom < 0;
  return (
    <motion.div
      initial={{ x: slideFrom, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Avatar in a hairline-rimmed plinth — gives the player a
          podium-style frame without depending on cosmetic frame data. */}
      <div
        style={{
          position: 'relative',
          padding: 4,
          background: isLeader
            ? 'color-mix(in srgb, var(--b-accent) 7%, var(--b-paper))'
            : 'var(--b-paper)',
          border: isLeader ? '1px solid var(--b-accent)' : '1px solid var(--b-ink)',
        }}
      >
        <Avatar src={avatarUrl} alt={username} size="xl" />
        {isLeader && (
          <span
            className="spread"
            aria-label="Leader"
            style={{
              position: 'absolute',
              top: -10,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '2px 7px',
              background: 'var(--b-accent)',
              color: '#ffffff',
              fontSize: 8,
              letterSpacing: '0.16em',
              whiteSpace: 'nowrap',
            }}
          >
            Leader
          </span>
        )}
      </div>

      <p
        className="font-display"
        style={{
          fontSize: 14,
          fontStyle: 'italic',
          fontWeight: 600,
          color: 'var(--b-ink)',
          margin: 0,
          textAlign: 'center',
          maxWidth: 130,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {username}
      </p>

      <p
        className={`font-display tabular${pulse ? ' score-pulse' : ''}`}
        style={{
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 46,
          lineHeight: 1,
          color: isLeader ? 'var(--b-accent)' : 'var(--b-ink)',
          margin: 0,
          letterSpacing: '-0.02em',
          textShadow: isLeader ? '0 0 20px color-mix(in srgb, var(--b-accent) 35%, transparent)' : 'none',
          transformOrigin: 'center',
        }}
      >
        {score}
      </p>
      {/* Small spread caps unit hint reading "POINTS" in muted ink */}
      <span
        className="spread"
        style={{
          fontSize: 7.5,
          color: 'var(--b-ink-60)',
          letterSpacing: '0.22em',
          marginTop: -4,
          textAlign: isLeft ? 'center' : 'center',
        }}
      >
        Points
      </span>
    </motion.div>
  );
}
