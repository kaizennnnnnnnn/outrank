'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationItem as NotifType } from '@/types/notification';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { UsersFullIcon, HandshakeIcon, SwordsCrossIcon, CheckCircleFullIcon, StarIcon, TrophyIconFull, ChartBarIcon, FireIcon, MedalIcon, ArrowUpIcon, FlagIcon, CrownIcon, ClockIcon } from '@/components/ui/AppIcons';
import { ReactNode } from 'react';

const typeIconMap: Record<string, ReactNode> = {
  friend_request: <UsersFullIcon size={18} className="text-blue-400" />,
  friend_accepted: <HandshakeIcon size={18} className="text-emerald-400" />,
  duel_challenge: <SwordsCrossIcon size={18} className="text-red-400" />,
  duel_accepted: <CheckCircleFullIcon size={18} className="text-emerald-400" />,
  duel_declined: <SwordsCrossIcon size={18} className="text-slate-500" />,
  duel_ended: <TrophyIconFull size={18} className="text-yellow-400" />,
  leaderboard_overtaken: <ChartBarIcon size={18} className="text-orange-400" />,
  streak_at_risk: <FireIcon size={18} className="text-yellow-400" />,
  streak_broken: <FireIcon size={18} className="text-slate-500" />,
  badge_earned: <MedalIcon size={18} className="text-orange-400" />,
  level_up: <ArrowUpIcon size={18} className="text-orange-400" />,
  tournament_starting: <FlagIcon size={18} className="text-blue-400" />,
  weekly_recap: <ChartBarIcon size={18} className="text-orange-400" />,
  league_winner: <CrownIcon size={18} className="text-yellow-400" />,
  friend_logged: <ClockIcon size={18} className="text-slate-400" />,
};

const defaultIcon = <StarIcon size={18} className="text-slate-500" />;

interface NotificationItemProps {
  notification: NotifType;
  onMarkRead: () => void;
  index: number;
}

export function NotificationItemCard({ notification, onMarkRead, index }: NotificationItemProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={!notification.isRead ? onMarkRead : undefined}
      className={cn(
        'w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all',
        notification.isRead
          ? 'bg-transparent hover:bg-[#10101a]'
          : 'bg-red-500/5 border border-red-500/10 hover:bg-red-500/10'
      )}
    >
      <span className="mt-0.5 shrink-0">
        {typeIconMap[notification.type] || defaultIcon}
      </span>

      {notification.actorAvatar && (
        <Avatar src={notification.actorAvatar} alt="" size="sm" className="shrink-0 mt-0.5" />
      )}

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm',
          notification.isRead ? 'text-slate-400' : 'text-white font-medium'
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-slate-600 mt-1">
          {notification.createdAt?.toDate
            ? formatRelativeTime(notification.createdAt.toDate())
            : ''}
        </p>
      </div>

      {!notification.isRead && (
        <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
      )}
    </motion.button>
  );
}
