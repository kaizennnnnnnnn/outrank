'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { getDocument, setDocument, createDocument, Timestamp } from '@/lib/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { UserProfile, UsernameDoc, FriendshipDoc } from '@/types/user';

type InviteState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'self' }
  | { kind: 'pre-auth'; profile: UserProfile }
  | { kind: 'already-friends'; profile: UserProfile }
  | { kind: 'pending'; profile: UserProfile }
  | { kind: 'sending'; profile: UserProfile }
  | { kind: 'sent'; profile: UserProfile }
  | { kind: 'error'; profile: UserProfile; message: string };

const PENDING_INVITE_STORAGE_KEY = 'pendingFriendInvite';

interface PageProps {
  params: Promise<{ username: string }>;
}

/**
 * Public friend-invite landing page. Two paths:
 *
 *   • Logged in — looks up the invited user, checks the friendship
 *     graph, and either auto-sends a friend request, says "you're
 *     already friends," or surfaces an existing pending invite.
 *
 *   • Logged out — stashes the invited username in localStorage and
 *     bounces to /auth/login. The login page reads the stash on
 *     success and redirects back here so the request gets sent
 *     after sign-in.
 *
 * Lives at /invite/[username] — top-level so the AuthGuard doesn't
 * block the logged-out path.
 */
