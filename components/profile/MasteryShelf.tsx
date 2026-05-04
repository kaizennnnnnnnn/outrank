'use client';

import { UserHabit } from '@/types/habit';
import { getMasteryTier, getNextMasteryTier, getMasteryProgress } from '@/constants/mastery';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface Props { habits: UserHabit[]; }

export function MasteryShelf({ habits }: Props) {
  const shelf = habits
    .map((h) => ({ habit: h, tier: getMasteryTier(h.totalLogs), next: getNextMasteryTier(h.totalLogs), progress: getMasteryProgress(h.totalLogs) }))
    .filter((e) => e.tier)
    .sort((a, b) => (b.tier!.tier - a.tier!.tier) || (b.habit.totalLogs - a.habit.totalLogs));

  if (shelf.length === 0) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 11, color: 'var(--b-ink-60)', fontStyle: 'italic' }}
      >
        Log 5 times on any habit to earn your first medal.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {shelf.map(({ habit, tier, next, progress }) => (
        <li
          key={habit.categorySlug}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr auto',
            gap: 12,
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--b-rule)',
          }}
          title={`${habit.categoryName} — ${tier!.name}${next ? ` (${habit.totalLogs}/${next.minLogs} to ${next.name})` : ' (MAX)'}`}
        >
          <CategoryIcon
            slug={habit.categorySlug}
            name={habit.categoryName}
            icon={habit.categoryIcon}
            color={habit.color}
            size="sm"
          />
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display"
              style={{
                fontSize: 14,
                fontStyle: 'italic',
                fontWeight: 500,
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {habit.categoryName}
            </div>
            <div
              className="font-body tabular"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                marginTop: 2,
              }}
            >
              {habit.totalLogs} logs
              {next && (
                <span style={{ color: 'var(--b-ink-40)' }}> · {next.minLogs - habit.totalLogs} to {next.name}</span>
              )}
            </div>
            {/* Progress hairline */}
            <div
              style={{
                marginTop: 4,
                height: 2,
                background: 'var(--b-rule)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(2, progress * 100)}%`,
                  background: tier!.color,
                  transition: 'width 500ms',
                }}
              />
            </div>
          </div>
          <span
            className="spread"
            style={{
              fontSize: 8,
              color: tier!.color,
              padding: '1px 6px',
              border: `1px solid ${tier!.color}80`,
            }}
          >
            {tier!.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
