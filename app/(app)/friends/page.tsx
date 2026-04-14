'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CreateDuelModal } from '@/components/competition/CreateDuelModal';
import { getCollection, getDocument, setDocument, updateDocument, removeDocument, where, Timestamp } from '@/lib/firestore';
import { sanitizeUsername } from '@/lib/security';
import { useUIStore } from '@/store/uiStore';
import { UserProfile } from '@/types/user';
import { UsersFullIcon, SwordsCrossIcon } from '@/components/ui/AppIcons';
import Link from 'next/link';

// Resolved friend = friendship data + actual user profile
interface ResolvedFriend {
  friendId: string;
  profile: UserProfile | null;
  since: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const { friends, pending, loading } = useFriends();
  const addToast = useUIStore((s) => s.addToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolvedFriends, setResolvedFriends] = useState<ResolvedFriend[]>([]);
  const [resolvedPending, setResolvedPending] = useState<{ id: string; profile: UserProfile | null; direction: string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  // Duel challenge
  const [duelTarget, setDuelTarget] = useState<{ id: string; username: string; avatar: string } | null>(null);

  // Resolve friend IDs to actual profiles
  useEffect(() => {
    async function resolveProfiles() {
      if (loading) return;

      // Resolve accepted friends
      const resolved: ResolvedFriend[] = [];
      for (const f of friends) {
        const profile = await getDocument<UserProfile>('users', f.id);
        resolved.push({
          friendId: f.id,
          profile,
          since: f.createdAt?.toDate?.().toLocaleDateString() || '',
        });
      }
      setResolvedFriends(resolved);

      // Resolve pending requests
      const pendingResolved = [];
      for (const p of pending.filter((p) => p.direction === 'received')) {
        const profile = await getDocument<UserProfile>('users', p.id);
        pendingResolved.push({ id: p.id, profile, direction: p.direction });
      }
      setResolvedPending(pendingResolved);

      setLoadingProfiles(false);
    }
    resolveProfiles();
  }, [friends, pending, loading]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    setSearching(true);
    try {
      const sanitized = sanitizeUsername(searchQuery).toLowerCase();
      const results = await getCollection<UserProfile>('users', [
        where('username', '>=', sanitized),
        where('username', '<=', sanitized + '\uf8ff'),
      ]);
      setSearchResults(results.filter((u) => u.uid !== user.uid));
    } catch {
      addToast({ type: 'error', message: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (friendId: string) => {
    if (!user) return;
    try {
      await setDocument(`friendships/${user.uid}/friends`, friendId, {
        status: 'pending',
        createdAt: Timestamp.now(),
        direction: 'sent',
      });
      await setDocument(`friendships/${friendId}/friends`, user.uid, {
        status: 'pending',
        createdAt: Timestamp.now(),
        direction: 'received',
      });
      addToast({ type: 'success', message: 'Friend request sent!' });
      // Remove from search results
      setSearchResults((prev) => prev.filter((u) => u.uid !== friendId));
    } catch {
      addToast({ type: 'error', message: 'Failed to send request' });
    }
  };

  const acceptRequest = async (friendId: string) => {
    if (!user) return;
    try {
      await updateDocument(`friendships/${user.uid}/friends`, friendId, { status: 'accepted' });
      await updateDocument(`friendships/${friendId}/friends`, user.uid, { status: 'accepted' });
      addToast({ type: 'success', message: 'Friend accepted!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to accept' });
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    try {
      await removeDocument(`friendships/${user.uid}/friends`, friendId);
      await removeDocument(`friendships/${friendId}/friends`, user.uid);
      setResolvedFriends((prev) => prev.filter((f) => f.friendId !== friendId));
      addToast({ type: 'info', message: 'Friend removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove' });
    }
    setRemoveTarget(null);
  };

  const friendIds = friends.map((f) => f.id);
  const pendingIds = pending.map((p) => p.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white font-heading">Friends</h1>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} loading={searching}>Search</Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400">Search Results</h2>
          {searchResults.map((u) => {
            const isFriend = friendIds.includes(u.uid);
            const isPending = pendingIds.includes(u.uid);
            return (
              <div key={u.uid} className="flex items-center gap-3 glass-card rounded-xl p-3">
                <Link href={`/profile/${u.username}`}>
                  <Avatar src={u.avatarUrl} alt={u.username} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${u.username}`}>
                    <p className="text-sm font-medium text-white hover:text-orange-400">{u.username}</p>
                  </Link>
                  <p className="text-xs text-slate-500">Lv.{u.level} &bull; {u.totalXP.toLocaleString()} XP</p>
                </div>
                {isFriend ? (
                  <span className="text-xs text-emerald-400 font-medium">Friends</span>
                ) : isPending ? (
                  <span className="text-xs text-yellow-400 font-medium">Pending</span>
                ) : (
                  <Button size="sm" onClick={() => sendRequest(u.uid)}>Add</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Requests */}
      {resolvedPending.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-yellow-400">Pending Requests</h2>
          {resolvedPending.map((req) => (
            <div key={req.id} className="flex items-center gap-3 glass-card rounded-xl p-3 border border-yellow-500/10">
              <Avatar src={req.profile?.avatarUrl} alt={req.profile?.username || '?'} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{req.profile?.username || 'Unknown user'}</p>
                <p className="text-xs text-slate-500">Lv.{req.profile?.level || 1} &bull; {(req.profile?.totalXP || 0).toLocaleString()} XP</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => acceptRequest(req.id)}>Accept</Button>
                <Button size="sm" variant="ghost" onClick={() => removeFriend(req.id)}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-slate-400">Friends ({resolvedFriends.length})</h2>
        {loading || loadingProfiles ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : resolvedFriends.length === 0 ? (
          <EmptyState
            icon={<UsersFullIcon size={40} className="text-red-400" />}
            title="No friends yet"
            description="Search for friends by username to start competing together."
          />
        ) : (
          resolvedFriends.map((friend) => (
            <div key={friend.friendId} className="glass-card rounded-xl p-4 space-y-3">
              {/* Top row: avatar + info */}
              <div className="flex items-center gap-3">
                <Link href={`/profile/${friend.profile?.username || friend.friendId}`}>
                  <Avatar src={friend.profile?.avatarUrl} alt={friend.profile?.username || '?'} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${friend.profile?.username || friend.friendId}`}>
                    <p className="text-sm font-semibold text-white hover:text-orange-400 truncate">
                      {friend.profile?.username || 'Unknown'}
                    </p>
                  </Link>
                  <p className="text-xs text-slate-500">
                    Lv.{friend.profile?.level || 1} {friend.profile?.currentTitle || 'Rookie'} &bull; {(friend.profile?.totalXP || 0).toLocaleString()} XP
                  </p>
                  <p className="text-[10px] text-slate-600">Friends since {friend.since}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => setDuelTarget({
                    id: friend.friendId,
                    username: friend.profile?.username || 'Friend',
                    avatar: friend.profile?.avatarUrl || '',
                  })}
                >
                  <SwordsCrossIcon size={14} />
                  Challenge
                </Button>
                <Link href={`/profile/${friend.profile?.username || friend.friendId}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full">
                    View Profile
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoveTarget({
                    id: friend.friendId,
                    name: friend.profile?.username || 'this friend',
                  })}
                  className="text-slate-600 hover:text-red-400"
                >
                  &times;
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Remove Confirmation */}
      <ConfirmDialog
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => removeTarget && removeFriend(removeTarget.id)}
        title="Remove Friend?"
        description={`Are you sure you want to remove ${removeTarget?.name}? You'll need to send a new request to add them back.`}
        confirmText="Remove"
        variant="danger"
      />

      {/* Challenge Modal */}
      {duelTarget && (
        <CreateDuelModal
          isOpen={!!duelTarget}
          onClose={() => setDuelTarget(null)}
          opponentId={duelTarget.id}
          opponentUsername={duelTarget.username}
          opponentAvatar={duelTarget.avatar}
        />
      )}
    </div>
  );
}
