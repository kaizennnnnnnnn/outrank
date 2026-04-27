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
 * identity is carried by the icon ring + name badge — no per-row tinting,
 * no per-row glow, no per-row border. Goal + log-count are inline meta,
 * not pill chips.
 */
export function HabitCard({ habit, isLoggedToday, onLog }: HabitCardProps) {
  const mastery = getMasteryTier(habit.totalLogs);
  const masteryTier = mastery?.tier ?? 0;
  const masteryColor = mastery?.color;

  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      className="group relative flex items-center gap-3.5 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.02]"
      onClick={!isLoggedToday ? onLog : undefined}
    >
      {/* Mastery ring around the category icon (size='md' = rounded-2xl 16px;
          ring at -inset-[3px] needs radius 19px so corners stay parallel) */}
      <div className="relative flex-shrink-0">
        {mastery && (
          <div
            className="absolute -inset-[3px] rounded-[19px] pointer-events-none"
            style={{
              border: `1.5px solid ${masteryColor}`,
              boxShadow: masteryTier >= 5 ? `0 0 10px ${masteryColor}70` : undefined,
            }}
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
            className="text-sm font-bold truncate"
            style={{
              color: masteryTier >= 7 && masteryColor ? masteryColor : '#ffffff',
              textShadow: masteryTier >= 9 && masteryColor ? `0 0 6px ${masteryColor}99` : undefined,
            }}
          >
            {habit.categoryName}
          </p>
          {mastery && (
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-[1px] rounded"
              style={{
                color: masteryColor,
                background: `${masteryColor}18`,
                border: `1px solid ${masteryColor}55`,
              }}
              title={`Mastery tier ${masteryTier}: ${mastery.name}`}
            >
              {mastery.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
          <span>
            <span className="text-slate-600">Goal</span>{' '}
            <span className="text-slate-300">{habit.goal}</span>
            <span className="text-slate-600 ml-0.5">{habit.unit}</span>
          </span>
          <span className="text-slate-700">·</span>
          <span>
            <span className="text-slate-300">{habit.totalLogs}</span>
            <span className="text-slate-600 ml-1">logs</span>
          </span>
        </div>
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
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-[0_4px_14px_-4px_rgba(239,68,68,0.5)] hover:shadow-[0_4px_20px_-2px_rgba(239,68,68,0.7)] transition-shadow flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onLog();
          }}
          aria-label={`Log ${habit.categoryName}`}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      )}
    </motion.div>
  );
}
