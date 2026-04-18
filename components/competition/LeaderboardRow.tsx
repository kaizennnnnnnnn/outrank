'use client';

import { motion } from 'framer-motion';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { MiniOrb } from '@/components/profile/MiniOrb';
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
  /** Cosmetics — when supplied, the row shows the user's frame, name effect, and mini orb. */
  frameId?: string;
  nameEffectId?: string;
  orbTier?: number;
  orbBaseColor?: string;
  orbPulseColor?: string;
  orbRingColor?: string;
}

const rankColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-slate-300',
  3: 'text-amber-700',
};

function MedalIcon({ rank }: { rank: number }) {
  if (rank > 3) return null;
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="14" r="6" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="14" r="6" />
      <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.12" />
      <path d="M15 2h-2l-1 4-1-4H9" />
    </svg>
  );
}

export function LeaderboardRow({
  rank, username, avatarUrl, score, delta, isCurrentUser, index,
  frameId, nameEffectId,
  orbTier, orbBaseColor, orbPulseColor, orbRingColor,
}: LeaderboardRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4) }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 hover:bg-[#1e1e30]/50 transition-colors',
        isCurrentUser && 'bg-red-500/5 border-l-2 border-red-500'
      )}
    >
      {/* Rank */}
      <div className={cn('w-8 flex items-center justify-center', rankColors[rank] || 'text-slate-600')}>
        {rank <= 3 ? <MedalIcon rank={rank} /> : <span className="font-mono text-sm font-bold text-slate-600">#{rank}</span>}
      </div>

      {/* Avatar (with frame) */}
      <Link href={`/profile/${username}`} className="flex items-center gap-2.5 flex-1 min-w-0">
        <FramedAvatar src={avatarUrl} alt={username} size="sm" frameId={frameId} />

        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <NamePlate
            name={username}
            effectId={nameEffectId}
            size="sm"
            className={cn('truncate', isCurrentUser && !nameEffectId && 'text-orange-400')}
          />
          {isCurrentUser && <span className="text-[10px] text-orange-500 font-medium">(you)</span>}
          {/* Mini orb — tiny animated companion showing the user's orb cosmetics */}
          {orbTier !== undefined && (
            <MiniOrb
              tier={orbTier}
              baseColorId={orbBaseColor}
              pulseColorId={orbPulseColor}
              ringColorId={orbRingColor}
              size={20}
            />
          )}
        </div>
      </Link>

      {/* Score + Delta */}
      <div className="text-right">
        <p className="font-mono text-sm font-bold text-white">{score.toLocaleString()}</p>
        {delta !== 0 && (
          <motion.p
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn('text-xs font-mono', delta > 0 ? 'text-emerald-400' : 'text-red-400')}
          >
            {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
