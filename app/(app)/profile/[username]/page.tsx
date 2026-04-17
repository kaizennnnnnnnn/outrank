'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, getCollection, setDocument, where, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { XPProgressBar } from '@/components/profile/XPProgressBar';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { StatCard } from '@/components/profile/StatCard';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserProfile } from '@/types/user';
import { BoltFullIcon, UsersFullIcon, FireIcon, ChartBarIcon, SearchIcon, SwordsCrossIcon } from '@/components/ui/AppIcons';
import { CreateDuelModal } from '@/components/competition/CreateDuelModal';

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user: currentUser } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>('none');
  const [actualFriendCount, setActualFriendCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [duelOpen, setDuelOpen] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const decoded = decodeURIComponent(username).toLowerCase();
        const usernameDoc = await getDocument<{ uid: string }>('usernames', decoded);
        let userProfile: UserProfile | null = null;
        if (usernameDoc) {
          userProfile = await getDocument<UserProfile>('users', usernameDoc.uid);
        } else {
          const rawDoc = await getDocument<{ uid: string }>('usernames', username);
          if (rawDoc) userProfile = await getDocument<UserProfile>('users', rawDoc.uid);
        }
        setProfile(userProfile);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  // Check friendship status between current user and profile user
  useEffect(() => {
    if (!currentUser || !profile || currentUser.uid === profile.uid) return;
    async function checkFriendship() {
      try {
        if (!currentUser || !profile) return;
        const friendshipDoc = await getDocument<{ status: string; direction?: string }>(
          `friendships/${currentUser.uid}/friends`,
          profile.uid
        );
        if (!friendshipDoc) {
          setFriendStatus('none');
        } else if (friendshipDoc.status === 'accepted') {
          setFriendStatus('accepted');
        } else if (friendshipDoc.direction === 'sent') {
          setFriendStatus('pending_sent');
        } else {
          setFriendStatus('pending_received');
        }
      } catch {
        setFriendStatus('none');
      }
    }
    checkFriendship();
  }, [currentUser, profile]);

  // Count actual accepted friends (friendCount on the doc is not reliably updated)
  useEffect(() => {
    if (!profile) return;
    async function count() {
      try {
        if (!profile) return;
        const accepted = await getCollection(
          `friendships/${profile.uid}/friends`,
          [where('status', '==', 'accepted')]
        );
        setActualFriendCount(accepted.length);
      } catch {
        setActualFriendCount(null);
      }
    }
    count();
  }, [profile]);

  const sendFriendRequest = async () => {
    if (!currentUser || !profile) return;
    setSending(true);
    try {
      await setDocument(`friendships/${currentUser.uid}/friends`, profile.uid, {
        status: 'pending',
        createdAt: Timestamp.now(),
        direction: 'sent',
      });
      await setDocument(`friendships/${profile.uid}/friends`, currentUser.uid, {
        status: 'pending',
        createdAt: Timestamp.now(),
        direction: 'received',
      });
      setFriendStatus('pending_sent');
      addToast({ type: 'success', message: 'Friend request sent!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send request' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <SearchIcon size={48} className="text-slate-600 mx-auto" />
        <h1 className="text-xl font-bold text-white mt-4">User not found</h1>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === profile.uid;
  const orbTier = (profile as unknown as Record<string, number>).orbTier || 1;
  const orbBaseColor = (profile as unknown as Record<string, string>).orbBaseColor;
  const orbPulseColor = (profile as unknown as Record<string, string>).orbPulseColor;
  const friendCountDisplay = actualFriendCount ?? profile.friendCount ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Soul Orb */}
      <div className="flex justify-center">
        <SoulOrb
          intensity={80}
          tier={orbTier}
          size={220}
          baseColorId={orbBaseColor}
          pulseColorId={orbPulseColor}
        />
      </div>

      {/* Profile Header */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-2">
          <Avatar src={profile.avatarUrl} alt={profile.username} size="xl" />
        </div>
        <h1 className="text-xl font-bold text-white">{profile.username}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-xs text-slate-500">Lv.{profile.level}</span>
          <TitleDisplay totalXP={profile.totalXP} />
        </div>
        {profile.bio && <p className="text-sm text-slate-400 mt-2">{profile.bio}</p>}

        <div className="mt-4 max-w-xs mx-auto">
          <XPProgressBar totalXP={profile.totalXP} />
        </div>

        {!isOwnProfile && (
          <div className="flex justify-center gap-3 mt-4">
            {friendStatus === 'accepted' && (
              <>
                <Button size="sm" variant="secondary" disabled>
                  <UsersFullIcon size={12} /> Friends
                </Button>
                <Button size="sm" onClick={() => setDuelOpen(true)}>
                  <SwordsCrossIcon size={12} /> Challenge
                </Button>
              </>
            )}
            {friendStatus === 'pending_sent' && (
              <Button size="sm" variant="secondary" disabled>Request Sent</Button>
            )}
            {friendStatus === 'pending_received' && (
              <Button size="sm" variant="secondary" disabled>Request Received</Button>
            )}
            {friendStatus === 'none' && (
              <Button size="sm" onClick={sendFriendRequest} loading={sending}>
                Add Friend
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<BoltFullIcon size={24} className="text-orange-400" />} value={profile.totalXP.toLocaleString()} label="Total XP" />
        <StatCard icon={<UsersFullIcon size={24} className="text-red-400" />} value={friendCountDisplay.toString()} label="Friends" />
        <StatCard icon={<FireIcon size={24} className="text-orange-400" />} value={`${profile.weeklyXP || 0}`} label="Weekly XP" />
        <StatCard icon={<ChartBarIcon size={24} className="text-red-400" />} value={`${profile.monthlyXP || 0}`} label="Monthly XP" />
      </div>

      {/* Badges */}
      <div className="glass-card rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Badges</h2>
        <BadgeGrid userId={profile.uid} />
      </div>

      {duelOpen && (
        <CreateDuelModal
          isOpen={duelOpen}
          onClose={() => setDuelOpen(false)}
          opponentId={profile.uid}
          opponentUsername={profile.username}
          opponentAvatar={profile.avatarUrl || ''}
        />
      )}
    </div>
  );
}
