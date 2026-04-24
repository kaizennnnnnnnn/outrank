'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CreateDuelModal } from '@/components/competition/CreateDuelModal';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { MiniOrb } from '@/components/profile/MiniOrb';
import { getCollection, getDocument, setDocument, updateDocument, removeDocument, createDocument, where, Timestamp } from '@/lib/firestore';
import { increment } from 'firebase/firestore';
import { sanitizeUsername } from '@/lib/security';
import { useUIStore } from '@/store/uiStore';
import { UserProfile } from '@/types/user';
import { UsersFullIcon, SwordsCrossIcon } from '@/components/ui/AppIcons';
import { FriendHabitModal } from '@/components/social/FriendHabitModal';
import Link from 'next/link';

// Cosmetic fields aren't declared on UserProfile but live on the same doc.
interface FriendCosmetics {
  equippedFrame?: string;
  equippedNameEffect?: string;
  orbTier?: number;
  orbBaseColor?: string;
  orbPulseColor?: string;
  orbRingColor?: string;
}

// Resolved friend = friendship data + actual user profile (+ cosmetic fields)
interface ResolvedFriend {
  friendId: string;
  profile: (UserProfile & FriendCosmetics) | null;
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
  const [resolvedPending, setResolvedPending] = useState<{ id: string; profile: (UserProfile & FriendCosmetics) | null; direction: string }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  // Habit viewer
  const [habitTarget, setHabitTarget] = useState<{ id: string; username: string; avatar: string } | null>(null);

  // Duel challenge
  const [duelTarget, setDuelTarget] = useState<{ id: string; username: string; avatar: string } | null>(null);
  const [challengedIds, setChallengedIds] = useState<string[]>([]);

