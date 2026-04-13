'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { updateDocument } from '@/lib/firestore';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import React from 'react';

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

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleMarkRead = async (id: string) => {
    if (!user) return;
    markAsRead(id);
    await updateDocument(`notifications/${user.uid}/items`, id, { isRead: true });
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    markAllAsRead();
    for (const n of notifications.filter((n) => !n.isRead)) {
      if (n.id) {
        await updateDocument(`notifications/${user.uid}/items`, n.id, { isRead: true });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-orange-400">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<span className="text-orange-400"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></span>}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => notif.id && !notif.isRead && handleMarkRead(notif.id)}
              className={cn(
                'w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all',
                notif.isRead
                  ? 'bg-transparent hover:bg-[#10101a]'
                  : 'bg-red-500/5 border border-red-500/10 hover:bg-red-500/10'
              )}
            >
              <span className="text-xl mt-0.5">{typeIcons[notif.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm',
                  notif.isRead ? 'text-slate-400' : 'text-white font-medium'
                )}>
                  {notif.message}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {notif.createdAt?.toDate ? formatRelativeTime(notif.createdAt.toDate()) : ''}
                </p>
              </div>
              {!notif.isRead && (
                <span className="w-2 h-2 rounded-full bg-red-500 mt-2 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
