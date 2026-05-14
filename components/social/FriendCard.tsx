'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { UserProfile, DuelRecordEntry } from '@/types/user';
import Link from 'next/link';

interface FriendCardProps {
  user: UserProfile;
  status?: 'none' | 'pending' | 'accepted';
  onAdd?: () => void;
  onAccept?: () => void;
  onRemove?: () => void;
  /** Viewer's head-to-head record against this user. Pulled from the
   *  viewer's own `duelRecord[user.uid]` — represents "my record vs them".
   *  Absent when there's no completed duel between the pair. */
  duelRecord?: DuelRecordEntry;
}

export function FriendCard({ user, status = 'none', onAdd, onAccept, onRemove, duelRecord }: FriendCardProps) {
  const totalDuels = duelRecord
    ? (duelRecord.wins || 0) + (duelRecord.losses || 0) + (duelRecord.ties || 0)
    : 0;
  return (
    <div className="flex items-center gap-3 glass-card rounded-xl p-3">
      <Link href={`/profile/${user.username}`}>
        <Avatar src={user.avatarUrl} alt={user.username} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`}>
          <p className="text-sm font-semibold text-white hover:text-orange-400 truncate">
            {user.username}
          </p>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Lv.{user.level}</span>
          <TitleDisplay totalXP={user.totalXP} size="sm" />
          <span className="text-slate-600">&bull;</span>
          <span className="font-mono text-slate-500">{user.totalXP.toLocaleString()} XP</span>
        </div>
        {totalDuels > 0 && (
          <div className="flex items-center gap-1 text-[10px] font-mono mt-0.5 text-slate-400 tracking-wider uppercase">
            <span>Duels</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400">{duelRecord!.wins || 0}W</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">{duelRecord!.losses || 0}L</span>
            {(duelRecord!.ties || 0) > 0 && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-amber-400">{duelRecord!.ties}T</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {status === 'none' && onAdd && (
          <Button size="sm" onClick={onAdd}>Add</Button>
        )}
        {status === 'pending' && onAccept && (
          <>
            <Button size="sm" onClick={onAccept}>Accept</Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>Decline</Button>
          </>
        )}
        {status === 'accepted' && (
          <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>
        )}
      </div>
    </div>
  );
}
