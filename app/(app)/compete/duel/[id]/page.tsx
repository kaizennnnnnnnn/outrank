'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDocument } from '@/hooks/useFirestore';
import { DuelVsScreen } from '@/components/competition/DuelVsScreen';
import { CompetitionTimer } from '@/components/competition/CompetitionTimer';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Competition } from '@/types/competition';
import Link from 'next/link';
import { Masthead } from '@/components/editorial/Masthead';

export default function DuelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: competition, loading } = useDocument<Competition>('competitions', id);

  // Detect which participant's score just changed on the latest onSnapshot
  // tick so we can pulse the matching score number in DuelVsScreen. Stores
  // each participant's last-seen score keyed by userId; on every render with
  // a fresh competition we diff and fire a brief 'p1'/'p2' pulse.
  const prevScoresRef = useRef<Record<string, number>>({});
  const [pulseSide, setPulseSide] = useState<'p1' | 'p2' | null>(null);

  const me = competition?.participants.find((p) => p.userId === user?.uid);
  const opponent = competition?.participants.find((p) => p.userId !== user?.uid);

  useEffect(() => {
    if (!competition || !me || !opponent) return;
    const prevMine = prevScoresRef.current[me.userId];
    const prevOpp = prevScoresRef.current[opponent.userId];
    let side: 'p1' | 'p2' | null = null;
    if (prevMine !== undefined && me.score > prevMine) side = 'p1';
    else if (prevOpp !== undefined && opponent.score > prevOpp) side = 'p2';
    prevScoresRef.current[me.userId] = me.score;
    prevScoresRef.current[opponent.userId] = opponent.score;
    if (side) {
      setPulseSide(side);
      const handle = window.setTimeout(() => setPulseSide(null), 700);
      return () => window.clearTimeout(handle);
    }
  }, [competition, me, opponent]);

  if (loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '24px 22px' }}>
          <Skeleton className="h-64" />
          <div style={{ marginTop: 14 }}>
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            Duel not found.
          </p>
          <Link href="/compete">
            <Button variant="secondary" className="mt-4">Back to Compete</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!me || !opponent) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-body"
            style={{ fontSize: 14, color: 'var(--b-ink-60)', fontStyle: 'italic' }}
          >
            You are not part of this duel.
          </p>
        </div>
      </div>
    );
  }

  const isWinning = me.score > opponent.score;
  const gap = Math.abs(me.score - opponent.score);

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="The Duel" />

        <div style={{ padding: '0 22px' }}>
          {/* Top bar: back + timer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <Link
              href="/compete"
              className="font-body"
              style={{
                fontSize: 10,
                color: 'var(--b-ink-60)',
                textDecoration: 'none',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
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
            pulseSide={pulseSide}
          />

          {/* Status */}
          <div
            style={{
              marginTop: 18,
              padding: '20px 14px',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
              textAlign: 'center',
            }}
          >
            {competition.status === 'active' ? (
              <>
                <div
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  {isWinning ? 'In the Lead' : gap === 0 ? 'Tied' : 'Behind'}
                </div>
                <div
                  className="font-display tabular"
                  style={{
                    fontSize: 38,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    lineHeight: 1,
                    marginTop: 4,
                    color: isWinning ? '#34d399' : gap === 0 ? '#fbbf24' : '#ef4444',
                  }}
                >
                  {isWinning ? `+${gap}` : gap === 0 ? 'TIED' : `−${gap}`}
                </div>
                <p
                  className="font-body"
                  style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 10, fontStyle: 'italic' }}
                >
                  Log your {competition.categorySlug} habits to increase your score.
                </p>
              </>
            ) : competition.status === 'completed' ? (
              <>
                <div
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
                >
                  Duel Complete
                </div>
                <div
                  className="font-display"
                  style={{ fontSize: 30, fontStyle: 'italic', fontWeight: 500, marginTop: 4, lineHeight: 1 }}
                >
                  {isWinning ? (
                    <span style={{ color: '#34d399' }}>You won.</span>
                  ) : gap === 0 ? (
                    <span style={{ color: '#fbbf24' }}>Draw.</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>You lost.</span>
                  )}
                </div>
              </>
            ) : (
              <p
                className="font-body"
                style={{ fontSize: 13, color: '#fbbf24', fontStyle: 'italic' }}
              >
                Waiting for opponent to accept…
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
