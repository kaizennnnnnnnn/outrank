'use client';

import Link from 'next/link';
import { Tournament, TournamentParticipant, TournamentMatch } from '@/types/competition';
import { Avatar } from '@/components/ui/Avatar';
import { TrophyIconFull } from '@/components/ui/AppIcons';

/**
 * Bracket visualization for a 4-player single-elimination tournament.
 *
 * Layout: two semis stacked on the left, one final on the right. Once
 * a final winner is set, a champion plaque pops below the final card.
 * Tapping a match card navigates to that match's duel page so the live
 * HUD + claim flow work as normal.
 *
 * Renders sensibly across all four tournament statuses:
 *   - recruiting: shows the 4 invited avatars + accepted state
 *   - active: shows R1 (and R2 if it has been created)
 *   - completed: shows full bracket + champion plaque
 *   - cancelled: shows a single "cancelled" message
 */
export function TournamentBracket({ tournament }: { tournament: Tournament }) {
  if (tournament.status === 'cancelled') {
    return (
      <div
        style={{
          border: '1px solid var(--b-rule)',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'var(--b-ink-60)',
        }}
      >
        <p className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 6 }}>
          Cancelled
        </p>
        <p className="font-body" style={{ fontSize: 13, fontStyle: 'italic' }}>
          One of the invitees declined.
        </p>
      </div>
    );
  }

  if (tournament.status === 'recruiting') {
    return (
      <div style={{ border: '1px solid var(--b-ink)', padding: '14px 12px' }}>
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
          Recruiting · waiting on accepts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tournament.participants.map((p) => (
            <ParticipantRow key={p.userId} p={p} showAcceptedState />
          ))}
        </div>
      </div>
    );
  }

  // Active / completed — show the bracket grid.
  const matchesByRound = new Map<1 | 2, TournamentMatch[]>([[1, []], [2, []]]);
  for (const m of tournament.matches) {
    const arr = matchesByRound.get(m.roundNumber);
    if (arr) arr.push(m);
  }
  const r1 = matchesByRound.get(1) || [];
  const r2 = matchesByRound.get(2) || [];
  const championId = tournament.championId;
  const champion = championId ? tournament.participants.find((p) => p.userId === championId) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        alignItems: 'center',
      }}
    >
      {/* Left: two semifinal cards stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {r1.length > 0 ? r1.map((m, i) => (
          <MatchCard key={m.competitionId} tournament={tournament} match={m} label={`Semi ${i === 0 ? 'A' : 'B'}`} />
        )) : (
          <>
            <PlaceholderCard label="Semi A" />
            <PlaceholderCard label="Semi B" />
          </>
        )}
      </div>

      {/* Right: final card + (when crowned) champion plaque */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
        {r2.length > 0 ? (
          <MatchCard tournament={tournament} match={r2[0]} label="Final" />
        ) : (
          <PlaceholderCard label="Final" subtle="Winners advance here" />
        )}
        {champion && (
          <div
            style={{
              border: '1px solid var(--b-accent)',
              padding: '10px 8px',
              textAlign: 'center',
              background: 'color-mix(in srgb, var(--b-accent) 8%, var(--b-paper))',
            }}
          >
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 6 }}>
              Champion
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Avatar src={champion.avatarUrl} alt={champion.username} size="md" />
              <span
                className="font-display"
                style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 600 }}
              >
                {champion.username}
              </span>
              <TrophyIconFull size={14} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantRow({ p, showAcceptedState }: { p: TournamentParticipant; showAcceptedState?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Avatar src={p.avatarUrl} alt={p.username} size="sm" />
      <span className="font-body" style={{ fontSize: 12, flex: 1, color: 'var(--b-ink)' }}>
        {p.username}
      </span>
      {showAcceptedState && (
        <span
          className="spread"
          style={{
            fontSize: 8,
            letterSpacing: '0.16em',
            color: p.accepted ? '#34d399' : 'var(--b-ink-40)',
          }}
        >
          {p.accepted ? 'Accepted' : 'Pending'}
        </span>
      )}
    </div>
  );
}

function PlaceholderCard({ label, subtle }: { label: string; subtle?: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--b-rule)',
        padding: '12px 8px',
        textAlign: 'center',
        color: 'var(--b-ink-40)',
      }}
    >
      <div className="spread" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      {subtle && <div className="font-body" style={{ fontSize: 10, fontStyle: 'italic' }}>{subtle}</div>}
    </div>
  );
}

function MatchCard({
  tournament,
  match,
  label,
}: {
  tournament: Tournament;
  match: TournamentMatch;
  label: string;
}) {
  const p1 = tournament.participants.find((p) => p.userId === match.slot1UserId);
  const p2 = tournament.participants.find((p) => p.userId === match.slot2UserId);
  const winnerId = match.winnerUserId;
  return (
    <Link
      href={`/compete/duel/${match.competitionId}`}
      style={{
        display: 'block',
        border: '1px solid var(--b-ink)',
        padding: '8px 10px',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--b-paper)',
      }}
    >
      <div className="spread" style={{ fontSize: 8, color: 'var(--b-ink-60)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Slot p={p1} isWinner={!!winnerId && winnerId === p1?.userId} isLoser={!!winnerId && winnerId !== p1?.userId} />
        <Slot p={p2} isWinner={!!winnerId && winnerId === p2?.userId} isLoser={!!winnerId && winnerId !== p2?.userId} />
      </div>
    </Link>
  );
}

function Slot({
  p,
  isWinner,
  isLoser,
}: {
  p: TournamentParticipant | undefined;
  isWinner: boolean;
  isLoser: boolean;
}) {
  if (!p) {
    return (
      <div className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-40)', fontStyle: 'italic' }}>
        TBD
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: isLoser ? 0.5 : 1,
      }}
    >
      <Avatar src={p.avatarUrl} alt={p.username} size="sm" />
      <span
        className="font-body"
        style={{
          fontSize: 11,
          flex: 1,
          color: isWinner ? 'var(--b-accent)' : 'var(--b-ink)',
          fontWeight: isWinner ? 600 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {p.username}
      </span>
      {isWinner && (
        <span className="spread" style={{ fontSize: 7, color: 'var(--b-accent)', letterSpacing: '0.16em' }}>
          W
        </span>
      )}
    </div>
  );
}
