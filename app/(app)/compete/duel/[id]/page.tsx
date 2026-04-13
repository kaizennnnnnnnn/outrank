'use client';

import { use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDocument } from '@/hooks/useFirestore';
import { DuelVsScreen } from '@/components/competition/DuelVsScreen';
import { CompetitionTimer } from '@/components/competition/CompetitionTimer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Competition } from '@/types/competition';
import { SearchIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: competition, loading } = useDocument<Competition>('competitions', id);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600" />
        <h1 className="text-xl font-bold text-white mt-4">Duel not found</h1>
        <Link href="/compete">
          <Button variant="secondary" className="mt-4">Back to Compete</Button>
        </Link>
      </div>
    );
  }

  const me = competition.participants.find((p) => p.userId === user?.uid);
  const opponent = competition.participants.find((p) => p.userId !== user?.uid);

  if (!me || !opponent) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-500">You are not part of this duel.</p>
      </div>
    );
  }

  const isWinning = me.score > opponent.score;
  const gap = Math.abs(me.score - opponent.score);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/compete" className="text-sm text-slate-500 hover:text-white">
          ← Back
        </Link>
        {competition.endDate && (
          <CompetitionTimer endDate={competition.endDate} />
        )}
      </div>

      {/* VS Screen */}
      <DuelVsScreen
        player1={me}
        player2={opponent}
        title={competition.title}
      />

      {/* Status */}
      <div className="glass-card rounded-2xl p-6 text-center">
        {competition.status === 'active' ? (
          <>
            <p className="text-sm text-slate-400 mb-2">
              {isWinning ? "You're in the lead!" : gap === 0 ? "It's a tie!" : "You're behind!"}
            </p>
            <p className="font-heading text-3xl font-bold text-white">
              {isWinning ? `+${gap}` : gap === 0 ? 'TIED' : `-${gap}`}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Log your {competition.categorySlug} habits to increase your score!
            </p>
          </>
        ) : competition.status === 'completed' ? (
          <>
            <p className="text-sm text-slate-400 mb-2">Duel Complete!</p>
            <p className="font-heading text-3xl font-bold">
              {isWinning ? (
                <span className="text-emerald-400">You Won!</span>
              ) : gap === 0 ? (
                <span className="text-yellow-400">Draw! 🤝</span>
              ) : (
                <span className="text-red-400">You Lost 😤</span>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-yellow-400">Waiting for opponent to accept...</p>
        )}
      </div>
    </div>
  );
}
