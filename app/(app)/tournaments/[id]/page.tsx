'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDocument } from '@/hooks/useFirestore';
import { Tournament } from '@/types/competition';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Masthead } from '@/components/editorial/Masthead';
import { useUIStore } from '@/store/uiStore';
import {
  acceptTournamentInvite,
  advanceTournament,
  declineTournamentInvite,
  durationLabel,
  rewardForDuration,
} from '@/lib/tournament';
import { TournamentBracket } from '@/components/competition/TournamentBracket';

/**
 * Tournament detail page — bracket view with live snapshot.
 *
 * Three roles influence the action surface:
 *   - Pending invitee → Accept / Decline buttons.
 *   - Already accepted, recruiting → waiting message.
 *   - Active → bracket, no extra actions (matches link out to duels).
 *
 * Auto-advance: while status === 'active', re-runs advanceTournament
 * on mount and every 30s. Transactions inside the helper make repeat
 * calls safe (R2 creation and champion crowning are write-once).
 */
export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: tournament, loading } = useDocument<Tournament>('tournaments', id);
  const addToast = useUIStore((s) => s.addToast);
  const [actionPending, setActionPending] = useState(false);

  // Auto-advance while active.
  useEffect(() => {
    if (!tournament || !tournament.id) return;
    if (tournament.status !== 'active') return;
    const tick = () => {
      advanceTournament(tournament.id as string).catch((err) =>
        console.error('advance failed', err),
      );
    };
    tick();
    const handle = window.setInterval(tick, 30000);
    return () => window.clearInterval(handle);
  }, [tournament]);

  if (loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-32" />
          <Skeleton className="h-64 mt-3" />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p className="font-display" style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500 }}>
            Tournament not found.
          </p>
          <Link href="/tournaments">
            <Button variant="secondary" className="mt-4">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const me = tournament.participants.find((p) => p.userId === user?.uid);
  const isInvolved = !!me;
  const reward = rewardForDuration(tournament.durationDaysPerRound);
  const acceptedCount = tournament.participants.filter((p) => p.accepted).length;

  const onAccept = async () => {
    if (!tournament.id || !user) return;
    setActionPending(true);
    try {
      await acceptTournamentInvite(tournament.id, user.uid);
      addToast({ type: 'success', message: 'You\'re in. Waiting on the others.' });
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not accept';
      addToast({ type: 'error', message: m });
    } finally {
      setActionPending(false);
    }
  };

  const onDecline = async () => {
    if (!tournament.id || !user) return;
    setActionPending(true);
    try {
      await declineTournamentInvite(tournament.id, { uid: user.uid, username: user.username });
      addToast({ type: 'info', message: 'Declined. Tournament cancelled.' });
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not decline';
      addToast({ type: 'error', message: m });
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Tournament" />

        <div style={{ padding: '0 22px' }}>
          <Link
            href="/tournaments"
            className="font-body"
            style={{ fontSize: 10, color: 'var(--b-ink-60)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            ← All brackets
          </Link>

          <div style={{ marginTop: 6 }}>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
              {durationLabel(tournament.durationDaysPerRound)} · {tournament.categorySlug}
            </div>
            <h1 className="font-display" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.1, marginTop: 2 }}>
              <em style={{ fontStyle: 'italic' }}>{tournament.title}</em>
            </h1>
            <p
              className="font-body tabular"
              style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 6, letterSpacing: '0.04em' }}
            >
              Champion takes <span style={{ color: 'var(--b-accent)' }}>+{reward.fragments.toLocaleString()} ◆</span>
              {' · '}+{reward.xp} XP{' · '}Tournament Champion badge
            </p>
          </div>

          {/* Action surface — accept / decline if pending invitee */}
          {isInvolved && me && tournament.status === 'recruiting' && !me.accepted && (
            <div
              style={{
                marginTop: 18,
                padding: '14px 12px',
                border: '1px solid var(--b-accent)',
              }}
            >
              <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 6 }}>
                You&rsquo;re invited
              </div>
              <p className="font-body" style={{ fontSize: 13, marginBottom: 10 }}>
                Tap accept to take a slot. The bracket starts once all four players are in.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={onAccept} disabled={actionPending} loading={actionPending} className="flex-1">
                  Accept
                </Button>
                <Button variant="ghost" onClick={onDecline} disabled={actionPending} className="flex-1">
                  Decline
                </Button>
              </div>
            </div>
          )}

          {isInvolved && me && tournament.status === 'recruiting' && me.accepted && (
            <p
              className="font-body"
              style={{ fontSize: 12, color: 'var(--b-ink-60)', fontStyle: 'italic', marginTop: 12 }}
            >
              You&rsquo;re in — waiting on {tournament.participants.length - acceptedCount} more.
            </p>
          )}

          {tournament.status === 'active' && (
            <p
              className="font-body tabular"
              style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 12, letterSpacing: '0.04em' }}
            >
              Live · log {tournament.categorySlug} habits to score for your match.
            </p>
          )}

          <div style={{ marginTop: 18 }}>
            <TournamentBracket tournament={tournament} />
          </div>
        </div>
      </div>
    </div>
  );
}
