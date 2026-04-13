'use client';

import { motion } from 'framer-motion';
import { BADGES, getBadgeById } from '@/constants/badges';
import { EarnedBadge, RARITY_COLORS } from '@/types/badge';
import { useCollection } from '@/hooks/useFirestore';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  userId: string;
  compact?: boolean;
}

export function BadgeGrid({ userId, compact }: BadgeGridProps) {
  const { data: earned, loading } = useCollection<EarnedBadge & { id: string }>(
    `userBadges/${userId}/earned`,
    [],
    true
  );

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="w-14 h-14 rounded-xl" />)}
      </div>
    );
  }

  const earnedIds = earned.map((e) => e.badgeId);
  const displayBadges = compact ? BADGES.slice(0, 15) : BADGES;

  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-5' : 'grid-cols-4 sm:grid-cols-6')}>
      {displayBadges.map((badge) => {
        const isEarned = earnedIds.includes(badge.id);
        const color = RARITY_COLORS[badge.rarity];

        return (
          <motion.div
            key={badge.id}
            whileHover={{ scale: 1.1 }}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl p-2 border transition-all',
              isEarned
                ? 'bg-[#10101a] border-opacity-40'
                : 'bg-[#0a0a12] border-[#1e1e30] opacity-30 grayscale'
            )}
            style={{
              borderColor: isEarned ? `${color}60` : undefined,
              boxShadow: isEarned && badge.rarity === 'legendary'
                ? `0 0 12px ${color}30`
                : undefined,
            }}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className={cn('text-2xl', compact && 'text-xl')}>
              {badge.icon}
            </span>
            {!compact && (
              <span className="text-[9px] text-center text-slate-400 mt-1 leading-tight">
                {badge.name}
              </span>
            )}
            {isEarned && badge.rarity === 'legendary' && (
              <div
                className="absolute inset-0 rounded-xl border-2 animate-pulse"
                style={{ borderColor: `${color}40` }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
