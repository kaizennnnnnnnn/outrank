'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LEVEL_REWARDS, LevelReward } from '@/constants/levelRewards';
import { LEVELS } from '@/constants/levels';
import { cn } from '@/lib/utils';

function xpForLevel(lv: number): number {
  const found = LEVELS.find((l) => l.level === lv);
  return found?.xpRequired ?? 0;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  currentXP: number;
}

const tierStyles: Record<LevelReward['tier'], { text: string; bg: string; border: string; label: string }> = {
  minor:    { text: '#cbd5e1', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.22)', label: 'Tick' },
  medium:   { text: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  label: 'Milestone' },
  major:    { text: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  border: 'rgba(245,158,11,0.45)',  label: 'Major' },
  capstone: { text: '#f9a8d4', bg: 'rgba(236,72,153,0.16)',  border: 'rgba(236,72,153,0.55)',  label: 'Capstone' },
};

export function LevelRewardsModal({ isOpen, onClose, currentLevel, currentXP }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[190] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[85vh] rounded-2xl border border-[#1e1e30] bg-gradient-to-b from-[#12121c] to-[#07070c] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-[#1e1e30]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
                Level Progression
              </p>
              <div className="mt-1 flex items-end justify-between">
                <div>
                  <p className="font-heading text-3xl font-bold text-white">
                    Level {currentLevel}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {currentXP.toLocaleString()} XP total
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {LEVEL_REWARDS.map((r) => {
                const xpNeeded = xpForLevel(r.level);
                const isPast = r.level <= currentLevel;
                const isCurrent = r.level === currentLevel;
                const isNext = r.level === currentLevel + 1;
                const s = tierStyles[r.tier];
                return (
                  <div
                    key={r.level}
                    className={cn(
                      'relative rounded-xl p-3 flex items-center gap-3 transition-all',
                      isCurrent && 'ring-1 ring-orange-500/60',
                    )}
                    style={{
                      background: isPast
                        ? `linear-gradient(145deg, ${s.bg}, #0b0b14 60%)`
                        : '#0b0b14',
                      border: `1px solid ${isPast ? s.border : '#1e1e30'}`,
                      opacity: isPast || isCurrent || isNext ? 1 : 0.55,
                    }}
                  >
                    {/* Level badge */}
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 font-heading font-bold"
                      style={{
                        background: isPast ? `${s.bg}` : '#0c0c16',
                        border: `1px solid ${isPast ? s.border : '#1e1e30'}`,
                        color: isPast ? s.text : '#475569',
                        boxShadow: r.tier === 'capstone' && isPast ? `0 0 10px ${s.text}55` : undefined,
                      }}
                    >
                      {r.level}
                    </div>

                    {/* Reward */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ color: s.text, background: s.bg, border: `1px solid ${s.border}` }}
                        >
                          {s.label}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {xpNeeded.toLocaleString()} XP
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        +{r.fragments} fragments
                        {r.extra && <span className="text-slate-400 font-normal"> · {r.extra}</span>}
                      </p>
                    </div>

                    {/* Status chip */}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      {isPast ? (isCurrent ? 'Current' : 'Claimed') : isNext ? 'Next' : ''}
                    </span>
                  </div>
                );
              })}

              {/* After 50 — prestige prompt */}
              <div
                className="mt-4 rounded-xl p-4 text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(236,72,153,0.14), #0b0b14 60%)',
                  border: '1px solid rgba(236,72,153,0.35)',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">
                  After Level 50
                </p>
                <p className="text-sm text-white mt-1 font-semibold">Prestige unlocks</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Reset to Level 1 with a permanent +1% XP multiplier per ascension.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
