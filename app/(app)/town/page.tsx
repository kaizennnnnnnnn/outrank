'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { Masthead } from '@/components/editorial/Masthead';

/**
 * The Town — editorial directory of destinations. Each storefront has
 * its own tone color so the page reads as a richly-illustrated
 * periodical entry rather than a stack of identical rows. Hover/focus
 * lights the left stripe and washes the row in the destination's tone,
 * with the "ENTER →" tag picking up the metallic-shine treatment.
 */

interface Destination {
  id:     string;
  name:   string;
  tender: string;
  copy:   string;
  meta:   string;
  href:   string | null;
  open:   boolean;
  tone:   string;        // accent color used for left stripe + hover wash
  Sigil:  React.ComponentType<{ size?: number }>;
}

// Each destination gets a small bespoke SVG sigil — so the row reads
// as a directory entry, not just a list item. Sigils sit on the left
// in the row's tone color.
function MarketSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9h18v11H3z" fill="currentColor" fillOpacity="0.08" />
      <path d="M3 9h18v11H3z" />
      <path d="M9 14h6" />
    </svg>
  );
}
function QuestSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l8-1 8 1v15l-8 1-8-1V4z" fill="currentColor" fillOpacity="0.08" />
      <path d="M4 4l8-1 8 1v15l-8 1-8-1V4z" />
      <path d="M12 3v17" opacity="0.4" />
      <path d="M7 9l3 2-3 2" />
    </svg>
  );
}
function SeasonalSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" fill="currentColor" fillOpacity="0.12" />
      <path d="M12 2l2.6 6.9L22 10l-5.5 4.9L18 22l-6-3.8L6 22l1.5-7.1L2 10l7.4-1.1z" />
    </svg>
  );
}
function TravelersSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.06" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
      <path d="M3 12h2m14 0h2" opacity="0.5" />
    </svg>
  );
}
function StandingsSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="14" width="4" height="7" fill="currentColor" fillOpacity="0.12" />
      <rect x="4" y="14" width="4" height="7" />
      <rect x="10" y="9" width="4" height="12" fill="currentColor" fillOpacity="0.18" />
      <rect x="10" y="9" width="4" height="12" />
      <rect x="16" y="4" width="4" height="17" fill="currentColor" fillOpacity="0.24" />
      <rect x="16" y="4" width="4" height="17" />
    </svg>
  );
}
function AlmanacSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="1" fill="currentColor" fillOpacity="0.06" />
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  );
}
function AtelierSigil({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.6C23 5.8 18 2 12 2z" fill="currentColor" fillOpacity="0.08" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4c3 0 5.6-2.5 5.6-5.6C23 5.8 18 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
      <circle cx="16" cy="7.5" r="1.2" fill="currentColor" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

const DESTINATIONS: Destination[] = [
  {
    id: 'market',
    name: 'Market',
    tender: 'Alexander, Merchant',
    copy: 'Cosmetics, frames, name effects, orb skins. Stocked weekly.',
    meta: 'OPEN · BROWSE',
    href: '/shop',
    open: true,
    tone: '#dc2626',
    Sigil: MarketSigil,
  },
  {
    id: 'quests',
    name: 'Quest Hall',
    tender: 'Ian, Quest Master',
    copy: 'Browse 52 categories of habits. Take on a new daily quest.',
    meta: 'OPEN · 52 CATEGORIES',
    href: '/habits',
    open: true,
    tone: '#f97316',
    Sigil: QuestSigil,
  },
  {
    id: 'seasonal',
    name: 'Seasonal Shop',
    tender: 'Lemoness, Sorceress',
    copy: 'Limited gear and transformations for the four Grand Galas.',
    meta: 'BATTLE PASS · OPEN',
    href: '/battle-pass',
    open: true,
    tone: '#fbbf24',
    Sigil: SeasonalSigil,
  },
  {
    id: 'travelers',
    name: 'Time Travelers',
    tender: 'A pair of mystic mice',
    copy: 'Mystery items and animated backgrounds from issues past.',
    meta: 'INVENTORY · CHESTS',
    href: '/inventory',
    open: true,
    tone: '#a855f7',
    Sigil: TravelersSigil,
  },
  {
    id: 'standings',
    name: 'Standings Hall',
    tender: 'The Heralds',
    copy: 'Weekly, monthly, and all-time leaderboards across every category.',
    meta: 'LEADERBOARD · LIVE',
    href: '/leaderboard',
    open: true,
    tone: '#3b82f6',
    Sigil: StandingsSigil,
  },
  {
    id: 'schedule',
    name: 'Almanac',
    tender: 'Daniel, Schedulemaster',
    copy: 'Plan your week. Reminders, scheduled habits, and notification windows.',
    meta: 'SCHEDULE · OPEN',
    href: '/schedule',
    open: true,
    tone: '#22c55e',
    Sigil: AlmanacSigil,
  },
  {
    id: 'atelier',
    name: 'Atelier',
    tender: 'Cosmetics & Soul Orb',
    copy: 'Bases, pulses, rings, frames, names. Spend your fragments.',
    meta: '◆ FRAGMENTS',
    href: '/shop',
    open: true,
    tone: '#ec4899',
    Sigil: AtelierSigil,
  },
];

export default function TownPage() {
  const { user } = useAuth();
  const fragments = (user as unknown as { fragments?: number } | null)?.fragments ?? 0;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Town" />

        <div style={{ padding: '0 22px 24px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            A Directory of Destinations
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h1
              className="font-display metallic-shine"
              style={{
                fontSize: 44,
                fontWeight: 500,
                lineHeight: 1,
                margin: '2px 0 12px',
                fontStyle: 'italic',
              }}
            >
              The Town
            </h1>
            <span
              className="font-mono tabular"
              style={{ fontSize: 12, color: 'var(--b-ink)' }}
            >
              ◆ {fragments.toLocaleString()}
            </span>
          </div>

          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: 'var(--b-ink-60)',
              lineHeight: 1.55,
              margin: '0 0 18px',
              maxWidth: 320,
            }}
          >
            Seven storefronts, each kept by its own proprietor. The Seasonal Shop
            opens only during Grand Galas; the rest stay open year-round.
          </p>

          {/* Featured: Market with a real SoulOrb */}
          <Link
            href="/shop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              textDecoration: 'none',
              color: 'inherit',
              borderTop: '2px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-ink)',
              padding: '14px 0',
              marginBottom: 6,
            }}
          >
            <SoulOrb
              size={72}
              tier={MAX_ORB_TIER}
              intensity={70}
              interactive={false}
              hideLabel
              baseColorId={(user as unknown as Record<string, string>)?.orbBaseColor}
              pulseColorId={(user as unknown as Record<string, string>)?.orbPulseColor}
              ringColorId={(user as unknown as Record<string, string>)?.orbRingColor}
            />
            <div style={{ flex: 1 }}>
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 2 }}
              >
                Featured · Market
              </div>
              <div
                className="font-display"
                style={{ fontSize: 20, fontWeight: 500 }}
              >
                <em style={{ fontStyle: 'italic' }}>Aurora Potion</em>
              </div>
              <div
                className="font-body"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
              >
                Hatches any standard egg with a winter shimmer.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="font-mono tabular"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                ◆ 2
              </div>
              <div
                className="font-body metallic-shine"
                style={{ fontSize: 9, marginTop: 2, fontWeight: 700, letterSpacing: '0.14em' }}
              >
                VISIT →
              </div>
            </div>
          </Link>

          {/* Destination directory */}
          <div style={{ marginTop: 6 }}>
            {DESTINATIONS.map((d, i) => (
              <DestinationRow key={d.id} index={i + 1} d={d} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DestinationRow({ index, d }: { index: number; d: Destination }) {
  const { Sigil } = d;
  const inner = (
    <div
      className="town-row"
      style={{
        ['--row-tone' as string]: d.tone,
        display: 'grid',
        gridTemplateColumns: '24px 32px 1fr auto',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 0 14px 6px',
        borderBottom: '1px solid var(--b-rule)',
        opacity: d.open ? 1 : 0.55,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span
        className="font-mono"
        style={{ fontSize: 10, color: 'var(--b-ink-40)', paddingTop: 4 }}
      >
        {String(index).padStart(2, '0')}
      </span>
      <span
        style={{
          color: d.tone,
          display: 'inline-flex',
          paddingTop: 2,
        }}
      >
        <Sigil size={22} />
      </span>
      <div>
        <div
          className="font-display"
          style={{
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.1,
            color: d.tone,
          }}
        >
          <em style={{ fontStyle: 'italic' }}>{d.name}</em>
        </div>
        <div
          className="font-display"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-60)',
            marginTop: 1,
            fontStyle: 'italic',
          }}
        >
          Kept by {d.tender}
        </div>
        <div
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 4,
            lineHeight: 1.45,
            maxWidth: 260,
          }}
        >
          {d.copy}
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            marginTop: 6,
            letterSpacing: '0.08em',
            color: d.open ? d.tone : 'var(--b-ink-40)',
            fontWeight: 700,
          }}
        >
          {d.meta}
        </div>
      </div>
      <span
        className={d.open ? 'font-body metallic-shine' : 'font-body'}
        style={{
          fontSize: 10,
          color: d.open ? undefined : 'var(--b-ink-40)',
          fontWeight: 700,
          letterSpacing: '0.14em',
          paddingTop: 4,
        }}
      >
        {d.open ? 'ENTER →' : '— '}
      </span>
    </div>
  );

  if (d.href) {
    return (
      <Link href={d.href} style={{ display: 'block' }}>
        {inner}
      </Link>
    );
  }
  return inner;
}
