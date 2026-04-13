'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/constants/categories';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { LeaderboardPeriod } from '@/types/leaderboard';
import { TrophyIconFull } from '@/components/ui/AppIcons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const periods: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'alltime', label: 'All Time' },
];

const rankStyles: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-700',
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('gym');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const { entries, loading } = useLeaderboard(selectedCategory, period);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Leaderboards</h1>
        <p className="text-sm text-slate-500">Compete for the top spot across all categories.</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 bg-[#10101a] rounded-xl p-1 border border-[#1e1e30] w-fit">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-medium transition-all',
              period === p.value
                ? 'bg-red-600 text-white'
                : 'text-slate-500 hover:text-white'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Category Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.slice(0, 20).map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border whitespace-nowrap text-xs transition-all shrink-0',
              selectedCategory === cat.slug
                ? 'border-red-500 bg-red-500/10 text-white'
                : 'border-[#1e1e30] text-slate-500 hover:text-white hover:border-[#2d2d45]'
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-3"><TrophyIconFull size={40} className="text-yellow-400 mx-auto" /></div>
            <p className="text-slate-500">No entries yet. Be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e30]">
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.userId === user?.uid;
              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3',
                    isMe && 'bg-red-500/5'
                  )}
                >
                  <span className={cn(
                    'font-mono text-lg font-bold w-8 text-center',
                    rankStyles[rank] || 'text-slate-600'
                  )}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                  </span>
                  <Link href={`/profile/${entry.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={entry.avatarUrl} alt={entry.username} size="sm" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isMe ? 'text-orange-400' : 'text-white')}>
                        {entry.username} {isMe && '(you)'}
                      </p>
                    </div>
                  </Link>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-white">{entry.score.toLocaleString()}</p>
                    {entry.delta !== 0 && (
                      <p className={cn(
                        'text-xs font-mono',
                        entry.delta > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {entry.delta > 0 ? `▲${entry.delta}` : `▼${Math.abs(entry.delta)}`}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
