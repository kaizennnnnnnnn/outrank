'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getCollection, setDocument, updateDocument, removeDocument, where, Timestamp } from '@/lib/firestore';
import { sanitizeUsername } from '@/lib/security';
import { useUIStore } from '@/store/uiStore';
import { UserProfile } from '@/types/user';
import { UsersFullIcon } from '@/components/ui/AppIcons';

export default function FriendsPage() {
  const { user } = useAuth();
  const { friends, pending, loading } = useFriends();
  const addToast = useUIStore((s) => s.addToast);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

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
      addToast({ type: 'info', message: 'Friend removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove' });
    }
  };

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
          {searchResults.map((u) => (
            <div key={u.uid} className="flex items-center gap-3 glass-card rounded-xl p-3">
              <Avatar src={u.avatarUrl} alt={u.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{u.username}</p>
                <p className="text-xs text-slate-500">Lv.{u.level} &bull; {u.totalXP} XP</p>
              </div>
              <Button size="sm" onClick={() => sendRequest(u.uid)}>Add</Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Requests */}
      {pending.filter((p) => p.direction === 'received').length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-yellow-400">Pending Requests</h2>
          {pending.filter((p) => p.direction === 'received').map((req) => (
            <div key={req.id} className="flex items-center gap-3 glass-card rounded-xl p-3 border-yellow-500/20">
              <Avatar alt={req.id} size="md" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{req.id}</p>
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
        <h2 className="text-sm font-bold text-slate-400">Friends ({friends.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : friends.length === 0 ? (
          <EmptyState
            icon={<UsersFullIcon size={40} className="text-red-400" />}
            title="No friends yet"
            description="Search for friends by username to start competing together."
          />
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="flex items-center gap-3 glass-card rounded-xl p-3">
              <Avatar alt={friend.id} size="md" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{friend.id}</p>
                <p className="text-xs text-slate-500">Friends since {friend.createdAt?.toDate?.().toLocaleDateString()}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeFriend(friend.id)}>Remove</Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
