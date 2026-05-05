'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { UserHabit } from '@/types/habit';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { StreakFlame } from './StreakFlame';
import { useGymState } from '@/hooks/useGymState';
import { getProgram } from '@/constants/gymPrograms';
import { getTodaysDay } from '@/lib/gym';

interface Props {
  habit: UserHabit;
  isLoggedToday: boolean;
}

/**
 * Pillar row variant for Gym. Unlike water (one-tap inline log) or the
 * standard pillars (modal log), gym taps navigate into /gym for the
 * full training experience — program picker, today's planned workout,
 * active session.
 *
 * Right-side action depends on state:
 *   • No active program → "Set up program"
 *   • Active program → today's workout name and "Open"
 *   • Already logged today → check pill
 *
 * Editorial Direction B v2: paper background, hairline rule, 3px left
 * stripe in the gym category color (red). No orange glow.
 */
export function GymPillarRow({ habit, isLoggedToday }: Props) {
  const { state } = useGymState();
  const today = getTodaysDay(state);
  const program = state?.activeProgramId ? getProgram(state.activeProgramId) : null;

  return (
    <Link href="/gym" className="block">
      <motion.div
        whileTap={{ scale: 0.998 }}
        className="relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors"
        style={{
          background: 'transparent',
          borderLeft: `3px solid ${habit.color}`,
        }}
      >
        <div className="flex-shrink-0">
          <CategoryIcon
            slug={habit.categorySlug}
            name={habit.categoryName}
            icon={habit.categoryIcon}
            color={habit.color}
            size="md"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p
              className="font-display truncate"
              style={{
                fontSize: 15,
                fontStyle: 'italic',
                fontWeight: 600,
                color: 'var(--b-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {habit.categoryName}
            </p>
            <span
              className="spread"
              style={{
                fontSize: 8,
                color: habit.color,
                padding: '1px 6px',
                border: `1px solid ${habit.color}80`,
              }}
            >
              Pillar
            </span>
          </div>
          {today && program ? (
            <p
              className="font-body tabular"
              style={{
                fontSize: 11,
                color: 'var(--b-ink-60)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ color: 'var(--b-ink)' }}>{today.day.name}</span>
              <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
              <span>{program.shortName} · day {today.dayIndex + 1}/{program.schedule.length}</span>
            </p>
          ) : (
            <p
              className="font-body"
              style={{
                fontSize: 11,
                color: 'var(--b-ink-60)',
                marginTop: 2,
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              No program yet — pick one to start training.
            </p>
          )}
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
          <span
            className="spread flex-shrink-0"
            style={{ fontSize: 10, color: 'var(--b-accent)' }}
          >
            Open →
          </span>
        )}
      </motion.div>
    </Link>
  );
}
