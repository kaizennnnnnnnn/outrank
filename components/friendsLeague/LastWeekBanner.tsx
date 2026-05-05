'use client';

import Link from 'next/link';
import { FriendsLeagueSnapshot } from '@/types/friendsLeague';

interface Props {
  snapshot: FriendsLeagueSnapshot;
}

// Roman numerals for the top three — shared editorial convention.
const romans = ['I', 'II', 'III'];

/**
 * Editorial blockquote-style banner above the live leaderboard surfacing
 * the user's result from the week that just ended, plus the previous
 * week's top 3.
 */
export function LastWeekBanner({ snapshot }: Props) {
  const onPodium = snapshot.myRank >= 1 && snapshot.myRank <= 3;
  if (snapshot.myRank > 10 || snapshot.standings.length === 0) return null;

  const label =
    snapshot.myRank === 1 ? 'You won the week.' :
    snapshot.myRank === 2 ? 'You took second.' :
    snapshot.myRank === 3 ? 'You took third.' :
    `You finished ${snapshot.myRank}th.`;

  // Top three of the prior week, for the entries strip.
  const topThree = snapshot.standings.slice(0, 3);

  return (
    <div
      className="dir-b"
      style={{
        background: 'transparent',
        borderTop: '2px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-rule)',
        padding: '14px 16px',
        color: 'var(--b-ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
          Last Week · {snapshot.weekKey}
        </div>
        <Link
          href="/inventory"
          className="spread"
          style={{
            fontSize: 9,
            color: 'var(--b-ink)',
            textDecoration: 'none',
            borderBottom: '1px solid var(--b-ink)',
            paddingBottom: 1,
          }}
        >
          View →
        </Link>
      </div>

      <p
        className="font-display"
        style={{
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.1,
          margin: 0,
          color: onPodium ? 'var(--b-ink)' : 'var(--b-ink-60)',
        }}
      >
        Top 3
      </p>

      {/* Three rank entries with reward in mono accent */}
      <ol
        style={{
          listStyle: 'none',
          margin: '10px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {topThree.map((entry, i) => (
          <li
            key={entry.userId}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              alignItems: 'baseline',
              gap: 10,
              paddingBottom: 6,
              borderBottom: i === topThree.length - 1 ? 'none' : '1px solid var(--b-rule)',
            }}
          >
            <span
              className="font-display tabular"
              style={{
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 16,
                color: 'var(--b-ink)',
                textAlign: 'right',
              }}
            >
              {romans[i]}
            </span>
            <span
              className="font-body"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--b-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.username}
            </span>
            <span
              className="font-mono tabular"
              style={{
                fontSize: 11,
                color: 'var(--b-accent)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {entry.reward > 0 ? `+${entry.reward}` : '—'}
            </span>
          </li>
        ))}
      </ol>

      {/* User's own line — restated below the top 3 */}
      <p
        className="font-mono tabular"
        style={{
          fontSize: 10,
          color: 'var(--b-ink-60)',
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--b-rule)',
        }}
      >
        {label}{' '}
        <span style={{ color: 'var(--b-ink)' }}>
          {snapshot.myScore.toLocaleString()} XP
        </span>
        {snapshot.myReward > 0 && (
          <>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            <span style={{ color: 'var(--b-accent)' }}>
              +{snapshot.myReward} fragments paid out
            </span>
          </>
        )}
      </p>
    </div>
  );
}
