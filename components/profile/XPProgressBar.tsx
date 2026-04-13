'use client';

import { motion } from 'framer-motion';
import { getXPProgress, getLevelForXP, getNextLevel } from '@/constants/levels';

interface XPProgressBarProps {
  totalXP: number;
  showLabel?: boolean;
}

export function XPProgressBar({ totalXP, showLabel = true }: XPProgressBarProps) {
  const xp = getXPProgress(totalXP);
  const level = getLevelForXP(totalXP);
  const next = getNextLevel(level.level);

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">
            Lv.{level.level} {level.title}
          </span>
          {next && (
            <span className="text-xs font-mono text-slate-600">
              {xp.current}/{xp.needed} XP
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2.5 bg-[#18182a] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 via-red-500 to-orange-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${xp.percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      {next && showLabel && (
        <p className="text-[10px] text-slate-600 mt-1">
          Next: Lv.{next.level} {next.title}
        </p>
      )}
    </div>
  );
}
