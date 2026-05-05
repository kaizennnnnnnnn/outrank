'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserHabit } from '@/types/habit';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { StreakFlame } from './StreakFlame';
import { useAuth } from '@/hooks/useAuth';
import { useTodaysDraft } from '@/hooks/useRecap';
import { useUIStore } from '@/store/uiStore';
import { logHabit } from '@/lib/logHabit';
import { haptic } from '@/lib/haptics';
import { getRecapDropPoint } from '@/components/recap/RecapLogFlight';

interface Props {
  habit: UserHabit;
  isLoggedToday: boolean;
}

const INCREMENTS = [0.25, 0.5, 1] as const;

/**
 * Pillar-specific row for Water. Replaces the standard +/- modal flow
 * with three inline quick-log chips (+0.25L / +0.5L / +1L) so logging
 * water is one tap, not a modal trip — water gets logged frequently
 * throughout the day, the friction needs to be near-zero.
 *
 * Goal progress bar reads from today's draft Recap (already subscribed
 * by other dashboard components) and sums water entries inline. Logs
 * fan into the recap flight animation just like modal logs do — the
 * `getRecapDropPoint` integration is preserved.
 *
 * Editorial Direction B v2: paper background, hairline border with a
 * 3px left stripe in the pillar's category color, square ink-outlined
 * quick-log chips (no orange glow). Italic display number for "today
 * vs goal", muted ink for the unit.
 */
export function WaterPillarRow({ habit, isLoggedToday }: Props) {
  const { user } = useAuth();
  const { recap: draft } = useTodaysDraft();
  const addToast = useUIStore((s) => s.addToast);
  const triggerRecapFlight = useUIStore((s) => s.triggerRecapFlight);
  const [logging, setLogging] = useState(false);

  const todayMl = draft
    ? draft.entries
        .filter((e) => e.habitSlug === habit.categorySlug)
        .reduce((sum, e) => sum + (e.value || 0), 0)
    : 0;
  const goal = habit.goal || 3;
  const pct = Math.min(100, Math.round((todayMl / goal) * 100));

  const quickLog = async (amount: number, evt: React.MouseEvent<HTMLButtonElement>) => {
    if (!user || logging) return;
    setLogging(true);
    haptic('tap');
    const rect = evt.currentTarget.getBoundingClientRect();
    const fromX = rect.left + rect.width / 2;
    const fromY = rect.top + rect.height / 2;

    try {
      await logHabit({
        userId: user.uid,
        habitSlug: habit.categorySlug,
        categoryId: habit.categoryId,
        value: amount,
        note: '',
        proofImageUrl: '',
        username: user.username,
        avatarUrl: user.avatarUrl || '',
      });

      // Quick-log flight straight from the chip — no modal in the way.
      if (typeof window !== 'undefined') {
        const dest = getRecapDropPoint();
        triggerRecapFlight({
          fromX,
          fromY,
          toX: dest.x,
          toY: dest.y,
          categoryName: habit.categoryName,
          categoryIcon: habit.categoryIcon,
          categoryColor: habit.color,
          categorySlug: habit.categorySlug,
          value: amount,
          unit: habit.unit || 'L',
        });
      }
      haptic('success');
    } catch {
      addToast({ type: 'error', message: 'Failed to log water' });
      haptic('error');
    } finally {
      setLogging(false);
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.998 }}
      className="relative px-4 py-3.5 transition-colors"
      style={{
        background: 'transparent',
        borderLeft: `3px solid ${habit.color}`,
      }}
    >
      {/* Top row — same shape as a standard pillar row so it sits
          consistently in the list */}
      <div className="flex items-center gap-3.5">
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
          <p
            className="font-body tabular"
            style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
          >
            <span
              className="font-display"
              style={{
                fontStyle: 'italic',
                fontWeight: 600,
                color: 'var(--b-ink)',
                fontSize: 13,
              }}
            >
              {todayMl.toFixed(2)}
            </span>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--b-ink-60)' }}>{goal}{habit.unit || 'L'}</span>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            <span>{habit.totalLogs} logs</span>
          </p>
        </div>

        {habit.currentStreak > 0 && (
          <div className="flex-shrink-0">
            <StreakFlame streak={habit.currentStreak} size="sm" />
          </div>
        )}

        {isLoggedToday && (
          <div
            className="w-9 h-9 flex items-center justify-center flex-shrink-0"
            style={{
              border: '1px solid #16a34a',
              color: '#16a34a',
            }}
          >
            <CheckCircleFullIcon size={16} />
          </div>
        )}
      </div>

      {/* Goal progress bar — hairline rule + flat fill in the pillar
          color. No glow, no gradient. */}
      <div className="mt-3 ml-12">
        <div
          style={{
            width: '100%',
            height: 2,
            background: 'var(--b-rule)',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              background: pct >= 100 ? '#16a34a' : habit.color,
            }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Quick-log chips — square outlined ink chips, no orange glow.
          One tap, no modal. */}
      <div className="mt-3 ml-12 flex items-center gap-2 flex-wrap">
        {INCREMENTS.map((amt) => (
          <motion.button
            key={amt}
            whileTap={{ scale: 0.94 }}
            onClick={(e) => quickLog(amt, e)}
            disabled={logging}
            className="inline-flex items-center gap-1 px-3 py-1.5 transition-colors disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '1px solid var(--b-ink)',
              color: 'var(--b-ink)',
            }}
          >
            <span
              className="font-display tabular"
              style={{ fontStyle: 'italic', fontWeight: 600, fontSize: 13 }}
            >
              +{amt}
            </span>
            <span
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
            >
              {habit.unit || 'L'}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
