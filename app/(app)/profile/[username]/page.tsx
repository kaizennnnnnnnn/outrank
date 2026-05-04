'use client';

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, getCollection, setDocument, where, Timestamp } from '@/lib/firestore';
import { useUIStore } from '@/store/uiStore';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { ProfileHighlights } from '@/components/profile/ProfileHighlights';
import { Button } from '@/components/ui/Button';
import { XPProgressBar } from '@/components/profile/XPProgressBar';
import { BadgeGrid } from '@/components/profile/BadgeGrid';
import { ProfileRecapCalendar } from '@/components/profile/ProfileRecapCalendar';
import { TitleDisplay } from '@/components/profile/TitleDisplay';
import { SoulOrb } from '@/components/profile/SoulOrb';
import { Skeleton } from '@/components/ui/Skeleton';
import { UserProfile } from '@/types/user';
import { SwordsCrossIcon } from '@/components/ui/AppIcons';
import { CreateDuelModal } from '@/components/competition/CreateDuelModal';
import { Masthead } from '@/components/editorial/Masthead';

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
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto pb-32" style={{ padding: '0 22px' }}>
          <Skeleton className="h-64 mt-6" />
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
        <div className="max-w-2xl mx-auto pb-32" style={{ padding: '60px 22px', textAlign: 'center' }}>
          <p
            className="font-display"
            style={{ fontSize: 28, fontStyle: 'italic', fontWeight: 500, marginBottom: 6 }}
          >
            User not found.
          </p>
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)' }}
          >
            That username doesn&rsquo;t belong to anyone here.
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === profile.uid;
  const orbTier = (profile as unknown as Record<string, number>).orbTier || 1;
  const orbBaseColor = (profile as unknown as Record<string, string>).orbBaseColor;
  const orbPulseColor = (profile as unknown as Record<string, string>).orbPulseColor;
  const orbRingColor = (profile as unknown as Record<string, string>).orbRingColor;
  const friendCountDisplay = actualFriendCount ?? profile.friendCount ?? 0;

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section={`@${profile.username}`} />

        <div style={{ padding: '0 22px' }}>
          {/* Orb portrait */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 14px' }}>
            <SoulOrb
              intensity={80}
              tier={orbTier}
              size={200}
              baseColorId={orbBaseColor}
              pulseColorId={orbPulseColor}
              ringColorId={orbRingColor}
              interactive={false}
            />
          </div>

          {/* Identity block */}
          <div style={{ textAlign: 'center', paddingBottom: 14, borderBottom: '1px solid var(--b-ink)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <FramedAvatar
                src={profile.avatarUrl}
                alt={profile.username}
                size="xl"
                frameId={(profile as unknown as Record<string, string>).equippedFrame}
              />
            </div>
            <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
              The Profile
            </div>
            <h1
              className="font-display"
              style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, margin: '4px 0' }}
            >
              <em style={{ fontStyle: 'italic' }}>
                <NamePlate
                  name={profile.username}
                  effectId={(profile as unknown as Record<string, string>).equippedNameEffect}
                  size="xl"
                />
              </em>
            </h1>
            <div
              className="font-body tabular"
              style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4 }}
            >
              Lv.{profile.level} · <TitleDisplay totalXP={profile.totalXP} size="sm" />
            </div>
            {profile.bio && (
              <p
                className="font-body"
                style={{
                  fontSize: 12,
                  color: 'var(--b-ink-60)',
                  marginTop: 8,
                  fontStyle: 'italic',
                  maxWidth: 360,
                  marginInline: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {profile.bio}
              </p>
            )}

            <div style={{ marginTop: 12, maxWidth: 320, marginInline: 'auto' }}>
              <XPProgressBar totalXP={profile.totalXP} />
            </div>

            <ProfileHighlights user={profile} />

            {!isOwnProfile && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                {friendStatus === 'accepted' && (
                  <>
                    <Button size="sm" variant="secondary" disabled>
                      Friends
                    </Button>
                    <Button size="sm" onClick={() => setDuelOpen(true)}>
                      <SwordsCrossIcon size={12} /> Challenge
                    </Button>
                  </>
                )}
                {friendStatus === 'pending_sent' && (
                  <Button size="sm" variant="secondary" disabled>Request sent</Button>
                )}
                {friendStatus === 'pending_received' && (
                  <Button size="sm" variant="secondary" disabled>Request received</Button>
                )}
                {friendStatus === 'none' && (
                  <Button size="sm" onClick={sendFriendRequest} loading={sending}>
                    Add friend
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stat strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              borderBottom: '1px solid var(--b-rule)',
            }}
          >
            <StatCell label="Total XP" value={profile.totalXP.toLocaleString()} accent="#f97316" />
            <StatCell label="Friends" value={String(friendCountDisplay)} accent="#ef4444" border />
            <StatCell label="Weekly" value={String(profile.weeklyXP || 0)} accent="#fbbf24" border />
            <StatCell label="Monthly" value={String(profile.monthlyXP || 0)} accent="#60a5fa" border />
          </div>

          {/* Records section */}
          <SectionHeader label="Daily Records" eyebrow="Recap" />
          <ProfileRecapCalendar uid={profile.uid} isOwner={false} />

          {/* Badges */}
          <SectionHeader label="Badges" eyebrow="Earned" />
          <BadgeGrid userId={profile.uid} compact />
        </div>
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

function StatCell({ label, value, accent, border }: { label: string; value: string; accent: string; border?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 0',
        textAlign: 'center',
        borderLeft: border ? '1px solid var(--b-rule)' : 'none',
      }}
    >
      <div
        className="font-display tabular"
        style={{ fontSize: 18, fontWeight: 500, lineHeight: 1, color: accent }}
      >
        {value}
      </div>
      <div
        className="font-body"
        style={{
          fontSize: 8,
          color: 'var(--b-ink-60)',
          marginTop: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionHeader({ label, eyebrow }: { label: string; eyebrow?: string }) {
  return (
    <div
      style={{
        marginTop: 24,
        paddingTop: 12,
        borderTop: '1px solid var(--b-ink)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <div className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 500 }}>
        {label}
      </div>
      {eyebrow && (
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)' }}
        >
          {eyebrow}
        </div>
      )}
    </div>
  );
}
