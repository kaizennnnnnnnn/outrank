'use client';

import { motion } from 'framer-motion';
import { UserHabit } from '@/types/habit';
import { StreakFlame } from './StreakFlame';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CheckCircleFullIcon } from '@/components/ui/AppIcons';
import { getMasteryTier } from '@/constants/mastery';
import { cn } from '@/lib/utils';

interface HabitCardProps {
  habit: UserHabit;
  isLoggedToday: boolean;
  onLog: () => void;
}

export function HabitCard({ habit, isLoggedToday, onLog }: HabitCardProps) {
  const mastery = getMasteryTier(habit.totalLogs);
  // At higher mastery the whole card and icon frame get fancier.
  const masteryTier = mastery?.tier ?? 0;
  const masteryColor = mastery?.color;

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.995 }}
      className="group relative overflow-hidden rounded-xl p-3.5 transition-all cursor-pointer"
      style={{
        background: isLoggedToday
          ? `linear-gradient(145deg, rgba(249,115,22,0.1), #0b0b14 60%)`
          : masteryColor && masteryTier >= 5
            // Platinum+ tiers: mastery color leaks into the card background.
            ? `linear-gradient(145deg, ${habit.color}10 0%, ${masteryColor}10 50%, #0b0b14 100%)`
            : `linear-gradient(145deg, ${habit.color}0c 0%, #10101a 45%, #0b0b14 100%)`,
        border: isLoggedToday
          ? '1px solid rgba(249,115,22,0.3)'
          : masteryColor && masteryTier >= 4
            ? `1px solid ${masteryColor}55`
            : `1px solid ${habit.color}1f`,
        boxShadow: isLoggedToday
          ? 'inset 0 1px 0 rgba(249,115,22,0.12), 0 4px 20px -10px rgba(249,115,22,0.25)'
          : masteryTier >= 7 && masteryColor
            // Emerald+ earns a noticeable glow
            ? `0 0 22px -6px ${masteryColor}80, inset 0 1px 0 ${masteryColor}20`
            : `0 1px 0 ${habit.color}10 inset, 0 6px 18px -14px ${habit.color}20`,
      }}
      onClick={!isLoggedToday ? onLog : undefined}
    >
      {/* Category accent glow, muted when complete */}
      {!isLoggedToday && (
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.07] blur-2xl pointer-events-none transition-opacity group-hover:opacity-[0.13]"
          style={{ background: masteryColor && masteryTier >= 6 ? masteryColor : habit.color }}
        />
      )}

      {/* Obsidian-tier shimmer */}
      {masteryTier >= 10 && !isLoggedToday && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `linear-gradient(110deg, transparent 30%, ${masteryColor}55 50%, transparent 70%)`,
            animation: 'shimmer 3s linear infinite',
          }}
        />
      )}

      <div className="relative flex items-center gap-3.5">
        {/* Mastery ring around the category icon */}
        <div className="relative flex-shrink-0">
          {mastery && (
            <div
              className="absolute -inset-[3px] rounded-[14px] pointer-events-none"
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
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-[#0b0b14] border border-[#1e1e30] text-[10px] font-mono text-slate-400">
              <span className="text-slate-500">Goal</span>{' '}
              <span className="text-white">{habit.goal}</span>
              <span className="text-slate-500 ml-0.5">{habit.unit}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#0b0b14] border border-[#1e1e30] text-[10px] font-mono text-slate-400">
              <span className="text-white">{habit.totalLogs}</span>
              <span className="text-slate-500 ml-0.5">logs</span>
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
      </div>
    </motion.div>
  );
}
