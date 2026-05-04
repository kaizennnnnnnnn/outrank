'use client';

/**
 * Masthead — the top strip on every editorial screen. Mirrors a
 * periodical's nameplate: brand left in spread caps, date + section
 * right in body type, hairline-thick rule below the row. Date format
 * is "Mon · 04 May 2026"; defaults to today's date so callers don't
 * need to thread it through.
 *
 * The notification bell lives here on the right edge — it replaces
 * the legacy TopBar's bell so editorial pages don't need a second
 * chrome bar above their content. The bell is small, ink-tinted, and
 * sits inside the masthead row so it reads as part of the
 * nameplate rather than a separate UI strip.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { BBellGlyph } from './BGlyphs';

interface Props {
  /** Right-side label after the date — e.g. "Issue 27", "The Soul Orb". */
  section?: string;
  /** Override the date (mostly for tests / demos). */
  date?: string;
}

function formatDate(d: Date): string {
  const day  = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dd   = String(d.getDate()).padStart(2, '0');
  const mon  = d.toLocaleDateString('en-US', { month: 'short' });
  const yyyy = d.getFullYear();
  return `${day} · ${dd} ${mon} ${yyyy}`;
}

export function Masthead({ section, date }: Props) {
  const today = useMemo(() => date ?? formatDate(new Date()), [date]);
  const { unreadCount } = useNotifications();

  return (
    <div style={{ padding: '4px 22px 12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--b-ink)',
          paddingBottom: 6,
          gap: 8,
        }}
      >
        <span className="spread" style={{ fontSize: 9 }}>OUTRANK</span>
        <span
          style={{
            fontSize: 9,
            color: 'var(--b-ink-60)',
            fontFamily: 'var(--font-inter)',
            flex: 1,
            textAlign: 'right',
            paddingRight: 10,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {today}{section ? ` · ${section}` : ''}
        </span>

        {/* Bell — micro affordance, doesn't break the row baseline */}
        <Link
          href="/notifications"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--b-ink-60)',
            textDecoration: 'none',
            transform: 'translateY(2px)', // align center of glyph to text baseline
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
    </div>
  );
}
