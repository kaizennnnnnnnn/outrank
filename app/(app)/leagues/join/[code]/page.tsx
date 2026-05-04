'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getCollection, setDocument, updateDocument, where, Timestamp } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUIStore } from '@/store/uiStore';
import { League } from '@/types/league';

export default function JoinLeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const leagues = await getCollection<League>('leagues', [
          where('inviteCode', '==', code.toUpperCase()),
        ]);
        setLeague(leagues[0] || null);
      } catch {
        setLeague(null);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [code]);

  const handleJoin = async () => {
    if (!user || !league?.id) return;
    setJoining(true);
    try {
      await setDocument(`leagues/${league.id}/members`, user.uid, {
        userId: user.uid,
        role: 'member',
        joinedAt: Timestamp.now(),
        totalXP: 0,
        username: user.username,
        avatarUrl: user.avatarUrl,
      });

      await updateDocument('leagues', league.id, {
        memberCount: (league.memberCount || 0) + 1,
      });

      addToast({ type: 'success', message: `Joined ${league.name}!` });
      router.push(`/leagues/${league.id}`);
    } catch {
      addToast({ type: 'error', message: 'Failed to join league' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-md mx-auto" style={{ padding: '60px 22px' }}>
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-md mx-auto" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            Invalid invite code.
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            This league doesn&rsquo;t exist or the code has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-md mx-auto" style={{ padding: '60px 22px' }}>
        <div
          style={{
            padding: '24px',
            border: '1px solid var(--b-ink)',
            borderTop: '3px solid var(--b-accent)',
            textAlign: 'center',
          }}
        >
          <div
            className="spread"
            style={{ fontSize: 9, color: 'var(--b-accent)', marginBottom: 6 }}
          >
            Invitation
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 32, fontStyle: 'italic', fontWeight: 500, lineHeight: 1, marginBottom: 4 }}
          >
            {league.name}
          </h1>
          <p
            className="font-body tabular"
            style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
          >
            {league.memberCount} member{league.memberCount === 1 ? '' : 's'}
          </p>
          {league.description && (
            <p
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--b-ink-60)',
                marginTop: 14,
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              {league.description}
            </p>
          )}
          <Button className="w-full" style={{ marginTop: 18 }} onClick={handleJoin} loading={joining}>
            Join League
          </Button>
        </div>
      </div>
    </div>
  );
}
