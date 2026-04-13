'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationItem as NotifType } from '@/types/notification';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, string> = {
  friend_request: '👋',
  friend_accepted: '🤝',
  duel_challenge: '⚔️',
  duel_accepted: '✅',
  duel_declined: '❌',
  duel_ended: '🏆',
  leaderboard_overtaken: '📉',
  streak_at_risk: '⚠️',
  streak_broken: '💔',
  badge_earned: '🎖️',
  level_up: '⬆️',
  tournament_starting: '🏟️',
  weekly_recap: '📊',
  league_winner: '👑',
  friend_logged: '📝',
};

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
      <span className="text-xl mt-0.5 shrink-0">
        {typeIcons[notification.type] || '🔔'}
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
