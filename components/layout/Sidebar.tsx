'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { useNotifications } from '@/hooks/useNotifications';
import { BBellGlyph } from '@/components/editorial/BGlyphs';
import { getLevelForXP, getXPProgress } from '@/constants/levels';

/**
 * Sidebar — desktop-only navigation rail.
 *
 * Editorial Direction B v2 conversion. The legacy 17-item sidebar
 * collapsed into a periodical's table of contents:
 *   - Brand nameplate at top in spread caps
 *   - Five primary tabs (mirrors EditorialTabBar so the desktop
 *     nav matches the mobile one)
 *   - Secondary destinations group (Town / Diet / Schedule /
 *     Notifications / Settings) under a subtle hairline section
 *   - User strip at bottom: avatar + username italic + level
 *
 * Active route gets serif italic + accent red dot, same vocabulary
 * as the bottom tab bar. Hover state is just an ink color shift —
 * no colored backgrounds, no animated active-indicator, no chrome.
 */

interface NavLink {
  href:  string;
  label: string;
}

const PRIMARY: NavLink[] = [
  { href: '/dashboard', label: 'Home' },
  { href: '/friends',   label: 'Friends' },
  { href: '/feed',      label: 'Feed' },
  { href: '/profile',   label: 'You' },
];

const SECONDARY: NavLink[] = [
  { href: '/compete',   label: 'Compete' },
  { href: '/town',      label: 'The Town' },
  { href: '/diet',      label: 'The Plate' },
  { href: '/habits',    label: 'Roster' },
  { href: '/history',   label: 'The Archive' },
  { href: '/settings',  label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const level = user ? getLevelForXP(user.totalXP) : null;
  const xpProgress = user ? getXPProgress(user.totalXP) : null;

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] h-screen fixed left-0 top-0 z-40"
      style={{
        background: 'var(--b-paper)',
        borderRight: '1px solid var(--b-rule)',
      }}
    >
      {/* Brand nameplate */}
      <div
        style={{
          padding: '20px 22px 16px',
          borderBottom: '1px solid var(--b-ink)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <Link
          href="/dashboard"
          className="spread"
          style={{ fontSize: 11, color: 'var(--b-ink)', textDecoration: 'none' }}
        >
          OUTRANK
        </Link>
        <Link
          href="/notifications"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          style={{
            position: 'relative',
            color: 'var(--b-ink-60)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <BBellGlyph size={14} />
          {unreadCount > 0 && (
            <span
              className="font-mono tabular"
              style={{
                position: 'absolute',
                top: -4,
                right: -8,
                background: 'var(--b-accent)',
                color: '#ffffff',
                borderRadius: 999,
                fontSize: 9,
                fontWeight: 700,
                padding: '0 4px',
                minWidth: 14,
                height: 14,
                lineHeight: '14px',
                textAlign: 'center',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Primary nav */}
      <nav
        style={{
          flex: 1,
          padding: '16px 22px 8px',
          overflowY: 'auto',
        }}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {PRIMARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href} style={{ position: 'relative', marginBottom: 4 }}>
                <Link
                  href={item.href}
                  className="font-display"
                  style={{
                    display: 'block',
                    padding: '6px 0',
                    fontSize: 18,
                    fontStyle: active ? 'italic' : 'normal',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--b-accent)',
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* Secondary group */}
        <div
          className="spread"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-40)',
            marginTop: 24,
            marginBottom: 8,
            paddingTop: 12,
            borderTop: '1px solid var(--b-rule)',
          }}
        >
          More
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {SECONDARY.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-body"
                  style={{
                    display: 'block',
                    padding: '6px 0',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--b-ink)' : 'var(--b-ink-60)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User strip */}
      {user && (
        <Link
          href="/profile"
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--b-rule)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Avatar src={user.avatarUrl} alt={user.username} size="md" level={xpProgress?.percentage} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="font-display"
              style={{
                fontSize: 14,
                fontWeight: 500,
                fontStyle: 'italic',
                color: 'var(--b-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.username}
            </div>
            <div
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Lv. {level?.level} · {level?.title}
            </div>
          </div>
        </Link>
      )}
    </aside>
  );
}
