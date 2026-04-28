'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FriendsLeagueSnapshot } from '@/types/friendsLeague';

interface Props {
  snapshot: FriendsLeagueSnapshot;
}

/**
 * Banner above the live leaderboard surfacing the user's result from
 * the week that just ended. Three flavors:
 *
 *   • Podium (rank 1-3) — green tint, reward callout.
 *   • Honorable mention (rank 4-10) — neutral tint.
 *   • Below 10 / no participants — hidden (banner doesn't render).
 */
export function LastWeekBanner({ snapshot }: Props) {
  const onPodium = snapshot.myRank >= 1 && snapshot.myRank <= 3;
  if (snapshot.myRank > 10 || snapshot.standings.length === 0) return null;

  const accent = onPodium ? '#22c55e' : '#64748b';
  const label =
    snapshot.myRank === 1 ? 'You won last week 👑' :
    snapshot.myRank === 2 ? 'You took 2nd last week' :
    snapshot.myRank === 3 ? 'You took 3rd last week' :
    `You finished #${snapshot.myRank} last week`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${accent}10 0%, rgba(11,11,20,0.7) 70%)`,
        border: `1px solid ${accent}33`,
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0 w-[2px]"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {snapshot.weekKey}
          </p>
          <p className="text-sm font-bold text-white mt-0.5 truncate">{label}</p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
            {snapshot.myScore.toLocaleString()} XP
            {snapshot.myReward > 0 && (
              <>
                <span className="text-slate-700 mx-1.5">·</span>
                <span className="text-emerald-400">+{snapshot.myReward} fragments paid out</span>
              </>
            )}
          </p>
        </div>
        <Link
          href="/inventory"
          className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white flex-shrink-0"
        >
          View →
        </Link>
      </div>
    </motion.div>
  );
}
