'use client';

import { use } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDocument, useCollection } from '@/hooks/useFirestore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FlagIcon, SearchIcon, UsersFullIcon } from '@/components/ui/AppIcons';
import { orderBy } from '@/lib/firestore';
import { League, LeagueMember } from '@/types/league';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export default function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const { data: league, loading } = useDocument<League>('leagues', id);
  const { data: members, loading: membersLoading } = useCollection<LeagueMember>(
    `leagues/${id}/members`,
    [orderBy('totalXP', 'desc')],
    true
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600 mx-auto" />
        <h1 className="text-xl font-bold text-white mt-4">League not found</h1>
      </div>
    );
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/leagues/join/${league.inviteCode}`);
    addToast({ type: 'success', message: 'Invite link copied!' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 flex items-center justify-center">
            <FlagIcon size={28} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white font-heading">{league.name}</h1>
            <p className="text-sm text-slate-500">{league.memberCount} members</p>
            {league.description && (
              <p className="text-sm text-slate-400 mt-1">{league.description}</p>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={copyInvite}>
            Share Invite
          </Button>
        </div>
        {league.pinnedMessage && (
          <div className="mt-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-xs text-yellow-400">{league.pinnedMessage}</p>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1e1e30]">
          <h2 className="text-sm font-bold text-white">Members Leaderboard</h2>
        </div>
        {membersLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={<UsersFullIcon size={40} className="text-red-400" />} title="No members yet" />
        ) : (
          <div className="divide-y divide-[#1e1e30]">
            {members.map((member, i) => {
              const rank = i + 1;
              const isMe = member.userId === user?.uid;
              return (
                <div key={member.userId} className={cn('flex items-center gap-4 px-4 py-3', isMe && 'bg-red-500/5')}>
                  <span className={cn(
                    'font-mono text-lg font-bold w-8 text-center',
                    rank === 1 && 'text-yellow-400',
                    rank === 2 && 'text-slate-300',
                    rank === 3 && 'text-amber-700',
                    rank > 3 && 'text-slate-600'
                  )}>
                    {rank}
                  </span>
                  <Avatar src={member.avatarUrl} alt={member.username || 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isMe ? 'text-orange-400' : 'text-white')}>
                      {member.username || member.userId} {isMe && '(you)'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-white">
                    {member.totalXP.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs text-slate-500 mb-2">Invite Code</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[#18182a] rounded-xl px-4 py-2.5 font-mono text-orange-400 text-sm">
            {league.inviteCode}
          </code>
          <Button size="sm" onClick={copyInvite}>Copy Link</Button>
        </div>
      </div>
    </div>
  );
}
