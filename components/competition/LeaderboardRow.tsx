'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LeaderboardRowProps {
  rank: number;
  username: string;
  avatarUrl: string;
  score: number;
  delta: number;
  isCurrentUser?: boolean;
  index: number;
}

const rankMedals: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

const rankColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-700',
};

export function LeaderboardRow({ rank, username, avatarUrl, score, delta, isCurrentUser, index }: LeaderboardRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 hover:bg-[#1e1e30]/50 transition-colors',
        isCurrentUser && 'bg-red-500/5 border-l-2 border-red-500'
      )}
    >
      {/* Rank */}
      <span className={cn(
        'font-mono text-lg font-bold w-8 text-center',
        rankColors[rank] || 'text-slate-600'
      )}>
        {rankMedals[rank] || rank}
      </span>

      {/* User */}
      <Link href={`/profile/${username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar src={avatarUrl} alt={username} size="sm" />
        <p className={cn(
          'text-sm font-medium truncate',
          isCurrentUser ? 'text-orange-400' : 'text-white'
        )}>
          {username} {isCurrentUser && '(you)'}
        </p>
      </Link>

      {/* Score + Delta */}
      <div className="text-right">
        <p className="font-mono text-sm font-bold text-white">{score.toLocaleString()}</p>
        {delta !== 0 && (
          <motion.p
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
              'text-xs font-mono',
              delta > 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
