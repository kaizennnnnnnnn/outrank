'use client';

import Link from 'next/link';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { MAX_ORB_TIER } from '@/constants/orbTiers';

/**
 * Marketing landing — editorial Direction B v2 conversion. Public
 * surface (not inside (app)/AuthGuard), so it doesn't get the
 * EditorialTabBar — just the masthead-style nameplate at top, big
 * italic display headline, the SoulOrb canvas in the middle, and
 * a 3-stat strip + black CTA at the bottom.
 *
 * No embers, no auroras, no feature grid — the aesthetic is "issue
 * I of a periodical." Sign-in link sits below the primary CTA in
 * smaller body type.
 */

export default function LandingPage() {
  return (
    <div
      className="dir-b min-h-screen"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      {/* Masthead — same nameplate the editorial app screens use,
          inlined here so the public landing doesn't need to import
          the (app)-only Masthead component (which renders today's
          date — wrong vibe for a marketing surface). */}
      <header style={{ padding: '12px 22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid var(--b-ink)',
            paddingBottom: 6,
          }}
        >
          <span className="spread" style={{ fontSize: 9 }}>
            OUTRANK
          </span>
          <span
            style={{
              fontSize: 9,
              color: 'var(--b-ink-60)',
              fontFamily: 'var(--font-inter)',
            }}
          >
            A Self-Improvement Periodical · Issue I
          </span>
        </div>
      </header>

      <main style={{ padding: '24px 22px 40px', maxWidth: 480, margin: '0 auto' }}>
        <div
          className="spread"
          style={{
            fontSize: 10,
            color: 'var(--b-accent)',
            marginBottom: 8,
          }}
        >
          Volume One — Outrank
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 56,
            fontWeight: 500,
            lineHeight: 0.95,
            margin: 0,
            color: 'var(--b-ink)',
          }}
        >
          Stop<br />
          improving<br />
          <em
            style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--b-accent)' }}
          >
            alone.
          </em>
        </h1>

        <div
          style={{
            marginTop: 22,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 1.5,
              background: 'var(--b-ink)',
              alignSelf: 'stretch',
              marginTop: 4,
            }}
          />
          <p
            className="font-body"
            style={{
              margin: 0,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'var(--b-ink)',
              maxWidth: 280,
            }}
          >
            A daily dispatch of habits, duels, and rankings — for people whose
            growth deserves an audience.
          </p>
        </div>

        {/* Real SoulOrb canvas, not the design's static circle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: '40px 0 32px',
          }}
        >
          <SoulOrb
            size={140}
            tier={MAX_ORB_TIER}
            intensity={70}
            interactive={false}
            hideLabel
          />
        </div>

        {/* 3-stat strip */}
        <div
          style={{
            borderTop: '1px solid var(--b-rule)',
            borderBottom: '1px solid var(--b-rule)',
            padding: '14px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}
        >
          {[
            { v: '52',  l: 'categories' },
            { v: '40',  l: 'badges' },
            { v: '100', l: 'levels' },
          ].map((s, i) => (
            <div
              key={s.l}
              style={{
                borderLeft: i ? '1px solid var(--b-rule)' : 'none',
                paddingLeft: i ? 12 : 0,
              }}
            >
              <div
                className="font-display tabular"
                style={{ fontSize: 30, fontWeight: 500, lineHeight: 1 }}
              >
                {s.v}
              </div>
              <div
                className="font-body"
                style={{
                  fontSize: 10,
                  color: 'var(--b-ink-60)',
                  marginTop: 2,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/welcome"
          className="font-body"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginTop: 24,
            height: 52,
            border: '1px solid var(--b-ink)',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            fontWeight: 600,
            fontSize: 13.5,
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          BEGIN COMPETING →
        </Link>

        <div
          className="font-body"
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
          }}
        >
          or{' '}
          <Link
            href="/auth/login"
            style={{ color: 'var(--b-ink)', textDecoration: 'underline' }}
          >
            sign in
          </Link>{' '}
          · free forever
        </div>
      </main>
    </div>
  );
}
