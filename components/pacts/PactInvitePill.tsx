'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Pact } from '@/types/pact';
import { acceptPact, declinePact, PACT_REWARDS } from '@/lib/pacts';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';

interface Props {
  pact: Pact;
  /** True for invites the user has sent (waiting on the other side). */
  outgoing?: boolean;
}

/**
 * Pending invite row, editorial paper-and-ink. Two flavors:
 *
 *   • Incoming (outgoing == false) — Accept / Decline buttons.
 *   • Outgoing (outgoing == true) — read-only, "waiting for X" copy.
 */
export function PactInvitePill({ pact, outgoing }: Props) {
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  if (!user || !pact.id) return null;

  const partnerId = pact.participants.find((p) => p !== user.uid) || pact.participants[1];
  const partnerMeta = pact.participantsMeta[partnerId];
  const reward = PACT_REWARDS[pact.durationDays];

  const onAccept = async () => {
    if (!pact.id) return;
    setBusy('accept');
    try {
      await acceptPact(pact.id, user.uid);
      addToast({ type: 'success', message: 'Pact accepted — clock starts now.' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not accept';
      addToast({ type: 'error', message: msg });
    } finally {
      setBusy(null);
    }
  };

  const onDecline = async () => {
    if (!pact.id) return;
    setBusy('decline');
    try {
      await declinePact(pact.id, user.uid);
      addToast({ type: 'info', message: 'Pact declined.' });
    } catch {
      addToast({ type: 'error', message: 'Could not decline' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="dir-b"
      style={{
        background: 'transparent',
        border: '1px solid var(--b-rule)',
        borderLeft: `3px solid ${pact.habitColor}`,
        padding: 14,
        color: 'var(--b-ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar
          src={partnerMeta?.avatarUrl || ''}
          alt={partnerMeta?.username || ''}
          size="md"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
            {outgoing ? 'Waiting On' : 'Pact Invite'}
          </div>
          <p
            className="font-display"
            style={{
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 16,
              color: 'var(--b-ink)',
              margin: '2px 0 0',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {partnerMeta?.username || 'A friend'}
          </p>
          <p
            className="font-mono tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 4 }}
          >
            <span style={{ color: pact.habitColor, fontWeight: 600 }}>
              {pact.habitName}
            </span>
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            {pact.durationDays}-day
            <span style={{ color: 'var(--b-ink-40)', margin: '0 6px' }}>·</span>
            <span style={{ color: 'var(--b-accent)' }}>
              +{reward.xp} XP / +{reward.fragments} frags each
            </span>
          </p>
        </div>
        {!outgoing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={onDecline}
              disabled={busy !== null}
              className="font-body"
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--b-ink-60)',
                border: '1px solid var(--b-rule)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: busy !== null ? 'not-allowed' : 'pointer',
                opacity: busy === 'decline' ? 0.6 : 1,
              }}
            >
              {busy === 'decline' ? '…' : 'Decline'}
            </button>
            <button
              onClick={onAccept}
              disabled={busy !== null}
              className="font-body"
              style={{
                padding: '8px 12px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: '1px solid var(--b-ink)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: busy !== null ? 'not-allowed' : 'pointer',
                opacity: busy === 'accept' ? 0.6 : 1,
              }}
            >
              {busy === 'accept' ? '…' : 'Accept'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
