'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { UserProfile } from '@/types/user';
import Link from 'next/link';

interface UserSearchResultProps {
  user: UserProfile;
  isFriend: boolean;
  isPending: boolean;
  onAdd: () => void;
}

export function UserSearchResult({ user, isFriend, isPending, onAdd }: UserSearchResultProps) {
  return (
    <div className="flex items-center gap-3 bg-[#10101a] border border-[#1e1e30] rounded-xl p-3">
      <Link href={`/profile/${user.username}`}>
        <Avatar src={user.avatarUrl} alt={user.username} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${user.username}`}>
          <p className="text-sm font-semibold text-white hover:text-orange-400">{user.username}</p>
        </Link>
        <p className="text-xs text-slate-500">
          Lv.{user.level} &bull; {user.totalXP.toLocaleString()} XP
        </p>
      </div>
      {isFriend ? (
        <span className="text-xs text-emerald-400 font-medium">Friends</span>
      ) : isPending ? (
        <span className="text-xs text-yellow-400 font-medium">Pending</span>
      ) : (
        <Button size="sm" onClick={onAdd}>Add Friend</Button>
      )}
    </div>
  );
}
