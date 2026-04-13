'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Competition } from '@/types/competition';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DuelCardProps {
  competition: Competition;
  currentUserId: string;
}

export function DuelCard({ competition, currentUserId }: DuelCardProps) {
  const me = competition.participants.find((p) => p.userId === currentUserId);
  const opponent = competition.participants.find((p) => p.userId !== currentUserId);

  if (!me || !opponent) return null;

  const isWinning = me.score > opponent.score;
  const isTied = me.score === opponent.score;

  return (
    <Link href={`/compete/duel/${competition.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="glass-card rounded-2xl p-4 glow-hover transition-all"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-500">{competition.title}</span>
          <span className={cn(
            'text-xs font-mono font-bold px-2 py-0.5 rounded-full',
            competition.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
          )}>
            {competition.status}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {/* Me */}
          <div className="flex items-center gap-3">
            <Avatar src={me.avatarUrl} alt={me.username} size="md" />
            <div>
              <p className="text-sm font-bold text-orange-400">{me.username}</p>
              <p className="font-mono text-xl font-bold text-white">{me.score}</p>
            </div>
          </div>

          {/* VS */}
          <div className="text-center px-4">
            <span className="font-heading text-2xl text-slate-600">VS</span>
            <p className={cn(
              'text-xs font-mono font-bold',
              isWinning ? 'text-emerald-400' : isTied ? 'text-slate-500' : 'text-red-400'
            )}>
              {isWinning ? `+${me.score - opponent.score}` : isTied ? 'TIED' : `-${opponent.score - me.score}`}
            </p>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-bold text-orange-400">{opponent.username}</p>
              <p className="font-mono text-xl font-bold text-white">{opponent.score}</p>
            </div>
            <Avatar src={opponent.avatarUrl} alt={opponent.username} size="md" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
