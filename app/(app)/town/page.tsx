'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';
import { Masthead } from '@/components/editorial/Masthead';

/**
 * The Town — editorial Direction B v2 directory of destinations.
 * Modeled on Habitica's Tavern / Market / Quest Shop / Seasonal Shop /
 * Time Travelers / Stable layout. Seven storefronts, each kept by a
 * named proprietor.
 *
 * For now only two destinations route to real surfaces:
 *   - Market  → /shop (the existing cosmetics shop)
 *   - Atelier → /shop (same destination, framed as the orb workshop)
 *
 * The other five are "Closed" placeholders so the design reads
 * complete without committing to building the underlying features.
 * They'll route to real surfaces as the corresponding game systems
 * land — see the `status` field on each destination entry.
 */

interface Destination {
  id:     string;
  name:   string;
  tender: string;
  copy:   string;
  meta:   string;
  href:   string | null;        // null = closed (no link)
  open:   boolean;
  accent?: boolean;
}

const DESTINATIONS: Destination[] = [
  {
    id: 'market',
    name: 'Market',
    tender: 'Alexander, Merchant',
    copy: 'Eggs, hatching potions, food, party cards. Stocked daily.',
    meta: 'OPEN · 14 NEW',
    href: '/shop',
    open: true,
    accent: true,
  },
  {
    id: 'quests',
    name: 'Quest Shop',
    tender: 'Ian, Quest Master',
    copy: 'Pet quests, masterclasser lines, magic potion bosses.',
    meta: 'OPEN · 02 BUNDLES',
    href: null,
    open: false,
  },
  {
    id: 'seasonal',
    name: 'Seasonal Shop',
    tender: 'Lemoness, Sorceress',
    copy: 'Limited gear and transformations for the four Grand Galas.',
    meta: 'CLOSED · UNTIL SPRING FLING',
    href: null,
    open: false,
  },
  {
    id: 'travelers',
    name: 'Time Travelers',
    tender: 'A pair of mystic mice',
    copy: 'Mystery items and animated backgrounds from issues past.',
    meta: '⌛ 03 HOURGLASSES',
    href: null,
    open: false,
  },
  {
    id: 'stable',
    name: 'Stable',
    tender: 'Matt Boch, Beastmaster',
    copy: 'Your pets and mounts. Hatch, feed, and saddle here.',
    meta: '12 PETS · 04 MOUNTS',
    href: null,
    open: false,
  },
  {
    id: 'inn',
    name: 'Inn',
    tender: 'Daniel, Tavern Keeper',
    copy: 'Pause damage. Sit out a day without breaking your streak.',
    meta: 'AVAILABLE',
    href: null,
    open: false,
  },
  {
    id: 'atelier',
    name: 'Atelier',
    tender: 'Cosmetics & Soul Orb',
    copy: 'Bases, pulses, rings, frames, names. Spend your fragments.',
    meta: '◆ FRAGMENTS',
    href: '/shop',
    open: true,
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
              className="font-display"
              style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 12px' }}
            >
              <em style={{ fontStyle: 'italic' }}>The Town</em>
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

          {/* Featured: Market with a real SoulOrb instead of the static circle */}
          <div
            style={{
              borderTop: '2px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-ink)',
              padding: '14px 0',
              marginBottom: 6,
            }}
          >
            <Link
              href="/shop"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textDecoration: 'none',
                color: 'inherit',
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
                  className="font-body"
                  style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 2 }}
                >
                  VISIT →
                </div>
              </div>
            </Link>
          </div>

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

// ─── Destination row ────────────────────────────────────────────────

function DestinationRow({ index, d }: { index: number; d: Destination }) {
  const inner = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        gap: 12,
        alignItems: 'baseline',
        padding: '14px 0',
        borderBottom: '1px solid var(--b-rule)',
        opacity: d.open ? 1 : 0.55,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span className="font-mono" style={{ fontSize: 10, color: 'var(--b-ink-40)' }}>
        {String(index).padStart(2, '0')}
      </span>
      <div>
        <div
          className="font-display"
          style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.1 }}
        >
          {d.name}
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
            color: d.accent ? 'var(--b-accent)' : d.open ? 'var(--b-ink-60)' : 'var(--b-ink-40)',
            fontWeight: 700,
          }}
        >
          {d.meta}
        </div>
      </div>
      <span
        className="font-body"
        style={{
          fontSize: 10,
          color: d.open ? 'var(--b-ink)' : 'var(--b-ink-40)',
          fontWeight: 600,
          letterSpacing: '0.08em',
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
