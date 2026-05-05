'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { FriendsLeagueEntry } from '@/types/friendsLeague';

interface Props {
  entry: FriendsLeagueEntry;
  isMe: boolean;
  /** Show the reward chip for top-3 even when score is 0. */
  showRewardPreview: boolean;
}

// Roman numerals for the top three — magazine convention shared with
// the editorial /leaderboard page.
const romans = ['I', 'II', 'III'];

/**
 * One row in the friends-league leaderboard. Top 3 get the roman-numeral
 * podium treatment + a reward preview chip; the user's own row gets a
 * 3px ink left-rule regardless of rank.
 */
export function LeagueRow({ entry, isMe, showRewardPreview }: Props) {
  const isPodium = entry.rank >= 1 && entry.rank <= 3;
  const rankLabel = isPodium ? romans[entry.rank - 1] : String(entry.rank);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '38px auto 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--b-rule)',
        borderLeft: isMe ? '3px solid var(--b-accent)' : '3px solid transparent',
        paddingLeft: isMe ? 12 : 0,
        background: isMe ? 'var(--b-paper-2, transparent)' : 'transparent',
      }}
    >
      {/* Rank */}
      <div
        className="font-display tabular"
        style={{
          fontSize: isPodium ? 22 : 14,
          fontStyle: isPodium ? 'italic' : 'normal',
          fontWeight: 500,
          textAlign: 'right',
          color: isPodium ? 'var(--b-ink)' : 'var(--b-ink-40)',
          letterSpacing: isPodium ? 0 : '0.02em',
        }}
      >
        {rankLabel}
      </div>

      <Link href={isMe ? '/profile' : `/profile/${entry.username}`} style={{ flexShrink: 0 }}>
        <Avatar src={entry.avatarUrl} alt={entry.username} size="sm" />
      </Link>

      <div style={{ minWidth: 0 }}>
        <Link
          href={isMe ? '/profile' : `/profile/${entry.username}`}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--b-ink)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: '100%',
          }}
          className="font-body truncate"
        >
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.username}
          </span>
          {isMe && (
            <span
              className="spread"
              style={{ fontSize: 8, color: 'var(--b-accent)', flexShrink: 0 }}
            >
              You
            </span>
          )}
        </Link>
        <p
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
        >
          <span style={{ color: 'var(--b-ink)' }}>
            {entry.score.toLocaleString()}
          </span>{' '}
          XP this week
        </p>
      </div>

      {showRewardPreview && entry.reward > 0 && (
        <span
          className="font-mono tabular"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            border: '1px solid var(--b-accent)',
            color: 'var(--b-accent)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
          title="Estimated reward if standings hold to Sunday"
        >
          +{entry.reward}
        </span>
      )}
    </div>
  );
}
