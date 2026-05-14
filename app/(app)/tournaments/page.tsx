'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getCollection } from '@/lib/firestore';
import { Tournament } from '@/types/competition';
import { Skeleton } from '@/components/ui/Skeleton';
import { Masthead } from '@/components/editorial/Masthead';
import { durationLabel } from '@/lib/tournament';

/**
 * Tournament directory — shows every tournament the user is a
 * participant in, grouped by status (recruiting / active / completed /
 * cancelled). Tapping a row opens the bracket detail page. Sits
 * underneath /tournaments/new for the creation entry point.
 */
export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        // No Firestore filter for "participants array-contains object" —
        // pull all and filter client-side. Volume is low (per-user tournament
        // count is small) so this is fine without an indexed shadow field.
        const all = await getCollection<Tournament>('tournaments', []);
        if (cancelled) return;
        const mine = all.filter((t) => t.participants.some((p) => p.userId === user.uid));
        mine.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setTournaments(mine);
      } catch {
        if (!cancelled) setTournaments([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const groups = (tournaments || []).reduce(
    (acc, t) => {
      const key = t.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, Tournament[]>,
  );
  const order: Array<{ status: Tournament['status']; label: string }> = [
    { status: 'active', label: 'Live' },
    { status: 'recruiting', label: 'Recruiting' },
    { status: 'completed', label: 'Concluded' },
    { status: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Tournaments" />

        <div style={{ padding: '0 22px' }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Brackets
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 }}>
            <h1 className="font-display" style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: 0 }}>
              <em style={{ fontStyle: 'italic' }}>Tournaments</em>
            </h1>
            <Link
              href="/tournaments/new"
              className="font-body"
              style={{
                fontSize: 11,
                padding: '7px 12px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              New →
            </Link>
          </div>
          <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 4 }}>
            Four-player single elimination. Same category, fixed round length.
          </p>

          {tournaments === null ? (
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : tournaments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p className="font-display" style={{ fontSize: 24, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}>
                No tournaments yet.
              </p>
              <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 320, marginInline: 'auto' }}>
                Start a 4-player bracket and pull three friends into the ring.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              {order.map(({ status, label }) => {
                const items = groups[status] || [];
                if (items.length === 0) return null;
                return (
                  <section key={status} style={{ marginBottom: 22 }}>
                    <div
                      className="spread"
                      style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}
                    >
                      {label} · {items.length}
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {items.map((t) => (
                        <TournamentRow key={t.id} t={t} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TournamentRow({ t }: { t: Tournament }) {
  const acceptedCount = t.participants.filter((p) => p.accepted).length;
  const totalCount = t.participants.length;
  const meta = t.status === 'recruiting'
    ? `${acceptedCount} / ${totalCount} accepted`
    : t.status === 'active'
    ? `${t.matches.length} match${t.matches.length === 1 ? '' : 'es'} in progress`
    : t.status === 'completed'
    ? `Champion crowned`
    : `Cancelled`;
  return (
    <li>
      <Link
        href={`/tournaments/${t.id}`}
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '12px 0',
          borderBottom: '1px solid var(--b-rule)',
          textDecoration: 'none',
          color: 'inherit',
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="font-display"
            style={{
              fontSize: 16,
              fontStyle: 'italic',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.title}
          </div>
          <div className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}>
            {durationLabel(t.durationDaysPerRound)} · {t.categorySlug} · {meta}
          </div>
        </div>
        <span
          className="spread"
          style={{
            fontSize: 9,
            color: 'var(--b-ink-60)',
            letterSpacing: '0.16em',
          }}
        >
          OPEN →
        </span>
      </Link>
    </li>
  );
}
