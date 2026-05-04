'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFriendsLeague, useLastFriendsLeagueSnapshot } from '@/hooks/useFriendsLeague';
import { LeagueRow } from '@/components/friendsLeague/LeagueRow';
import { LastWeekBanner } from '@/components/friendsLeague/LastWeekBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { isoWeekRange, formatIsoDate } from '@/lib/friendsLeague';
import { Masthead } from '@/components/editorial/Masthead';

export default function FriendsLeaguePage() {
  const { user } = useAuth();
  const { entries, myRank, myScore, loading, weekKey } = useFriendsLeague();
  const { snapshot } = useLastFriendsLeagueSnapshot();

  const range = isoWeekRange();

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Friends League" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Friends League · {weekKey}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <h1
              className="font-display"
              style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
            >
              <em style={{ fontStyle: 'italic' }}>This Week</em>
            </h1>
            {!loading && myRank > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div
                  className="font-display tabular"
                  style={{
                    fontSize: 30,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    lineHeight: 1,
                    color: myRank <= 3 ? 'var(--b-accent)' : 'var(--b-ink)',
                  }}
                >
                  #{myRank}
                </div>
                <div
                  className="font-mono tabular"
                  style={{
                    fontSize: 9,
                    color: 'var(--b-ink-60)',
                    marginTop: 2,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {myScore.toLocaleString()} XP
                </div>
              </div>
            )}
          </div>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, maxWidth: 420 }}
          >
            You + your friends, ranked by this week&rsquo;s XP. Top 3 split fragments when the week settles Sunday → Monday.
          </p>
          <p
            className="font-mono tabular"
            style={{
              fontSize: 9,
              color: 'var(--b-ink-40)',
              marginTop: 4,
              letterSpacing: '0.04em',
            }}
          >
            {formatIsoDate(range.start)} → {formatIsoDate(range.end)} (UTC)
          </p>

          {/* Last week banner */}
          {snapshot && (
            <div style={{ marginTop: 18 }}>
              <LastWeekBanner snapshot={snapshot} />
            </div>
          )}

          {/* This week's standings */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : entries.length <= 1 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p
                className="font-display"
                style={{ fontSize: 22, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
              >
                Your league is just you.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 320, marginInline: 'auto', lineHeight: 1.5 }}
              >
                Add at least 2 friends to compete. Top 3 split fragments at week end.
              </p>
              <Link
                href="/friends"
                className="font-body"
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  padding: '8px 14px',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--b-paper)',
                  background: 'var(--b-ink)',
                  textDecoration: 'none',
                }}
              >
                Find friends →
              </Link>
            </div>
          ) : (
            <section>
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 12,
                  borderTop: '1px solid var(--b-ink)',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
                  The Standings
                </div>
                <div
                  className="font-mono tabular"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
                >
                  § {String(entries.length).padStart(2, '0')}
                </div>
              </div>
              <div>
                {entries.map((entry) => (
                  <LeagueRow
                    key={entry.userId}
                    entry={entry}
                    isMe={entry.userId === user?.uid}
                    showRewardPreview={entries.length >= 3}
                  />
                ))}
              </div>
              <p
                className="font-mono"
                style={{
                  fontSize: 9,
                  color: 'var(--b-ink-40)',
                  marginTop: 12,
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                  fontStyle: 'italic',
                }}
              >
                Settles Monday 00:00 UTC. Standings refresh as your friends log.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
