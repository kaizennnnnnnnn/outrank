'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firestore';
import { formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import type { NotificationItem as NotifType } from '@/types/notification';
import React, { ReactNode } from 'react';
import { Masthead } from '@/components/editorial/Masthead';
import {
  BHeartGlyph,
  BTrophyGlyph,
  BFlameGlyph,
  BCrownGlyph,
  BCheckGlyph,
  BBellGlyph,
} from '@/components/editorial/BGlyphs';

/**
 * Inbox — editorial Direction B v2 conversion.
 *
 * "Inbox" front page: header + "mark all read" inline link, then a
 * uniform list of editorial notification rows. Each row gets a small
 * tone-colored glyph on the left, an italic title in the eyebrow, the
 * message in body type, and a relative timestamp on the right.
 */

type Tone = {
  icon: ReactNode;
  color: string;
  title: string;
  to?: string;
};

const tones: Record<string, Tone> = {
  friend_request:        { icon: <BHeartGlyph size={14} />,      color: '#60a5fa', title: 'Friend request',    to: '/friends' },
  friend_accepted:       { icon: <BCheckGlyph size={14} />,      color: '#34d399', title: 'New friend',         to: '/friends' },
  duel_challenge:        { icon: <BTrophyGlyph size={14} />,     color: '#ef4444', title: 'Duel incoming',      to: '/compete' },
  duel_accepted:         { icon: <BCheckGlyph size={14} />,      color: '#22c55e', title: 'Duel accepted',      to: '/compete' },
  duel_declined:         { icon: <BTrophyGlyph size={14} />,     color: '#94a3b8', title: 'Duel declined',      to: '/compete' },
  duel_ended:            { icon: <BTrophyGlyph size={14} />,     color: '#fbbf24', title: 'Duel ended',         to: '/compete' },
  leaderboard_overtaken: { icon: <BTrophyGlyph size={14} />,     color: '#f97316', title: 'Passed on board',    to: '/leaderboard' },
  streak_at_risk:        { icon: <BFlameGlyph size={14} />,      color: '#fbbf24', title: 'Streak at risk' },
  streak_broken:         { icon: <BFlameGlyph size={14} />,      color: '#64748b', title: 'Streak broken' },
  badge_earned:          { icon: <BCrownGlyph size={14} />,      color: '#f97316', title: 'Badge earned' },
  level_up:              { icon: <BCrownGlyph size={14} />,      color: '#f59e0b', title: 'Leveled up' },
  tournament_starting:   { icon: <BTrophyGlyph size={14} />,     color: '#60a5fa', title: 'Tournament' },
  weekly_recap:          { icon: <BCheckGlyph size={14} />,      color: '#fb923c', title: 'Weekly recap' },
  league_winner:         { icon: <BCrownGlyph size={14} />,      color: '#fde047', title: 'League winner' },
  friend_logged:         { icon: <BHeartGlyph size={14} />,      color: '#a78bfa', title: 'Friend activity',    to: '/feed' },
};

const defaultTone: Tone = {
  icon: <BBellGlyph size={14} />,
  color: 'var(--b-ink-60)',
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
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Inbox" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Inbox
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>Notifications</em>
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="font-body"
                style={{
                  fontSize: 10,
                  color: 'var(--b-accent)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Mark all read →
              </button>
            )}
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            {unreadCount > 0 ? (
              <>
                <span className="tabular" style={{ color: 'var(--b-ink)' }}>{unreadCount}</span>{' '}
                unread · oldest first
              </>
            ) : (
              <>You&rsquo;re all caught up.</>
            )}
          </p>

          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                Nothing new.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto' }}
              >
                New requests, duel results, and streak alerts will land here.
              </p>
            </div>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                marginTop: 18,
                borderTop: '1px solid var(--b-ink)',
              }}
            >
              {notifications.map((notif) => {
                const tone = tones[notif.type] || defaultTone;
                return (
                  <NotificationRow
                    key={notif.id}
                    notif={notif}
                    tone={tone}
                    onClick={() => handleClick(notif)}
                  />
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  notif,
  tone,
  onClick,
}: {
  notif:   NotifType;
  tone:    Tone;
  onClick: () => void;
}) {
  const unread = !notif.isRead;
  const time = notif.createdAt?.toDate ? formatRelativeTime(notif.createdAt.toDate()) : '';

  return (
    <li
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 1fr auto',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid var(--b-rule)',
        cursor: 'pointer',
        alignItems: 'flex-start',
      }}
    >
      <span style={{ color: tone.color, marginTop: 2 }}>{tone.icon}</span>
      <div style={{ minWidth: 0 }}>
        <div
          className="spread"
          style={{ fontSize: 9, color: tone.color }}
        >
          {tone.title}
          {unread && (
            <span
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--b-accent)',
                marginLeft: 6,
                verticalAlign: 'middle',
              }}
            />
          )}
        </div>
        <p
          className="font-body"
          style={{
            fontSize: 13,
            margin: '4px 0 0',
            lineHeight: 1.5,
            color: unread ? 'var(--b-ink)' : 'var(--b-ink-60)',
            fontWeight: unread ? 500 : 400,
          }}
        >
          {notif.message}
        </p>
        {tone.to && (
          <span
            className="font-body"
            style={{
              display: 'inline-block',
              fontSize: 10,
              color: tone.color,
              marginTop: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            View →
          </span>
        )}
      </div>
      <span
        className="font-mono tabular"
        style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 2 }}
      >
        {time}
      </span>
    </li>
  );
}
