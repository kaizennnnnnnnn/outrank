'use client';

import { motion } from 'framer-motion';
import { UserHabit } from '@/types/habit';
import { StreakFlame } from './StreakFlame';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { getMasteryTier } from '@/constants/mastery';

interface HabitCardProps {
  habit: UserHabit;
  isLoggedToday: boolean;
  onLog: () => void;
}

/**
 * Row, not card. Lives inside a shared list container on the dashboard so
 * a stack of habits reads as one list, not five floating cards. Mastery
 * identity is carried by the icon ring + name badge.
 *
 * Editorial Direction B v2: paper background, hairline rule below row,
 * ink/spread typography. Done state is a small accent green check; the
 * "log" button is a square ink-outlined plus, no orange glow.
 */
export function HabitCard({ habit, isLoggedToday, onLog }: HabitCardProps) {
  const mastery = getMasteryTier(habit.totalLogs);
  const masteryTier = mastery?.tier ?? 0;
  const masteryColor = mastery?.color;

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      className="group relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors"
      style={{
        background: 'transparent',
      }}
      onClick={!isLoggedToday ? onLog : undefined}
    >
      {/* Mastery ring around the category icon. Concentric radii: ring at
          -inset-[3px] around rounded-2xl (16px) icon needs 19px to keep
          corners parallel. */}
      <div className="relative flex-shrink-0">
        {mastery && (
          <div
            className="absolute -inset-[3px] rounded-[19px] pointer-events-none"
            style={{ border: `1.5px solid ${masteryColor}` }}
          />
        )}
        <CategoryIcon
          slug={habit.categorySlug}
          name={habit.categoryName}
          icon={habit.categoryIcon}
          color={habit.color}
          size="md"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p
            className="font-display truncate"
            style={{
              fontSize: 15,
              fontStyle: 'italic',
              fontWeight: 600,
              color: masteryTier >= 7 && masteryColor ? masteryColor : 'var(--b-ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {habit.categoryName}
          </p>
          {mastery && (
            <span
              className="spread"
              style={{
                fontSize: 8,
                color: masteryColor,
                padding: '1px 6px',
                border: `1px solid ${masteryColor}80`,
              }}
              title={`Mastery tier ${masteryTier}: ${mastery.name}`}
            >
              {mastery.name}
            </span>
          )}
        </div>
        <div
          className="font-body tabular"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>
            <span style={{ color: 'var(--b-ink-40)' }}>Goal</span>{' '}
            <span style={{ color: 'var(--b-ink)' }}>{habit.goal}</span>
            <span style={{ color: 'var(--b-ink-40)', marginLeft: 2 }}>{habit.unit}</span>
          </span>
          <span style={{ color: 'var(--b-ink-40)' }}>·</span>
          <span>
            <span style={{ color: 'var(--b-ink)' }}>{habit.totalLogs}</span>
            <span style={{ color: 'var(--b-ink-40)', marginLeft: 4 }}>logs</span>
          </span>
        </div>
      </div>

      {habit.currentStreak > 0 && (
        <div className="flex-shrink-0">
          <StreakFlame streak={habit.currentStreak} size="sm" />
        </div>
      )}

      {isLoggedToday ? (
        <div
          className="w-9 h-9 flex items-center justify-center flex-shrink-0"
          style={{
            border: '1px solid #16a34a',
            color: '#16a34a',
          }}
        >
          <CheckCircleFullIcon size={16} />
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.92 }}
          className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            border: '1px solid var(--b-ink)',
            color: 'var(--b-ink)',
            background: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onLog();
          }}
          aria-label={`Log ${habit.categoryName}`}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
}
