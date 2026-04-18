'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { updateDocument } from '@/lib/firestore';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  UsersFullIcon, HandshakeIcon, SwordsCrossIcon, CheckCircleFullIcon, StarIcon,
  TrophyIconFull, ChartBarIcon, FireIcon, MedalIcon, ArrowUpIcon, FlagIcon,
  CrownIcon, ClockIcon,
} from '@/components/ui/AppIcons';
import type { NotificationItem as NotifType } from '@/types/notification';
import React, { ReactNode } from 'react';

// Design tokens per notification type — icon, accent color, and the tab
// the card should navigate to. Accent drives the left stripe, the icon
// tile, and the unread pulse color on each card.
type Tone = {
  icon: ReactNode;
  color: string;   // hex accent (borders, glow, stripe)
  title: string;
  to?: string;
};

const tones: Record<string, Tone> = {
  friend_request:        { icon: <UsersFullIcon size={18} />,       color: '#60a5fa', title: 'Friend request',    to: '/friends' },
  friend_accepted:       { icon: <HandshakeIcon size={18} />,        color: '#34d399', title: 'New friend',         to: '/friends' },
  duel_challenge:        { icon: <SwordsCrossIcon size={18} />,      color: '#ef4444', title: 'Duel incoming',      to: '/compete' },
  duel_accepted:         { icon: <CheckCircleFullIcon size={18} />,  color: '#22c55e', title: 'Duel accepted',      to: '/compete' },
  duel_declined:         { icon: <SwordsCrossIcon size={18} />,      color: '#94a3b8', title: 'Duel declined',      to: '/compete' },
  duel_ended:            { icon: <TrophyIconFull size={18} />,       color: '#fbbf24', title: 'Duel ended',         to: '/compete' },
  leaderboard_overtaken: { icon: <ChartBarIcon size={18} />,         color: '#f97316', title: 'Passed on board',    to: '/leaderboard' },
  streak_at_risk:        { icon: <FireIcon size={18} />,              color: '#fbbf24', title: 'Streak at risk' },
  streak_broken:         { icon: <FireIcon size={18} />,              color: '#64748b', title: 'Streak broken' },
  badge_earned:          { icon: <MedalIcon size={18} />,             color: '#f97316', title: 'Badge earned' },
  level_up:              { icon: <ArrowUpIcon size={18} />,           color: '#f59e0b', title: 'Leveled up' },
  tournament_starting:   { icon: <FlagIcon size={18} />,              color: '#60a5fa', title: 'Tournament' },
  weekly_recap:          { icon: <ChartBarIcon size={18} />,          color: '#fb923c', title: 'Weekly recap' },
  league_winner:         { icon: <CrownIcon size={18} />,             color: '#fde047', title: 'League winner' },
  friend_logged:         { icon: <ClockIcon size={18} />,             color: '#a78bfa', title: 'Friend activity',    to: '/feed' },
};

const defaultTone: Tone = {
  icon: <StarIcon size={18} />,
  color: '#94a3b8',
  title: 'Notification',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const router = useRouter();

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

  const handleClick = (notif: NotifType) => {
    if (notif.id && !notif.isRead) handleMarkRead(notif.id);
    const t = tones[notif.type];
    if (t?.to) router.push(t.to);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Premium header — matching the rest of the app (radial gradient + border glow) */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(239,68,68,0.22), transparent 55%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(239,68,68,0.22)',
          boxShadow: '0 0 26px -14px rgba(239,68,68,0.5), inset 0 1px 0 rgba(239,68,68,0.1)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400">
              Inbox
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-0.5">
              Notifications
            </h1>
            {unreadCount > 0 ? (
              <p className="text-[11px] text-slate-400 mt-1">
                <span className="font-mono font-bold text-red-400">{unreadCount}</span> unread · oldest first
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">You&rsquo;re all caught up.</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={
            <span className="text-orange-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </span>
          }
          title="Nothing new"
          description="New requests, duel results, and streak alerts will land here."
        />
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => {
            const tone = tones[notif.type] || defaultTone;
            return <NotificationCard key={notif.id} notif={notif} tone={tone} onClick={() => handleClick(notif)} />;
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Single notification card — category-colored left stripe, icon pill,
 * title + message split, actor avatar when present, pulsing unread dot.
 * Same info, much richer presentation.
 */
function NotificationCard({ notif, tone, onClick }: { notif: NotifType; tone: Tone; onClick: () => void }) {
  const unread = !notif.isRead;
  const time = notif.createdAt?.toDate ? formatRelativeTime(notif.createdAt.toDate()) : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-xl overflow-hidden transition-all',
        unread ? 'ring-1 ring-opacity-30' : '',
      )}
      style={{
        background: unread
          ? `linear-gradient(135deg, ${tone.color}22, #10101a 55%, #0b0b14 100%)`
          : 'linear-gradient(135deg, #10101a 0%, #0b0b14 100%)',
        border: `1px solid ${unread ? tone.color + '55' : '#1e1e30'}`,
      }}
    >
      {/* Left accent stripe — tone color, brighter when unread */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${tone.color}, ${tone.color}33)`,
          boxShadow: unread ? `0 0 10px ${tone.color}` : undefined,
        }}
      />

      {/* Ambient glow — only on unread, top-right corner */}
      {unread && (
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-50"
          style={{ background: tone.color, filter: 'blur(30px)' }}
        />
      )}

      <div className="relative flex items-start gap-3 p-4">
        {/* Icon pill — tone-colored tile, crisper than loose icon */}
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, ${tone.color}33, ${tone.color}11 80%)`,
            border: `1px solid ${tone.color}44`,
            color: tone.color,
            boxShadow: unread
              ? `0 0 12px -2px ${tone.color}55, inset 0 0 8px ${tone.color}22`
              : `inset 0 0 6px ${tone.color}18`,
          }}
        >
          {tone.icon}
        </div>

        {/* Optional actor avatar next to icon (overlapping) */}
        {notif.actorAvatar && (
          <div
            className="-ml-5 mt-5 shrink-0 w-6 h-6 rounded-full overflow-hidden border border-[#0b0b14] bg-[#18182a]"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={notif.actorAvatar} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em] truncate"
                style={{ color: tone.color }}
              >
                {tone.title}
              </p>
              <p
                className={cn(
                  'text-sm leading-snug mt-0.5',
                  unread ? 'text-white font-medium' : 'text-slate-400',
                )}
              >
                {notif.message}
              </p>
            </div>
            {/* Unread dot */}
            {unread && (
              <span
                className="shrink-0 w-2 h-2 rounded-full mt-1.5 animate-notif-dot-pulse"
                style={{ background: tone.color, color: tone.color }}
              />
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[10px] text-slate-600 font-mono">{time}</p>
            {tone.to && (
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider transition-opacity',
                  unread ? 'opacity-100' : 'opacity-0 group-hover:opacity-60',
                )}
                style={{ color: tone.color }}
              >
                View →
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
