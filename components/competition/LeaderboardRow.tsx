'use client';

import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import Link from 'next/link';

interface LeaderboardRowProps {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  delta: number;
  isCurrentUser?: boolean;
  index: number;
  /** Cosmetics — when supplied, the row shows the user's frame and name effect. */
  frameId?: string;
  nameEffectId?: string;
}

// Roman numerals for the top three — magazine convention shared with
// the editorial /leaderboard page.
const romans = ['I', 'II', 'III'];

export function LeaderboardRow({
  rank, username, avatarUrl, score, delta, isCurrentUser,
  frameId, nameEffectId,
}: LeaderboardRowProps) {
  const isPodium = rank <= 3;
  const rankLabel = isPodium ? romans[rank - 1] : String(rank);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '38px 1fr auto',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--b-rule)',
        background: isCurrentUser ? 'var(--b-paper-2, transparent)' : 'transparent',
        borderLeft: isCurrentUser ? '3px solid var(--b-accent)' : 'none',
        paddingLeft: isCurrentUser ? 12 : 0,
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

      {/* Avatar + name */}
      <Link
        href={`/profile/${username}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <FramedAvatar src={avatarUrl} alt={username} size="sm" frameId={frameId} />
        <div
          style={{
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <NamePlate
            name={username}
            effectId={nameEffectId}
            size="sm"
            className="truncate"
          />
          {isCurrentUser && (
            <span
              className="spread"
              style={{ fontSize: 8, color: 'var(--b-accent)' }}
            >
              You
            </span>
          )}
        </div>
      </Link>

      {/* Score + Delta */}
      <div style={{ textAlign: 'right' }}>
        <div
          className="font-mono tabular"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--b-ink)' }}
        >
          {score.toLocaleString()}
        </div>
        {delta !== 0 && (
          <div
            className="font-mono"
            style={{
              fontSize: 9,
              color: delta > 0 ? '#34d399' : '#ef4444',
              marginTop: 1,
            }}
          >
            {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
          </div>
        )}
      </div>
    </div>
  );
}
