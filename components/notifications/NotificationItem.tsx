'use client';

import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationItem as NotifType } from '@/types/notification';
import { formatRelativeTime } from '@/lib/utils';
import {
  UsersFullIcon, HandshakeIcon, SwordsCrossIcon, CheckCircleFullIcon,
  StarIcon, TrophyIconFull, ChartBarIcon, FireIcon, MedalIcon,
  ArrowUpIcon, FlagIcon, CrownIcon, ClockIcon, SparklesIcon,
} from '@/components/ui/AppIcons';
import { ReactNode } from 'react';

/**
 * Editorial Direction B v2 notification row. Each row is a hairline-
 * bordered ledger entry; unread rows get a 2px accent left stripe and
 * a small accent dot. No dark surface — paper + ink only.
 */
const typeIconMap: Record<string, ReactNode> = {
  friend_request:        <UsersFullIcon size={16} />,
  friend_accepted:       <HandshakeIcon size={16} />,
  duel_challenge:        <SwordsCrossIcon size={16} />,
  duel_accepted:         <CheckCircleFullIcon size={16} />,
  duel_declined:         <SwordsCrossIcon size={16} />,
  duel_ended:            <TrophyIconFull size={16} />,
  leaderboard_overtaken: <ChartBarIcon size={16} />,
  streak_at_risk:        <FireIcon size={16} />,
  streak_broken:         <FireIcon size={16} />,
  badge_earned:          <MedalIcon size={16} />,
  level_up:              <ArrowUpIcon size={16} />,
  tournament_starting:   <FlagIcon size={16} />,
  weekly_recap:          <ChartBarIcon size={16} />,
  league_winner:         <CrownIcon size={16} />,
  friend_logged:         <ClockIcon size={16} />,
  admin_announcement:    <SparklesIcon size={16} />,
};

const defaultIcon = <StarIcon size={16} />;

interface NotificationItemProps {
  notification: NotifType;
  onMarkRead: () => void;
  index: number;
}

export function NotificationItemCard({ notification, onMarkRead, index }: NotificationItemProps) {
  const unread = !notification.isRead;
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={unread ? onMarkRead : undefined}
      className="font-body"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        textAlign: 'left',
        background: 'transparent',
        borderTop: '1px solid var(--b-rule)',
        borderLeft: unread ? '2px solid var(--b-accent)' : '2px solid transparent',
        cursor: unread ? 'pointer' : 'default',
        color: 'inherit',
      }}
    >
      <span
        style={{
          marginTop: 2,
          flexShrink: 0,
          color: unread ? 'var(--b-accent)' : 'var(--b-ink-60)',
          display: 'inline-flex',
        }}
      >
        {typeIconMap[notification.type] || defaultIcon}
      </span>

      {notification.actorAvatar && (
        <Avatar src={notification.actorAvatar} alt="" size="sm" className="shrink-0 mt-0.5" />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            color: unread ? 'var(--b-ink)' : 'var(--b-ink-60)',
            fontWeight: unread ? 500 : 400,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {notification.message}
        </p>
        <p
          className="font-mono"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-40)',
            marginTop: 4,
            letterSpacing: '0.04em',
          }}
        >
          {notification.createdAt?.toDate
            ? formatRelativeTime(notification.createdAt.toDate())
            : ''}
        </p>
      </div>

      {unread && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--b-accent)',
            marginTop: 6,
            flexShrink: 0,
          }}
        />
      )}
    </motion.button>
  );
}
