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
 * fan into the recap flight animation just like modal logs do.
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
      className="relative px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
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
            <p className="text-sm font-bold text-white truncate">{habit.categoryName}</p>
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
              style={{
                color: habit.color,
                background: `${habit.color}18`,
                border: `1px solid ${habit.color}55`,
              }}
            >
              Pillar
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            <span className="text-slate-300">{todayMl.toFixed(2)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className="text-slate-500">{goal}{habit.unit || 'L'}</span>
            <span className="text-slate-700 mx-1.5">·</span>
            <span>{habit.totalLogs} logs</span>
          </p>
        </div>

        {habit.currentStreak > 0 && (
          <div className="flex-shrink-0">
            <StreakFlame streak={habit.currentStreak} size="sm" />
          </div>
        )}

        {isLoggedToday && (
          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_-2px_rgba(249,115,22,0.5)]">
            <CheckCircleFullIcon size={16} className="text-orange-400" />
          </div>
        )}
      </div>

      {/* Goal progress bar — shows fill toward today's goal */}
      <div className="mt-3 ml-12">
        <div className="w-full h-1.5 bg-[#08080f] rounded-full overflow-hidden border border-[#1e1e30]">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: pct >= 100
                ? `linear-gradient(90deg, ${habit.color}, #34d399)`
                : `linear-gradient(90deg, ${habit.color}88, ${habit.color})`,
              boxShadow: `0 0 8px ${habit.color}66`,
            }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Quick-log chips — one tap, no modal */}
      <div className="mt-3 ml-12 flex items-center gap-2 flex-wrap">
        {INCREMENTS.map((amt) => (
          <motion.button
            key={amt}
            whileTap={{ scale: 0.92 }}
            onClick={(e) => quickLog(amt, e)}
            disabled={logging}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-mono font-bold transition-all disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${habit.color}22, ${habit.color}08)`,
              border: `1px solid ${habit.color}55`,
              color: habit.color,
              boxShadow: `inset 0 1px 0 ${habit.color}22`,
            }}
          >
            +{amt}
            <span className="text-slate-400 font-normal text-[10px]">{habit.unit || 'L'}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
