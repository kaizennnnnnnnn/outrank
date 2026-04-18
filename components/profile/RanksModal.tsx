'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LEAGUES, getLeague } from '@/constants/seasons';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weeklyXP: number;
}

// Reward summary for each league — purely informational, shown in the modal.
const leagueRewards: Record<string, string> = {
  bronze:      'Starter league — no bonus, just your foundation.',
  silver:      '+25 fragments on season reset',
  gold:        '+75 fragments · Rare color unlock',
  platinum:    '+150 fragments · Epic color unlock',
  diamond:     '+300 fragments · Epic ring or pulse color',
  master:      '+600 fragments · Legendary color unlock · "Master" title',
  grandmaster: 'Top-tier. Mythic capstone reward + exclusive seasonal frame.',
};

export function RanksModal({ isOpen, onClose, weeklyXP }: Props) {
  const current = getLeague(weeklyXP);

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
            className="relative w-full max-w-md max-h-[85vh] rounded-2xl border border-[#1e1e30] bg-gradient-to-b from-[#12121c] to-[#07070c] overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-[#1e1e30]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">
                Ranked Leagues
              </p>
              <p className="font-heading text-2xl font-bold text-white mt-1">How ranking works</p>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Your league tier is determined by <b>weekly XP</b>. Log habits to climb. At the end
                of every 4-week season you keep your peak tier's cosmetics, then reset to one rank below.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {[...LEAGUES].reverse().map((l) => {
                const isCurrent = l.id === current.id;
                const reward = leagueRewards[l.id] || '';
                return (
                  <div
                    key={l.id}
                    className={cn(
                      'rounded-xl p-3 flex items-center gap-3 transition-colors',
                      isCurrent && 'ring-1 ring-orange-500/60',
                    )}
                    style={{
                      background: `linear-gradient(145deg, ${l.color}14, #0b0b14 60%)`,
                      border: `1px solid ${l.color}35`,
                    }}
                  >
                    <LeagueCrest color={l.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-heading font-bold" style={{ color: l.color }}>{l.name}</p>
                        {isCurrent && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 border border-orange-500/35 px-1.5 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">
                        {l.minWeeklyXP.toLocaleString()}+ weekly XP
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{reward}</p>
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 p-3 rounded-xl bg-[#0b0b14] border border-[#1e1e30] space-y-1">
                <p className="text-[11px] font-bold text-slate-300">Your weekly XP</p>
                <p className="font-mono text-2xl font-bold text-white">{weeklyXP.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500">
                  Currently sitting in <span style={{ color: current.color }}>{current.name}</span>.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LeagueCrest({ color }: { color: string }) {
  return (
    <div
      className="relative w-12 h-14 flex items-center justify-center shrink-0"
      style={{
        clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
        background: `linear-gradient(145deg, ${color}55, #0b0b14)`,
      }}
    >
      <div
        className="absolute inset-[2px] flex items-center justify-center"
        style={{
          clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
          background: `linear-gradient(145deg, ${color}25, #10101a)`,
        }}
      />
    </div>
  );
}
