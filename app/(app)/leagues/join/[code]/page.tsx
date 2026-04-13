'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getCollection, setDocument, updateDocument, where, Timestamp } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUIStore } from '@/store/uiStore';
import { FlagIcon, SearchIcon } from '@/components/ui/AppIcons';
import { League } from '@/types/league';
import { FieldValue } from 'firebase/firestore';

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
      <div className="max-w-md mx-auto text-center py-20">
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600" />
        <h1 className="text-xl font-bold text-white mt-4">Invalid invite code</h1>
        <p className="text-sm text-slate-500 mt-2">This league doesn&apos;t exist or the code has expired.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="glass-card rounded-2xl p-8 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center mx-auto">
          <FlagIcon size={32} className="text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-white font-heading">{league.name}</h1>
        <p className="text-sm text-slate-500">{league.memberCount} members</p>
        {league.description && (
          <p className="text-sm text-slate-400">{league.description}</p>
        )}
        <Button className="w-full" onClick={handleJoin} loading={joining}>
          Join League
        </Button>
      </div>
    </div>
  );
}