  // Resolve friend IDs to actual profiles
  useEffect(() => {
    async function resolveProfiles() {
      if (loading) return;

      // Resolve accepted friends — cast return type to include cosmetic fields
      // which live on the user doc but aren't in UserProfile
      const resolved: ResolvedFriend[] = [];
      for (const f of friends) {
        const profile = await getDocument<UserProfile & FriendCosmetics>('users', f.id);
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
        const profile = await getDocument<UserProfile & FriendCosmetics>('users', p.id);
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
      // Notify the recipient that they received a friend request.
      // friend_accepted is already handled by the onFriendAccepted Cloud
      // Function once both docs flip to accepted.
      try {
        await createDocument(`notifications/${friendId}/items`, {
          type: 'friend_request',
          message: `${user.username} sent you a friend request`,
          isRead: false,
          relatedId: user.uid,
          actorId: user.uid,
          actorAvatar: user.avatarUrl || '',
          createdAt: Timestamp.now(),
        });
      } catch { /* non-fatal — the request still went through */ }
      addToast({ type: 'success', message: 'Friend request sent!' });
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
      // Bump friendCount on both users so profile stats reflect reality
      try { await updateDocument('users', user.uid, { friendCount: increment(1) }); } catch { /* ignore */ }
      try { await updateDocument('users', friendId, { friendCount: increment(1) }); } catch { /* ignore */ }
      addToast({ type: 'success', message: 'Friend accepted!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to accept' });
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    try {
      // Only decrement if previously accepted
      const wasAccepted = friends.some((f) => f.id === friendId);
      await removeDocument(`friendships/${user.uid}/friends`, friendId);
      await removeDocument(`friendships/${friendId}/friends`, user.uid);
      if (wasAccepted) {
        try { await updateDocument('users', user.uid, { friendCount: increment(-1) }); } catch { /* ignore */ }
        try { await updateDocument('users', friendId, { friendCount: increment(-1) }); } catch { /* ignore */ }
      }
      setResolvedFriends((prev) => prev.filter((f) => f.friendId !== friendId));
      addToast({ type: 'info', message: 'Friend removed' });
    } catch {
      addToast({ type: 'error', message: 'Failed to remove' });
    }
    setRemoveTarget(null);
  };

  // All known connection IDs — both accepted friends and all pending (sent + received)
  const friendIds = friends.map((f) => f.id);
  const allConnectionIds = [...friends.map((f) => f.id), ...pending.map((p) => p.id)];

  const friendCount = resolvedFriends.length;
  const pendingCount = resolvedPending.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Premium header — matches the Orb / Messages page treatment */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 100% 0%, rgba(249,115,22,0.24), transparent 55%),' +
            'radial-gradient(ellipse 60% 60% at 0% 100%, rgba(236,72,153,0.14), transparent 60%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(249,115,22,0.28)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-300">Your Circle</p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-0.5">Friends</h1>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
              Build an inner circle. Challenge, message, and race them across the leaderboards.
            </p>
          </div>
          {/* Stat chips: friends / pending */}
          <div className="flex gap-2 shrink-0">
            <StatChip label="Friends" value={friendCount} tint="#f97316" />
            {pendingCount > 0 && (
              <StatChip label="Pending" value={pendingCount} tint="#fbbf24" />
            )}
          </div>
        </div>
      </div>

      {/* Search — styled to feel like a primary CTA */}
      <div
        className="rounded-2xl p-3 border"
        style={{
          background: 'linear-gradient(145deg, #10101a, #0b0b14)',
          borderColor: 'rgba(249,115,22,0.16)',
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2 px-1">
          Find someone
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} loading={searching}>Search</Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400">Search Results</h2>
          {searchResults.map((u) => {
            const isFriend = friendIds.includes(u.uid);
            const isPending = allConnectionIds.includes(u.uid) && !isFriend;
            const uc = u as unknown as UserProfile & FriendCosmetics;
            return (
              <div key={u.uid} className="flex items-center gap-3 glass-card rounded-xl p-3">
                <Link href={`/profile/${u.username}`}>
                  <FramedAvatar src={u.avatarUrl} alt={u.username} size="md" frameId={uc.equippedFrame} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${u.username}`} className="flex items-center gap-1.5 min-w-0">
                    <span className="min-w-0 truncate">
                      <NamePlate name={u.username} effectId={uc.equippedNameEffect} size="sm" className="hover:text-orange-400" />
                    </span>
                    {uc.orbTier !== undefined && (
                      <MiniOrb tier={uc.orbTier} baseColorId={uc.orbBaseColor} pulseColorId={uc.orbPulseColor} ringColorId={uc.orbRingColor} size={16} />
                    )}
                  </Link>
                  <p className="text-xs text-slate-500">Lv.{u.level} &bull; {u.totalXP.toLocaleString()} XP</p>
                </div>
                {isFriend ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 font-medium">Friends</span>
                    <Button size="sm" variant="secondary" onClick={() => setDuelTarget({
                      id: u.uid,
                      username: u.username,
                      avatar: u.avatarUrl || '',
                    })}>
                      <SwordsCrossIcon size={12} /> Challenge
                    </Button>
                  </div>
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
              <FramedAvatar src={req.profile?.avatarUrl} alt={req.profile?.username || '?'} size="md" frameId={req.profile?.equippedFrame} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="min-w-0 truncate">
                    <NamePlate name={req.profile?.username || 'Unknown user'} effectId={req.profile?.equippedNameEffect} size="sm" />
                  </span>
                  {req.profile?.orbTier !== undefined && (
                    <MiniOrb tier={req.profile.orbTier} baseColorId={req.profile.orbBaseColor} pulseColorId={req.profile.orbPulseColor} ringColorId={req.profile.orbRingColor} size={16} />
                  )}
                </div>
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
                  <FramedAvatar
                    src={friend.profile?.avatarUrl}
                    alt={friend.profile?.username || '?'}
                    size="md"
                    frameId={friend.profile?.equippedFrame}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${friend.profile?.username || friend.friendId}`} className="flex items-center gap-1.5 min-w-0">
                    <span className="min-w-0 truncate">
                      <NamePlate
                        name={friend.profile?.username || 'Unknown'}
                        effectId={friend.profile?.equippedNameEffect}
                        size="sm"
                        className="hover:text-orange-400"
                      />
                    </span>
                    {friend.profile?.orbTier !== undefined && (
                      <MiniOrb
                        tier={friend.profile.orbTier}
                        baseColorId={friend.profile.orbBaseColor}
                        pulseColorId={friend.profile.orbPulseColor}
                        ringColorId={friend.profile.orbRingColor}
                        size={18}
                      />
                    )}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Lv.{friend.profile?.level || 1} {friend.profile?.currentTitle || 'Rookie'} &bull; {(friend.profile?.totalXP || 0).toLocaleString()} XP
                  </p>
                  <p className="text-[10px] text-slate-600">Friends since {friend.since}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {challengedIds.includes(friend.friendId) ? (
                  <Button size="sm" variant="secondary" className="flex-1" disabled>
                    Challenged!
                  </Button>
                ) : (
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
                )}
                <Link href={`/messages/${friend.friendId}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    Message
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setHabitTarget({
                    id: friend.friendId,
                    username: friend.profile?.username || 'Friend',
                    avatar: friend.profile?.avatarUrl || '',
                  })}
                >
                  Status
                </Button>
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
          onClose={() => {
            setChallengedIds((prev) => [...prev, duelTarget.id]);
            setDuelTarget(null);
          }}
          opponentId={duelTarget.id}
          opponentUsername={duelTarget.username}
          opponentAvatar={duelTarget.avatar}
        />
      )}

      {/* Friend Habit Status Modal */}
      {habitTarget && (
        <FriendHabitModal
          isOpen={!!habitTarget}
          onClose={() => setHabitTarget(null)}
          friendId={habitTarget.id}
          friendUsername={habitTarget.username}
          friendAvatar={habitTarget.avatar}
        />
      )}
    </div>
  );
}

function StatChip({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-3 py-1.5 border min-w-[56px]"
      style={{
        background: `linear-gradient(145deg, ${tint}1a, #0b0b14 80%)`,
        borderColor: `${tint}44`,
      }}
    >
      <span
        className="font-mono text-lg font-bold leading-none"
        style={{ color: tint }}
      >
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">
        {label}
      </span>
    </div>
  );
}
