'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
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
 * Pending invite row. Two flavors:
 *
 *   • Incoming (outgoing == false) — Accept / Decline buttons.
 *   • Outgoing (outgoing == true) — read-only, "waiting for X" copy.
 *
 * Hidden once status flips out of 'pending'.
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
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${pact.habitColor}14 0%, rgba(11,11,20,0.7) 70%)`,
        borderLeft: `2px solid ${pact.habitColor}`,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar src={partnerMeta?.avatarUrl || ''} alt={partnerMeta?.username || ''} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
            {outgoing ? 'Waiting on' : 'Pact invite'}
          </p>
          <p className="text-sm font-bold text-white truncate">
            {partnerMeta?.username || 'A friend'}
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
            <span style={{ color: pact.habitColor }} className="font-bold">{pact.habitName}</span>
            <span className="text-slate-700 mx-1.5">·</span>
            {pact.durationDays}-day
            <span className="text-slate-700 mx-1.5">·</span>
            <span className="text-emerald-400">+{reward.xp} XP / +{reward.fragments} frags each</span>
          </p>
        </div>
        {!outgoing && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={onDecline}
              loading={busy === 'decline'}
              disabled={busy !== null}
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              loading={busy === 'accept'}
              disabled={busy !== null}
            >
              Accept
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
