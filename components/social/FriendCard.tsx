'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { UserProfile } from '@/types/user';
import Link from 'next/link';

interface FriendCardProps {
  user: UserProfile;
  status?: 'none' | 'pending' | 'accepted';
  onAdd?: () => void;
  onAccept?: () => void;
  onRemove?: () => void;
}

export function FriendCard({ user, status = 'none', onAdd, onAccept, onRemove }: FriendCardProps) {
  return (
    <div className="flex items-center gap-3 glass-card rounded-xl p-3">
      <Link href={`/profile/${user.username}`}>
        <Avatar src={user.avatarUrl} alt={user.username} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`}>
          <p className="text-sm font-semibold text-white hover:text-cyan-400 truncate">
            {user.username}
          </p>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Lv.{user.level}</span>
          <TitleDisplay totalXP={user.totalXP} size="sm" />
          <span className="text-slate-600">&bull;</span>
          <span className="font-mono text-slate-500">{user.totalXP.toLocaleString()} XP</span>
        </div>
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
