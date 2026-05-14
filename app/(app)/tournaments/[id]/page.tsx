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
  cancelTournamentByCreator,
  declineTournamentInvite,
  durationLabel,
  rewardForDuration,
} from '@/lib/tournament';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Auto-advance while active. Deps are narrowed to the signals that
  // matter — anything that should trigger another advance attempt:
  // status changes (recruiting → active), or matches array grows
  // (R1 spawn or R2 spawn). A wider [tournament] dep would re-fire on
  // every onSnapshot tick (including the writes we just made), which
  // is wasteful even with transactional dedupe inside the helper.
  const tId = tournament?.id;
  const tStatus = tournament?.status;
  const tMatchCount = tournament?.matches.length ?? 0;
  useEffect(() => {
    if (!tId || tStatus !== 'active') return;
    const tick = () => {
      advanceTournament(tId).catch((err) => console.error('advance failed', err));
    };
    tick();
    const handle = window.setInterval(tick, 30000);
    return () => window.clearInterval(handle);
  }, [tId, tStatus, tMatchCount]);

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
      const { started } = await acceptTournamentInvite(tournament.id, user.uid);
      addToast({
        type: 'success',
        message: started ? 'All in. Round 1 starting now.' : "You're in. Waiting on the others.",
      });
      // If this acceptance flipped the tournament to active, kick R1
      // creation immediately — don't wait for the next page visit /
      // 30-second tick. ensureR1Matches is idempotent so a duplicate
      // call from the snapshot-driven useEffect is harmless.
      if (started) {
        advanceTournament(tournament.id).catch((err) =>
          console.error('post-accept advance failed', err),
        );
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not accept';
      addToast({ type: 'error', message: m });
    } finally {
      setActionPending(false);
    }
  };

  const onCancelTournament = async () => {
    if (!tournament.id || !user) return;
    setActionPending(true);
    try {
      await cancelTournamentByCreator(tournament.id, {
        uid: user.uid,
        username: user.username,
        avatarUrl: user.avatarUrl || '',
      });
      addToast({ type: 'info', message: 'Tournament cancelled.' });
      setShowCancelConfirm(false);
    } catch (err) {
      const m = err instanceof Error ? err.message : 'Could not cancel';
      addToast({ type: 'error', message: m });
    } finally {
      setActionPending(false);
    }
  };

  const onDecline = async () => {
    if (!tournament.id || !user) return;
    setActionPending(true);
    try {
      await declineTournamentInvite(tournament.id, {
        uid: user.uid,
        username: user.username,
        avatarUrl: user.avatarUrl || '',
      });
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
              {' · '}+{reward.xp} XP{' · '}{reward.cosmeticLabel} frame + name{' · '}Tournament Champion badge
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

          {/* Creator-only cancel — only while recruiting, so a stuck
              tournament waiting on slow invitees can be reclaimed. */}
          {tournament.status === 'recruiting' && user && tournament.creatorId === user.uid && (
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelConfirm(true)}
                disabled={actionPending}
              >
                Cancel tournament
              </Button>
              <p
                className="font-body"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 6, fontStyle: 'italic' }}
              >
                Pulls the bracket. Invitees get a notification.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={onCancelTournament}
        title="Cancel tournament?"
        description="Pulls the bracket and notifies the invitees. This can't be undone — you can always start a fresh one."
        confirmText="Cancel tournament"
        cancelText="Keep waiting"
        variant="danger"
        loading={actionPending}
      />
    </div>
  );
}
