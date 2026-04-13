'use client';

import { useCompetitions } from '@/hooks/useCompetitions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

export default function CompetePage() {
  const { user } = useAuth();
  const { competitions, loading } = useCompetitions();

  const activeComps = competitions.filter((c) => c.status === 'active');
  const pendingComps = competitions.filter((c) => c.status === 'pending');

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

      {/* Pending Challenges */}
      {pendingComps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Pending Challenges</h2>
          {pendingComps.map((comp) => {
            const opponent = comp.participants.find((p) => p.userId !== user?.uid);
            return (
              <div key={comp.id} className="glass-card rounded-2xl p-4 border-yellow-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SwordsCrossIcon size={24} className="text-red-400" />
                    <div>
                      <p className="text-sm font-bold text-white">{comp.title}</p>
                      <p className="text-xs text-slate-500">vs {opponent?.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Accept</Button>
                    <Button size="sm" variant="ghost">Decline</Button>
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