export default function InvitePage({ params }: PageProps) {
  const { username } = use(params);
  const router = useRouter();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const addToast = useUIStore((s) => s.addToast);
  const [state, setState] = useState<InviteState>({ kind: 'loading' });

  useEffect(() => {
    if (authLoading) return;
    if (state.kind !== 'loading') return;
    let cancelled = false;

    async function resolve() {
      const lower = username.toLowerCase();
      const usernameDoc = await getDocument<UsernameDoc>('usernames', lower);
      if (cancelled) return;

      if (!usernameDoc) {
        setState({ kind: 'not-found' });
        return;
      }

      const profile = await getDocument<UserProfile>('users', usernameDoc.uid);
      if (cancelled) return;

      if (!profile) {
        setState({ kind: 'not-found' });
        return;
      }

      // Logged out — defer to post-auth processing.
      if (!firebaseUser || !user) {
        try {
          window.localStorage.setItem(PENDING_INVITE_STORAGE_KEY, lower);
        } catch { /* storage disabled — page still renders the CTA */ }
        setState({ kind: 'pre-auth', profile });
        return;
      }

      // Trying to friend yourself — guard.
      if (user.uid === profile.uid) {
        setState({ kind: 'self' });
        return;
      }

      // Already friends or pending — short-circuit instead of duplicating
      // the friendship doc.
      const existing = await getDocument<FriendshipDoc>(
        `friendships/${user.uid}/friends`,
        profile.uid,
      );
      if (cancelled) return;

      if (existing?.status === 'accepted') {
        setState({ kind: 'already-friends', profile });
        return;
      }
      if (existing?.status === 'pending') {
        setState({ kind: 'pending', profile });
        return;
      }

      // Auto-send the request.
      setState({ kind: 'sending', profile });
      try {
        await setDocument(`friendships/${user.uid}/friends`, profile.uid, {
          status: 'pending',
          createdAt: Timestamp.now(),
          direction: 'sent',
        });
        await setDocument(`friendships/${profile.uid}/friends`, user.uid, {
          status: 'pending',
          createdAt: Timestamp.now(),
          direction: 'received',
        });
        await createDocument(`notifications/${profile.uid}/items`, {
          type: 'friend_request',
          message: `${user.username} sent you a friend request`,
          isRead: false,
          relatedId: '',
          actorId: user.uid,
          actorAvatar: user.avatarUrl || '',
        });
        // Storage cleanup — invite has been processed.
        try { window.localStorage.removeItem(PENDING_INVITE_STORAGE_KEY); } catch { /* ignore */ }
        if (cancelled) return;
        setState({ kind: 'sent', profile });
        addToast({ type: 'success', message: `Friend request sent to ${profile.username}` });
      } catch (err) {
        console.error('Invite send failed:', err);
        if (cancelled) return;
        setState({
          kind: 'error',
          profile,
          message: err instanceof Error ? err.message : 'Could not send invite',
        });
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [authLoading, firebaseUser, user, username, state.kind, addToast]);

  return (
    <div
      className="dir-b min-h-screen flex flex-col"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      <div
        className="spread"
        style={{
          fontSize: 11,
          color: 'var(--b-ink)',
          letterSpacing: '0.32em',
          padding: '24px 22px 12px',
          borderBottom: '1px solid var(--b-rule)',
          textAlign: 'center',
        }}
      >
        OUTRANK
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 460,
          margin: '0 auto',
          padding: '40px 22px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {state.kind === 'loading' && <LoadingState username={username} />}
        {state.kind === 'not-found' && <NotFoundState username={username} router={router} />}
        {state.kind === 'self' && <SelfState router={router} />}
        {state.kind === 'pre-auth' && (
          <PreAuthState profile={state.profile} router={router} username={username} />
        )}
        {state.kind === 'already-friends' && (
          <AlreadyFriendsState profile={state.profile} router={router} />
        )}
        {state.kind === 'pending' && <PendingState profile={state.profile} router={router} />}
        {state.kind === 'sending' && <SendingState profile={state.profile} />}
        {state.kind === 'sent' && <SentState profile={state.profile} router={router} />}
        {state.kind === 'error' && (
          <ErrorState profile={state.profile} message={state.message} router={router} />
        )}
      </div>
    </div>
  );
}

/* — — — Editorial primitives — — — */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="spread"
      style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center', marginBottom: 8 }}
    >
      {children}
    </div>
  );
}

function Display({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="font-display"
      style={{
        fontSize: 38,
        fontWeight: 500,
        lineHeight: 1.05,
        margin: '0 0 14px',
        textAlign: 'center',
        fontStyle: 'italic',
      }}
    >
      {children}
    </h1>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-body"
      style={{
        fontSize: 14,
        color: 'var(--b-ink-60)',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 1.55,
        margin: '0 auto 24px',
        maxWidth: 360,
      }}
    >
      {children}
    </p>
  );
}

function FilledInkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-body"
      style={{
        width: '100%',
        padding: '14px 16px',
        background: 'var(--b-ink)',
        color: 'var(--b-paper)',
        border: '1px solid var(--b-ink)',
        cursor: disabled ? 'wait' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function OutlinedInkButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-body"
      style={{
        width: '100%',
        padding: '14px 16px',
        background: 'transparent',
        color: 'var(--b-ink)',
        border: '1px solid var(--b-ink)',
        cursor: disabled ? 'wait' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/* — — — Framed avatar (paper-card) — — — */

function FramedInviterAvatar({ profile }: { profile: UserProfile }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          padding: 8,
          border: '1px solid var(--b-ink)',
          background: 'var(--b-paper)',
        }}
      >
        <div style={{ padding: 6, border: '1px solid var(--b-rule)' }}>
          <Avatar src={profile.avatarUrl} alt={profile.username} size="xl" />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div
          className="font-display"
          style={{ fontSize: 18, fontStyle: 'italic', lineHeight: 1 }}
        >
          @{profile.username}
        </div>
        <div
          className="font-body"
          style={{
            fontSize: 11,
            color: 'var(--b-ink-60)',
            marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
            fontStyle: 'italic',
          }}
        >
          Lv.{profile.level} · {profile.totalXP.toLocaleString()} XP
        </div>
      </div>
    </div>
  );
}

/* — — — States — — — */

function LoadingState({ username }: { username: string }) {
  return (
    <div>
      <Eyebrow>Friend invite</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Looking up </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>@{username}</em>
        <em style={{ fontStyle: 'italic' }}>…</em>
      </Display>
    </div>
  );
}

function NotFoundState({ username, router }: { username: string; router: ReturnType<typeof useRouter> }) {
  return (
    <div>
      <Eyebrow>Invite link broken</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>We couldn&rsquo;t find </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>@{username}</em>
        <em style={{ fontStyle: 'italic' }}>.</em>
      </Display>
      <Body>The username may be misspelled or the account no longer exists.</Body>
      <FilledInkButton onClick={() => router.push('/dashboard')}>
        Go to dashboard →
      </FilledInkButton>
    </div>
  );
}

function SelfState({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div>
      <Eyebrow>That&rsquo;s you</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Your own </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>invite link</em>
        <em style={{ fontStyle: 'italic' }}>.</em>
      </Display>
      <Body>Share it with a friend — they&rsquo;ll be added to your circle when they tap it.</Body>
      <FilledInkButton onClick={() => router.push('/friends')}>
        See your friends →
      </FilledInkButton>
    </div>
  );
}

function PreAuthState({
  profile,
  router,
  username,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
  username: string;
}) {
  return (
    <div>
      <Eyebrow>You&rsquo;re invited</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Join </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{profile.username}</em>
        <em style={{ fontStyle: 'italic' }}>&rsquo;s circle.</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
      <Body>
        Sign in or create an account to send your friend request.
      </Body>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FilledInkButton onClick={() => router.push('/auth/login')}>
          Accept invite →
        </FilledInkButton>
        <OutlinedInkButton onClick={() => router.push('/auth/register')}>
          Create account
        </OutlinedInkButton>
      </div>
      <p
        className="font-body"
        style={{
          fontSize: 11,
          color: 'var(--b-ink-40)',
          textAlign: 'center',
          marginTop: 14,
          fontStyle: 'italic',
        }}
      >
        We&rsquo;ll send your request to {username} right after you sign in.
      </p>
    </div>
  );
}

function AlreadyFriendsState({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <Eyebrow>Already friends</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>You and </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{profile.username}</em>
        <em style={{ fontStyle: 'italic' }}> are connected.</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FilledInkButton onClick={() => router.push(`/profile/${profile.username}`)}>
          View profile →
        </FilledInkButton>
        <OutlinedInkButton onClick={() => router.push('/friends')}>
          Friends list
        </OutlinedInkButton>
      </div>
    </div>
  );
}

function PendingState({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <Eyebrow>Already pending</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Awaiting </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{profile.username}</em>
        <em style={{ fontStyle: 'italic' }}>.</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
      <Body>
        Your invite is on its way — they just haven&rsquo;t accepted yet.
      </Body>
      <FilledInkButton onClick={() => router.push('/friends')}>
        Friends list →
      </FilledInkButton>
    </div>
  );
}

function SendingState({ profile }: { profile: UserProfile }) {
  return (
    <div>
      <Eyebrow>Sending</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Reaching out to </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{profile.username}</em>
        <em style={{ fontStyle: 'italic' }}>…</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
    </div>
  );
}

function SentState({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <Eyebrow>Invite sent</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Request on its way to </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>{profile.username}</em>
        <em style={{ fontStyle: 'italic' }}>.</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
      <Body>They&rsquo;ll see it in their bell.</Body>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <FilledInkButton onClick={() => router.push('/dashboard')}>Continue →</FilledInkButton>
        <OutlinedInkButton onClick={() => router.push('/friends')}>Friends</OutlinedInkButton>
      </div>
    </div>
  );
}

function ErrorState({
  profile,
  message,
  router,
}: {
  profile: UserProfile;
  message: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div>
      <Eyebrow>Couldn&rsquo;t send</Eyebrow>
      <Display>
        <em style={{ fontStyle: 'italic' }}>Something </em>
        <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>broke</em>
        <em style={{ fontStyle: 'italic' }}>.</em>
      </Display>
      <FramedInviterAvatar profile={profile} />
      <p
        className="font-body"
        style={{
          fontSize: 13,
          color: 'var(--b-accent)',
          textAlign: 'center',
          fontStyle: 'italic',
          marginBottom: 20,
        }}
      >
        {message}
      </p>
      <OutlinedInkButton onClick={() => router.push('/friends')}>
        Go to friends list
      </OutlinedInkButton>
    </div>
  );
}
