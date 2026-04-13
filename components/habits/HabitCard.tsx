'use client';

import { motion } from 'framer-motion';
import { UserHabit } from '@/types/habit';
import { StreakFlame } from './StreakFlame';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { cn } from '@/lib/utils';

interface HabitCardProps {
  habit: UserHabit;
  isLoggedToday: boolean;
  onLog: () => void;
}

export function HabitCard({ habit, isLoggedToday, onLog }: HabitCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'flex items-center gap-4 rounded-xl border p-4 transition-all cursor-pointer',
        isLoggedToday
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-[#10101a] border-[#1e1e30] hover:border-blue-500/20 glow-hover'
      )}
      onClick={!isLoggedToday ? onLog : undefined}
    >
      <CategoryIcon icon={habit.categoryIcon} color={habit.color} size="md" slug={habit.categorySlug} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{habit.categoryName}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Goal: {habit.goal} {habit.unit}/day</span>
          <span>&bull;</span>
          <span>{habit.totalLogs} logs</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {habit.currentStreak > 0 && (
          <StreakFlame streak={habit.currentStreak} size="sm" />
        )}
        {isLoggedToday ? (
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-400 text-sm">✓</span>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm hover:bg-blue-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onLog();
            }}
          >
            +
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
