'use client';

import { BADGES } from '@/constants/badges';
import { EarnedBadge, RARITY_COLORS } from '@/types/badge';
import { useCollection } from '@/hooks/useFirestore';
import { Skeleton } from '@/components/ui/Skeleton';

interface BadgeGridProps {
  userId: string;
  compact?: boolean;
}

export function BadgeGrid({ userId, compact }: BadgeGridProps) {
  const { data: earned, loading } = useCollection<EarnedBadge & { id: string }>(
    `userBadges/${userId}/earned`,
    [],
    true
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  const earnedIds = earned.map((e) => e.badgeId);
  const displayBadges = compact ? BADGES.slice(0, 12) : BADGES;

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {displayBadges.map((badge, i) => {
        const isEarned = earnedIds.includes(badge.id);
        const color = RARITY_COLORS[badge.rarity];
        return (
          <li
            key={badge.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr auto',
              gap: 10,
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--b-rule)',
              borderLeft: isEarned ? `3px solid ${color}` : '3px solid transparent',
              paddingLeft: 8,
              opacity: isEarned ? 1 : 0.45,
            }}
          >
            <div
              className="font-mono tabular"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-40)',
                textAlign: 'right',
                letterSpacing: '0.04em',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                className="font-display"
                style={{
                  fontSize: 13,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  lineHeight: 1.15,
                  color: isEarned ? 'var(--b-ink)' : 'var(--b-ink-60)',
                }}
              >
                {badge.name}
              </div>
              {!compact && (
                <div
                  className="font-body"
                  style={{
                    fontSize: 10,
                    color: 'var(--b-ink-60)',
                    marginTop: 1,
                    lineHeight: 1.35,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {badge.description}
                </div>
              )}
            </div>
            <span
              className="spread"
              style={{
                fontSize: 8,
                color,
                padding: '1px 6px',
                border: `1px solid ${color}80`,
              }}
            >
              {isEarned ? badge.rarity : 'Locked'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
