'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { getDocument } from '@/lib/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getOrbTier } from '@/constants/orbTiers';
import { UserProfile } from '@/types/user';
import { TrophyIconFull, StarIcon } from '@/components/ui/AppIcons';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface OrbRanking {
  userId: string;
  username: string;
  avatarUrl: string;
  orbTier: number;
  orbEnergy: number;
  fragments: number;
  tierName: string;
  score: number; // tier * 100 + energy
}

export default function OrbLeaderboardPage() {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [rankings, setRankings] = useState<OrbRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchRankings() {
      const entries: OrbRanking[] = [];

      // Add self
      const ud = user as unknown as Record<string, unknown>;
      entries.push({
        userId: user!.uid,
        username: user!.username,
        avatarUrl: user!.avatarUrl || '',
        orbTier: (ud.orbTier as number) || 1,
        orbEnergy: (ud.orbEnergy as number) || 50,
        fragments: (ud.fragments as number) || 0,
        tierName: getOrbTier((ud.orbTier as number) || 1).name,
        score: ((ud.orbTier as number) || 1) * 100 + ((ud.orbEnergy as number) || 50),
      });

      // Add friends
      for (const f of friends) {
        try {
          const profile = await getDocument<UserProfile>('users', f.id);
          if (profile) {
            const pd = profile as unknown as Record<string, unknown>;
            entries.push({
              userId: f.id,
              username: profile.username,
              avatarUrl: profile.avatarUrl || '',
              orbTier: (pd.orbTier as number) || 1,
              orbEnergy: (pd.orbEnergy as number) || 50,
              fragments: (pd.fragments as number) || 0,
              tierName: getOrbTier((pd.orbTier as number) || 1).name,
              score: ((pd.orbTier as number) || 1) * 100 + ((pd.orbEnergy as number) || 50),
            });
          }
        } catch { /* skip */ }
      }

      // Sort by score (tier * 100 + energy)
      entries.sort((a, b) => b.score - a.score);
      setRankings(entries);
      setLoading(false);
    }

    fetchRankings();
  }, [user, friends]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-heading">Orb Rankings</h1>
        <p className="text-sm text-slate-500">Compete for the strongest Soul Orb among friends.</p>
      </div>

      {/* Weekly Prize Banner */}
      <div className="glass-card rounded-2xl p-4 border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-[#10101a]">
        <div className="flex items-center gap-3">
          <TrophyIconFull size={24} className="text-yellow-400" />
          <div>
            <p className="text-sm font-bold text-white">Weekly Prize</p>
            <p className="text-xs text-slate-400">#1 gets 50 fragments + exclusive badge. Top 3 get 25 fragments.</p>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : rankings.length === 0 ? (
          <EmptyState icon={<StarIcon size={40} className="text-orange-400" />} title="No rankings yet" />
        ) : (
          <div className="divide-y divide-[#1e1e30]">
            {rankings.map((entry, i) => {
              const rank = i + 1;
              const isMe = entry.userId === user?.uid;
              const tierConfig = getOrbTier(entry.orbTier);

              return (
                <div key={entry.userId} className={cn(
                  'flex items-center gap-4 px-4 py-3',
                  isMe && 'bg-red-500/5',
                  rank === 1 && 'bg-yellow-500/5'
                )}>
                  {/* Rank */}
                  <span className={cn(
                    'font-mono text-lg font-bold w-8 text-center',
                    rank === 1 && 'text-yellow-400',
                    rank === 2 && 'text-slate-300',
                    rank === 3 && 'text-amber-700',
                    rank > 3 && 'text-slate-600'
                  )}>
                    {rank}
                  </span>

                  {/* User */}
                  <Link href={`/profile/${entry.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={entry.avatarUrl} alt={entry.username} size="sm" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium truncate', isMe ? 'text-orange-400' : 'text-white')}>
                        {entry.username} {isMe && '(you)'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {entry.tierName} &bull; {entry.orbEnergy}% energy &bull; {entry.fragments} fragments
                      </p>
                    </div>
                  </Link>

                  {/* Tier badge */}
                  <div className="text-right">
                    <p className="font-heading text-sm font-bold" style={{ color: tierConfig.colors.mid }}>
                      T{entry.orbTier}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
