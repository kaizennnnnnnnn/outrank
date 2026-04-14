'use client';

import { useState } from 'react';
import { useCompetitions } from '@/hooks/useCompetitions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { updateDocument, removeDocument } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

export default function CompetePage() {
  const { user } = useAuth();
  const { competitions, loading } = useCompetitions();
  const addToast = useUIStore((s) => s.addToast);
  const [processing, setProcessing] = useState<string | null>(null);

  const activeComps = competitions.filter((c) => c.status === 'active');
  // Pending challenges where I'm NOT the creator (I need to respond)
  const incomingChallenges = competitions.filter(
    (c) => c.status === 'pending' && c.creatorId !== user?.uid
  );
  // Challenges I sent that are waiting
  const sentChallenges = competitions.filter(
    (c) => c.status === 'pending' && c.creatorId === user?.uid
  );

  const acceptDuel = async (compId: string) => {
    setProcessing(compId);
    try {
      await updateDocument('competitions', compId, { status: 'active' });
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
