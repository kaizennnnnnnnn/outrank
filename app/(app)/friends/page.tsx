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
import { PactCreateModal } from '@/components/pacts/PactCreateModal';
import { useUserPacts } from '@/hooks/usePacts';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { getCollection, getDocument, setDocument, updateDocument, removeDocument, createDocument, where, Timestamp } from '@/lib/firestore';
import { increment } from 'firebase/firestore';
import { sanitizeUsername } from '@/lib/security';
import { useUIStore } from '@/store/uiStore';
import { UserProfile } from '@/types/user';
import { UsersFullIcon, SwordsCrossIcon } from '@/components/ui/AppIcons';
import { FriendHabitModal } from '@/components/social/FriendHabitModal';
import { Masthead } from '@/components/editorial/Masthead';
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

  // Pact invite — opens the standard create modal pre-picked to this
  // friend, skipping the modal's own friend-picker step.
  const [pactTarget, setPactTarget] = useState<UserProfile | null>(null);

  // Active pacts — used to show a small "Active pact" pill on the
  // friend card so the user knows when they already have a commitment
  // running. usePacts already filters to participant-only.
  const { active: activePacts } = useUserPacts();

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

  // friendId → active pact (most recent one if multiple — rare).
  // Lets the friend card show a tiny pact-active pill + skip the
  // "Pact" CTA when one's already running.
  const activePactByFriend = new Map<string, typeof activePacts[number]>();
  if (user) {
    for (const p of activePacts) {
      const partnerId = p.participants.find((id) => id !== user.uid);
      if (partnerId && !activePactByFriend.has(partnerId)) {
        activePactByFriend.set(partnerId, p);
      }
    }
  }

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="Your Circle" />

        <div style={{ padding: '0 22px' }}>
          {/* Editorial header */}
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
            Your Circle
          </div>
          <h1
            className="font-display"
            style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, margin: '2px 0 4px' }}
          >
            <em style={{ fontStyle: 'italic' }}>Friends</em>
          </h1>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 360, lineHeight: 1.5 }}
          >
            Build an inner circle. Challenge, message, and race them across the leaderboards.
          </p>

          {/* Inline stat strip */}
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: pendingCount > 0 ? 'repeat(2, 1fr)' : '1fr',
              borderTop: '1px solid var(--b-ink)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <div
                className="font-display tabular"
                style={{ fontSize: 26, fontWeight: 500, lineHeight: 1, color: 'var(--b-accent)' }}
              >
                {friendCount}
              </div>
              <div
                className="font-body"
                style={{
                  fontSize: 9,
                  color: 'var(--b-ink-60)',
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                Friends
              </div>
            </div>
            {pendingCount > 0 && (
              <div
                style={{
                  padding: '10px 0',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--b-rule)',
                }}
              >
                <div
                  className="font-display tabular"
                  style={{ fontSize: 26, fontWeight: 500, lineHeight: 1, color: 'var(--b-ink)' }}
                >
                  {pendingCount}
                </div>
                <div
                  className="font-body"
                  style={{
                    fontSize: 9,
                    color: 'var(--b-ink-60)',
                    marginTop: 4,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                  }}
                >
                  Pending
                </div>
              </div>
            )}
          </div>

          {/* Friends League + Pacts + Tournaments shortcut buttons */}
          {friendCount > 0 && (
            <div style={{ marginTop: 18 }}>
              <Link href="/friends-league" className="b-shortcut-btn">
                <div>
                  <div className="spread" style={{ fontSize: 9, opacity: 0.7 }}>
                    Weekly
                  </div>
                  <div
                    className="font-display"
                    style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}
                  >
                    Friends League
                  </div>
                  <div className="font-body" style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                    Top 3 split fragments
                  </div>
                </div>
                <span className="font-body b-shortcut-chip">ENTER →</span>
              </Link>
              <Link href="/pacts" className="b-shortcut-btn">
                <div>
                  <div
                    className="spread"
                    style={{ fontSize: 9, color: 'var(--b-accent)' }}
                  >
                    Pacts
                  </div>
                  <div
                    className="font-display"
                    style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}
                  >
                    {activePacts.length} active
                  </div>
                  <div className="font-body" style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                    Both win or both lose
                  </div>
                </div>
                <span className="font-body b-shortcut-chip">ENTER →</span>
              </Link>
              <Link href="/tournaments" className="b-shortcut-btn">
                <div>
                  <div className="spread" style={{ fontSize: 9, opacity: 0.7 }}>
                    Bracket
                  </div>
                  <div
                    className="font-display"
                    style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 500, marginTop: 2 }}
                  >
                    Tournaments
                  </div>
                  <div className="font-body" style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                    4-player single elimination
                  </div>
                </div>
                <span className="font-body b-shortcut-chip">ENTER →</span>
              </Link>
            </div>
          )}

          {/* Search */}
          <div style={{ marginTop: 22 }}>
            <div
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
            >
              Find someone
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} loading={searching}>Search</Button>
            </div>

            {/* Invite link — share the URL, the receiving end auto-friends. */}
            {user && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--b-rule)' }}>
                <div
                  className="spread"
                  style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}
                >
                  Or share your invite link
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: '1px solid var(--b-rule)',
                    padding: '8px 10px',
                  }}
                >
                  <span
                    className="font-mono"
                    style={{ fontSize: 11, color: 'var(--b-ink-60)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    outrank-ten.vercel.app/invite/{user.username}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://outrank-ten.vercel.app/invite/${user.username}`,
                      );
                      addToast({ type: 'success', message: 'Invite link copied' });
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <>
              <SectionHeader label="Search Results" count={searchResults.length} />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {searchResults.map((u) => {
                  const isFriend = friendIds.includes(u.uid);
                  const isPending = allConnectionIds.includes(u.uid) && !isFriend;
                  const uc = u as unknown as UserProfile & FriendCosmetics;
                  return (
                    <li
                      key={u.uid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                      }}
                    >
                      <Link href={`/profile/${u.username}`}>
                        <FramedAvatar src={u.avatarUrl} alt={u.username} size="md" frameId={uc.equippedFrame} />
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/profile/${u.username}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, textDecoration: 'none' }}
                        >
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <NamePlate name={u.username} effectId={uc.equippedNameEffect} size="sm" />
                          </span>
                        </Link>
                        <div
                          className="font-body tabular"
                          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
                        >
                          Lv.{u.level} · {u.totalXP.toLocaleString()} XP
                        </div>
                      </div>
                      {isFriend ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className="spread"
                            style={{ fontSize: 9, color: '#34d399' }}
                          >
                            Friends
                          </span>
                          <Button size="sm" variant="secondary" onClick={() => setDuelTarget({
                            id: u.uid,
                            username: u.username,
                            avatar: u.avatarUrl || '',
                          })}>
                            <SwordsCrossIcon size={12} /> Duel
                          </Button>
                        </div>
                      ) : isPending ? (
                        <span
                          className="spread"
                          style={{ fontSize: 9, color: '#fbbf24' }}
                        >
                          Pending
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => sendRequest(u.uid)}>Add</Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* Pending Requests */}
          {resolvedPending.length > 0 && (
            <>
              <SectionHeader label="Pending Requests" count={resolvedPending.length} accent="#fbbf24" />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {resolvedPending.map((req) => (
                  <li
                    key={req.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid var(--b-rule)',
                    }}
                  >
                    <FramedAvatar src={req.profile?.avatarUrl} alt={req.profile?.username || '?'} size="md" frameId={req.profile?.equippedFrame} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <NamePlate name={req.profile?.username || 'Unknown user'} effectId={req.profile?.equippedNameEffect} size="sm" />
                        </span>
                      </div>
                      <div
                        className="font-body tabular"
                        style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
                      >
                        Lv.{req.profile?.level || 1} · {(req.profile?.totalXP || 0).toLocaleString()} XP
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="sm" onClick={() => acceptRequest(req.id)}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeFriend(req.id)}>Decline</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Friends List */}
          <SectionHeader label="The Roster" count={resolvedFriends.length} />
          {loading || loadingProfiles ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : resolvedFriends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <div style={{ color: 'var(--b-ink-40)', display: 'flex', justifyContent: 'center' }}>
                <UsersFullIcon size={32} />
              </div>
              <p
                className="font-display"
                style={{ fontSize: 20, fontStyle: 'italic', fontWeight: 500, marginTop: 10 }}
              >
                No friends yet.
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--b-ink-60)', maxWidth: 280, marginInline: 'auto', marginTop: 4 }}
              >
                Search for friends by username above to start competing together.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {resolvedFriends.map((friend) => {
                const activePact = activePactByFriend.get(friend.friendId);
                // Viewer's head-to-head record vs this friend (their POV).
                // Lives on the viewer's own user doc, denormalized at duel-
                // claim time. Absent until the first completed duel.
                const record = user?.duelRecord?.[friend.friendId];
                const totalDuels = record
                  ? (record.wins || 0) + (record.losses || 0) + (record.ties || 0)
                  : 0;
                return (
                  <li
                    key={friend.friendId}
                    style={{
                      padding: '14px 0',
                      borderBottom: '1px solid var(--b-rule)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link href={`/profile/${friend.profile?.username || friend.friendId}`}>
                        <FramedAvatar
                          src={friend.profile?.avatarUrl}
                          alt={friend.profile?.username || '?'}
                          size="md"
                          frameId={friend.profile?.equippedFrame}
                        />
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          href={`/profile/${friend.profile?.username || friend.friendId}`}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap', textDecoration: 'none' }}
                        >
                          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <NamePlate
                              name={friend.profile?.username || 'Unknown'}
                              effectId={friend.profile?.equippedNameEffect}
                              size="sm"
                            />
                          </span>
                          {activePact && (
                            <span
                              className="spread"
                              style={{
                                fontSize: 9,
                                color: activePact.habitColor,
                                padding: '1px 6px',
                                border: `1px solid ${activePact.habitColor}80`,
                              }}
                              title={`${activePact.durationDays}-day ${activePact.habitName} pact in progress`}
                            >
                              Pact · {activePact.habitName}
                            </span>
                          )}
                        </Link>
                        <div
                          className="font-body tabular"
                          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 2 }}
                        >
                          Lv.{friend.profile?.level || 1} {friend.profile?.currentTitle || 'Rookie'} · {(friend.profile?.totalXP || 0).toLocaleString()} XP
                        </div>
                        {totalDuels > 0 && record && (
                          <div
                            className="font-mono tabular"
                            style={{
                              fontSize: 10,
                              marginTop: 2,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              color: 'var(--b-ink-60)',
                            }}
                          >
                            <span>Duels · </span>
                            <span style={{ color: '#34d399' }}>{record.wins || 0}W</span>
                            <span style={{ color: 'var(--b-ink-40)' }}> / </span>
                            <span style={{ color: '#f87171' }}>{record.losses || 0}L</span>
                            {(record.ties || 0) > 0 && (
                              <>
                                <span style={{ color: 'var(--b-ink-40)' }}> / </span>
                                <span style={{ color: '#fbbf24' }}>{record.ties}T</span>
                              </>
                            )}
                          </div>
                        )}
                        <div
                          className="font-mono"
                          style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 2, letterSpacing: '0.04em' }}
                        >
                          Since {friend.since}
                        </div>
                      </div>
                    </div>

                    {/* Action row */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        marginTop: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      {challengedIds.includes(friend.friendId) ? (
                        <Button size="sm" variant="secondary" className="flex-1" disabled>
                          Challenged
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
                          Duel
                        </Button>
                      )}
                      <Link href={`/messages/${friend.friendId}`} className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full">
                          Message
                        </Button>
                      </Link>
                      {!activePact ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => friend.profile && setPactTarget(friend.profile)}
                        >
                          Pact
                        </Button>
                      ) : (
                        <Link href="/pacts" className="flex-1">
                          <Button size="sm" variant="secondary" className="w-full">
                            View pact
                          </Button>
                        </Link>
                      )}
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
                        style={{ color: 'var(--b-ink-40)' }}
                      >
                        &times;
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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

      {/* Pact creation — friend pre-picked, modal jumps straight to
          pillar selection. */}
      <PactCreateModal
        isOpen={!!pactTarget}
        onClose={() => setPactTarget(null)}
        initialFriend={pactTarget || undefined}
      />
    </div>
  );
}

function SectionHeader({ label, count, accent }: { label: string; count: number; accent?: string }) {
  return (
    <div
      style={{
        marginTop: 28,
        paddingTop: 12,
        borderTop: '1px solid var(--b-ink)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}
    >
      <div
        className="font-display"
        style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500, color: accent || 'var(--b-ink)' }}
      >
        {label}
      </div>
      <div
        className="font-mono tabular"
        style={{ fontSize: 9, color: 'var(--b-ink-60)', letterSpacing: '0.14em' }}
      >
        § {String(count).padStart(2, '0')}
      </div>
    </div>
  );
}
