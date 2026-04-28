'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { FriendsLeagueEntry } from '@/types/friendsLeague';
import { cn } from '@/lib/utils';

interface Props {
  entry: FriendsLeagueEntry;
  isMe: boolean;
  /** Show the reward chip for top-3 even when score is 0. */
  showRewardPreview: boolean;
}

const PODIUM_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #facc15, #f59e0b)',  // gold
  2: 'linear-gradient(135deg, #d4d4d8, #a1a1aa)',  // silver
  3: 'linear-gradient(135deg, #d97706, #92400e)',  // bronze
};

/**
 * One row in the friends-league leaderboard. Top 3 get podium tinting +
 * a reward preview chip; the user's own row is highlighted regardless
 * of rank.
 */
export function LeagueRow({ entry, isMe, showRewardPreview }: Props) {
  const isPodium = entry.rank >= 1 && entry.rank <= 3;
  const podiumGradient = PODIUM_GRADIENTS[entry.rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        isMe ? 'bg-orange-500/[0.06]' : 'hover:bg-white/[0.02]',
      )}
    >
      {/* Rank badge */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-mono font-bold text-sm"
        style={{
          background: isPodium && podiumGradient ? podiumGradient : 'rgba(255,255,255,0.04)',
          border: isPodium ? 'none' : '1px solid rgba(255,255,255,0.08)',
          color: isPodium ? '#0b0b14' : '#94a3b8',
          boxShadow: isPodium ? '0 0 12px -2px rgba(255,255,255,0.3)' : undefined,
        }}
      >
        {entry.rank}
      </div>

      <Link href={isMe ? '/profile' : `/profile/${entry.username}`} className="flex-shrink-0">
        <Avatar src={entry.avatarUrl} alt={entry.username} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          href={isMe ? '/profile' : `/profile/${entry.username}`}
          className="text-sm font-bold text-white truncate hover:text-orange-400 transition-colors"
        >
          {entry.username}
          {isMe && (
            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/15 border border-orange-500/35 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </Link>
        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
          <span className="text-slate-300">{entry.score.toLocaleString()}</span>
          <span className="text-slate-600 ml-1">XP this week</span>
        </p>
      </div>

      {showRewardPreview && entry.reward > 0 && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex-shrink-0"
          style={{
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.35)',
            color: '#34d399',
          }}
          title="Estimated reward if standings hold to Sunday"
        >
          +{entry.reward}
        </span>
      )}
    </motion.div>
  );
}
