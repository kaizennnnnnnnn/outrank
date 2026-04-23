'use client';

import { useState, useEffect } from 'react';
import { useCompetitions } from '@/hooks/useCompetitions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { updateDocument, getDocument } from '@/lib/firestore';
import { increment, arrayUnion } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';
import { DuelResultModal } from '@/components/competition/DuelResultModal';
import { DuelEndedCard } from '@/components/competition/DuelEndedCard';
import { Competition } from '@/types/competition';
import Link from 'next/link';

export default function CompetePage() {
  const { user } = useAuth();
  const { competitions, loading } = useCompetitions();
  const addToast = useUIStore((s) => s.addToast);
  const [processing, setProcessing] = useState<string | null>(null);
  const [localUpdates, setLocalUpdates] = useState<Record<string, string>>({});

  // Apply local status overrides for instant UI updates
  const comps = competitions.map((c) => ({
    ...c,
    status: localUpdates[c.id || ''] || c.status,
  }));

  const now = Date.now();
  const hasEnded = (c: typeof comps[number]) => {
    const end = c.endDate?.toDate?.()?.getTime?.() ?? 0;
    return end > 0 && end <= now;
  };
  const hasClaimed = (c: typeof comps[number]) =>
    !!(c as unknown as { claimedBy?: string[] }).claimedBy?.includes(user?.uid || '');

  // A duel is "ended" if either the end date passed OR it's been marked completed
  const endedUnclaimed = comps.filter((c) =>
    (c.status === 'active' && hasEnded(c) && !hasClaimed(c)) ||
    (c.status === 'completed' && !hasClaimed(c))
  );
  const activeComps = comps.filter((c) => c.status === 'active' && !hasEnded(c));
  const incomingChallenges = comps.filter(
    (c) => c.status === 'pending' && c.creatorId !== user?.uid
  );
  const sentChallenges = comps.filter(
    (c) => c.status === 'pending' && c.creatorId === user?.uid
  );

  // Duel result modal state
  const [resultDuel, setResultDuel] = useState<Competition | null>(null);
  const [opponentOrb, setOpponentOrb] = useState<{ tier?: number; baseColor?: string; pulseColor?: string; ringColor?: string } | null>(null);

  // Fetch the opponent's orb cosmetics whenever the result modal opens
  useEffect(() => {
    if (!resultDuel || !user) { setOpponentOrb(null); return; }
    const opp = resultDuel.participants.find((p) => p.userId !== user.uid);
    if (!opp) return;
    (async () => {
      try {
        const doc = await getDocument<Record<string, unknown>>('users', opp.userId);
        if (!doc) { setOpponentOrb({}); return; }
        setOpponentOrb({
          tier: (doc.orbTier as number) || 1,
          baseColor: (doc.orbBaseColor as string) || undefined,
          pulseColor: (doc.orbPulseColor as string) || undefined,
          ringColor: (doc.orbRingColor as string) || undefined,
        });
      } catch {
        setOpponentOrb({});
      }
    })();
  }, [resultDuel, user]);

  const handleClaim = async (comp: Competition, r: { won: boolean; tie: boolean; xp: number; fragments: number }) => {
    if (!user || !comp.id) return;
    try {
      await updateDocument('competitions', comp.id, {
        status: 'completed',
        claimedBy: arrayUnion(user.uid),
      });
      // Grant XP + fragments; track duel wins for the titles vault
      const userUpdate: Record<string, ReturnType<typeof increment>> = {
        totalXP: increment(r.xp),
        weeklyXP: increment(r.xp),
        monthlyXP: increment(r.xp),
        fragments: increment(r.fragments),
        seasonPassXP: increment(r.xp),
      };
      if (r.won) userUpdate.duelWins = increment(1);
      await updateDocument('users', user.uid, userUpdate);
      addToast({ type: 'success', message: r.won ? `Victory! +${r.xp} XP, +${r.fragments} fragments` : `+${r.xp} XP, +${r.fragments} fragments` });
    } catch (err) {
      console.error('claim duel failed', err);
      addToast({ type: 'error', message: 'Could not claim — try again' });
    }
  };

  const acceptDuel = async (compId: string) => {
    setProcessing(compId);
    try {
      await updateDocument('competitions', compId, { status: 'active' });
      setLocalUpdates((prev) => ({ ...prev, [compId]: 'active' }));
      addToast({ type: 'success', message: 'Duel accepted! Game on!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to accept duel' });
    } finally {
      setProcessing(null);
    }
  };

  const declineDuel = async (compId: string) => {
    setProcessing(compId);
    try {
      await updateDocument('competitions', compId, { status: 'completed' });
      setLocalUpdates((prev) => ({ ...prev, [compId]: 'completed' }));
      addToast({ type: 'info', message: 'Duel declined' });
    } catch {
      addToast({ type: 'error', message: 'Failed to decline duel' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-heading">Compete</h1>
          <p className="text-sm text-slate-500">Duels, tournaments, and challenges.</p>
        </div>
        <Link href="/friends">
          <Button>Challenge a Friend</Button>
        </Link>
      </div>

      {/* Incoming Challenges — need to accept/decline */}
      {incomingChallenges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
            Incoming Challenges ({incomingChallenges.length})
          </h2>
          {incomingChallenges.map((comp) => {
            const challenger = comp.participants.find((p) => p.userId === comp.creatorId);
            return (
              <div key={comp.id} className="glass-card rounded-2xl p-4 border border-yellow-500/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar src={challenger?.avatarUrl} alt={challenger?.username || ''} size="md" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{challenger?.username} challenged you!</p>
                    <p className="text-xs text-slate-500">{comp.title}</p>
                  </div>
                  <SwordsCrossIcon size={24} className="text-yellow-400" />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    loading={processing === comp.id}
                    onClick={() => comp.id && acceptDuel(comp.id)}
                  >
                    Accept Challenge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={processing === comp.id}
                    onClick={() => comp.id && declineDuel(comp.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Ended — claim rewards */}
      {endedUnclaimed.length > 0 && user && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider">
            Duels Ended — Claim Rewards ({endedUnclaimed.length})
          </h2>
          {endedUnclaimed.map((comp) => (
            <DuelEndedCard
              key={comp.id}
              comp={comp as Competition}
              currentUserId={user.uid}
              onClaim={(c) => setResultDuel(c)}
            />
          ))}
        </section>
      )}

      {/* Duel Result Modal */}
      {resultDuel && user && (
        <DuelResultModal
          isOpen={!!resultDuel}
          onClose={() => setResultDuel(null)}
          competition={resultDuel}
          currentUserId={user.uid}
          onClaim={(r) => handleClaim(resultDuel, r)}
          myOrb={{
            tier: (user as unknown as Record<string, number>).orbTier || 1,
            baseColor: (user as unknown as Record<string, string>).orbBaseColor,
            pulseColor: (user as unknown as Record<string, string>).orbPulseColor,
            ringColor: (user as unknown as Record<string, string>).orbRingColor,
          }}
          opponentOrb={opponentOrb || undefined}
        />
      )}

      {/* Active Duels */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-orange-400 uppercase tracking-wider">Active Duels</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : activeComps.length === 0 ? (
          <EmptyState
            icon={<SwordsCrossIcon size={40} className="text-red-400" />}
            title="No active duels"
            description="Challenge a friend to a duel from the leaderboard or their profile."
          />
        ) : (
          activeComps.map((comp) => {
            const me = comp.participants.find((p) => p.userId === user?.uid);
            const opponent = comp.participants.find((p) => p.userId !== user?.uid);
            if (!me || !opponent) return null;

            return (
              <Link key={comp.id} href={`/compete/duel/${comp.id}`}>
                <div className="glass-card rounded-2xl p-4 glow-hover transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={me.avatarUrl} alt={me.username} size="md" />
                      <div>
                        <p className="text-sm font-bold text-white">{me.username}</p>
                        <p className="font-mono text-lg text-orange-400">{me.score}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="font-heading text-xl text-slate-500">VS</span>
                      <p className="text-[10px] text-slate-600">{comp.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-sm font-bold text-white">{opponent.username}</p>
                        <p className="font-mono text-lg text-orange-400">{opponent.score}</p>
                      </div>
                      <Avatar src={opponent.avatarUrl} alt={opponent.username} size="md" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>

      {/* Sent Challenges — waiting for response */}
      {sentChallenges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Waiting for Response</h2>
          {sentChallenges.map((comp) => {
            const opponent = comp.participants.find((p) => p.userId !== user?.uid);
            return (
              <div key={comp.id} className="glass-card rounded-2xl p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <SwordsCrossIcon size={20} className="text-slate-500" />
                  <div className="flex-1">
                    <p className="text-sm text-white">{comp.title}</p>
                    <p className="text-xs text-slate-600">Waiting for {opponent?.username} to respond...</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
