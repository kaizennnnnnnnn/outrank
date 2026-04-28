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
 */
export function GymPillarRow({ habit, isLoggedToday }: Props) {
  const { state } = useGymState();
  const today = getTodaysDay(state);
  const program = state?.activeProgramId ? getProgram(state.activeProgramId) : null;

  return (
    <Link href="/gym" className="block">
      <motion.div
        whileTap={{ scale: 0.998 }}
        className="relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
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
          {today && program ? (
            <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
              <span className="text-slate-300">{today.day.name}</span>
              <span className="text-slate-700 mx-1.5">·</span>
              <span>{program.shortName} · day {today.dayIndex + 1}/{program.schedule.length}</span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
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
          <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_-2px_rgba(249,115,22,0.5)]">
            <CheckCircleFullIcon size={16} className="text-orange-400" />
          </div>
        ) : (
          <span
            className="text-[11px] font-bold uppercase tracking-widest flex-shrink-0"
            style={{ color: habit.color }}
          >
            Open →
          </span>
        )}
      </motion.div>
    </Link>
  );
}
