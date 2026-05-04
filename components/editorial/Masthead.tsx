'use client';

/**
 * Masthead — the top strip on every editorial screen. Mirrors a
 * periodical's nameplate: brand left in spread caps, date + section
 * right in body type, hairline-thick rule below the row. Date format
 * is "Mon · 04 May 2026"; defaults to today's date so callers don't
 * need to thread it through.
 */

import { useMemo } from 'react';

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
  return (
    <div style={{ padding: '4px 22px 12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '1px solid var(--b-ink)',
          paddingBottom: 6,
        }}
      >
        <span className="spread" style={{ fontSize: 9 }}>OUTRANK</span>
        <span style={{ fontSize: 9, color: 'var(--b-ink-60)', fontFamily: 'var(--font-inter)' }}>
          {today}{section ? ` · ${section}` : ''}
        </span>
      </div>
    </div>
  );
}
