'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LEAGUES, getLeague, getNextLeague } from '@/constants/seasons';
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
  const next = getNextLeague(weeklyXP);
  const toNext = next ? Math.max(0, next.minWeeklyXP - weeklyXP) : 0;

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
                of every 4-week season you keep your peak tier&rsquo;s cosmetics, then reset to one rank below.
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
                    <LeagueCrest color={l.color} tier={l.id} />
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
                  {next && <> · <span className="text-slate-400">{toNext.toLocaleString()} XP to <b style={{ color: next.color }}>{next.name}</b></span></>}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * League crest — hexagonal shield with a distinct icon per tier. Bronze gets a
 * basic chevron, each higher tier adds more spikes/stars so visual complexity
 * scales with prestige.
 */
export function LeagueCrest({ color, tier, size = 56 }: { color: string; tier: string; size?: number }) {
  const hex = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';
  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size * (14 / 12),
        clipPath: hex,
        background: `linear-gradient(145deg, ${color}55, #0b0b14)`,
        filter: `drop-shadow(0 0 8px ${color}66)`,
      }}
    >
      <div
        className="absolute inset-[2px] flex items-center justify-center"
        style={{
          clipPath: hex,
          background: `linear-gradient(145deg, ${color}25, #10101a)`,
        }}
      >
        <RankIcon tier={tier} color={color} size={Math.round(size * 0.55)} />
      </div>
    </div>
  );
}

/** Distinct rank icon per league tier. All scale to the hex size. */
export function RankIcon({ tier, color, size = 28 }: { tier: string; color: string; size?: number }) {
  const stroke = color;
  const glow = `drop-shadow(0 0 4px ${color})`;

  switch (tier) {
    case 'bronze':
      // Single chevron
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M6 16l6-6 6 6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'silver':
      // Double chevron
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M6 14l6-6 6 6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 19l6-6 6 6" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'gold':
      // Crown-like trophy
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M6 5h12l-1 8a5 5 0 01-10 0L6 5z" fill={`${stroke}22`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 18h4M9 21h6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <path d="M6 7H4M18 7h2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'platinum':
      // 4-point diamond star
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill={`${stroke}33`} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case 'diamond':
      // Octahedral diamond with inner facets
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path d="M6 10l6-7 6 7-6 11z" fill={`${stroke}33`} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M6 10h12M12 3l-3 7 3 11 3-11z" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case 'master':
      // 8-point star
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: glow }}>
          <path
            d="M12 2l1.8 5.2L19 5.5l-1.7 5.3L22 12l-4.7 1.2L19 18.5l-5.2-1.7L12 22l-1.8-5.2L5 18.5l1.7-5.3L2 12l4.7-1.2L5 5.5l5.2 1.7z"
            fill={`${stroke}33`} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"
          />
        </svg>
      );
    case 'grandmaster':
      // Sunburst / phoenix crown
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px ${color})` }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="12" x2={12 + Math.cos((a * Math.PI) / 180) * 10} y2={12 + Math.sin((a * Math.PI) / 180) * 10}
              stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
          ))}
          <circle cx="12" cy="12" r="4.5" fill={`${stroke}55`} stroke={stroke} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="1.5" fill={stroke} />
        </svg>
      );
    default:
      return null;
  }
}
