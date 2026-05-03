'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { getDocument, setDocument, createDocument, Timestamp } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';
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
    <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {state.kind === 'loading' && <LoadingCard username={username} />}
        {state.kind === 'not-found' && <NotFoundCard username={username} router={router} />}
        {state.kind === 'self' && <SelfCard router={router} />}
        {state.kind === 'pre-auth' && (
          <PreAuthCard profile={state.profile} router={router} username={username} />
        )}
        {state.kind === 'already-friends' && (
          <AlreadyFriendsCard profile={state.profile} router={router} />
        )}
        {state.kind === 'pending' && <PendingCard profile={state.profile} router={router} />}
        {state.kind === 'sending' && <SendingCard profile={state.profile} />}
        {state.kind === 'sent' && <SentCard profile={state.profile} router={router} />}
        {state.kind === 'error' && (
          <ErrorCard profile={state.profile} message={state.message} router={router} />
        )}
      </div>
    </div>
  );
}

function CardShell({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        background:
          'radial-gradient(ellipse 100% 80% at 100% 0%, rgba(249,115,22,0.18), transparent 55%),' +
          'linear-gradient(160deg, #10101a 0%, #0b0b14 100%)',
        borderColor: 'rgba(249,115,22,0.25)',
        boxShadow: '0 0 30px -14px rgba(249,115,22,0.4), inset 0 1px 0 rgba(249,115,22,0.08)',
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400 mb-2">
        {eyebrow}
      </p>
      {children}
    </div>
  );
}

function PersonHeader({ profile }: { profile: UserProfile }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <Avatar src={profile.avatarUrl} alt={profile.username} size="lg" />
      <div>
        <p className="font-heading text-xl font-bold text-white leading-none">
          {profile.username}
        </p>
        <p className="text-[11px] font-mono text-slate-500 mt-1">
          Lv.{profile.level} · {profile.totalXP.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}

function LoadingCard({ username }: { username: string }) {
  return (
    <CardShell eyebrow="Friend invite">
      <p className="text-white">Looking up {username}…</p>
    </CardShell>
  );
}

function NotFoundCard({ username, router }: { username: string; router: ReturnType<typeof useRouter> }) {
  return (
    <CardShell eyebrow="Invite link broken">
      <p className="font-heading text-xl font-bold text-white mb-2">
        We couldn&rsquo;t find @{username}.
      </p>
      <p className="text-[12px] text-slate-400 mb-4">
        The username may be misspelled or the account no longer exists.
      </p>
      <Button onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
    </CardShell>
  );
}

function SelfCard({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <CardShell eyebrow="That&rsquo;s you">
      <p className="font-heading text-xl font-bold text-white mb-2">
        This is your own invite link.
      </p>
      <p className="text-[12px] text-slate-400 mb-4">
        Share it with a friend — they&rsquo;ll be added to your circle when they tap it.
      </p>
      <Button onClick={() => router.push('/friends')}>See your friends</Button>
    </CardShell>
  );
}

function PreAuthCard({
  profile,
  router,
  username,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
  username: string;
}) {
  return (
    <CardShell eyebrow="Friend invite">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-slate-300 leading-relaxed mb-4">
        <span className="font-bold text-white">{profile.username}</span> wants you on Outrank —
        sign in or create an account to send the friend request.
      </p>
      <div className="flex flex-col gap-2">
        <Button onClick={() => router.push('/auth/login')}>Sign in</Button>
        <Button variant="secondary" onClick={() => router.push('/auth/register')}>
          Create account
        </Button>
      </div>
      <p className="text-[10px] text-slate-600 text-center mt-3">
        We&rsquo;ll send your request to {username} right after you sign in.
      </p>
    </CardShell>
  );
}

function AlreadyFriendsCard({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <CardShell eyebrow="Already friends">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-slate-300 mb-4">
        You and {profile.username} are already friends.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => router.push(`/profile/${profile.username}`)}>View profile</Button>
        <Button variant="secondary" onClick={() => router.push('/friends')}>
          Friends list
        </Button>
      </div>
    </CardShell>
  );
}

function PendingCard({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <CardShell eyebrow="Already pending">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-slate-300 mb-4">
        Your invite to {profile.username} is already on its way — they just haven&rsquo;t accepted yet.
      </p>
      <Button onClick={() => router.push('/friends')}>Friends list</Button>
    </CardShell>
  );
}

function SendingCard({ profile }: { profile: UserProfile }) {
  return (
    <CardShell eyebrow="Sending">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-slate-300">
        Sending your friend request to {profile.username}…
      </p>
    </CardShell>
  );
}

function SentCard({
  profile,
  router,
}: {
  profile: UserProfile;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <CardShell eyebrow="Invite sent">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-slate-300 mb-4">
        Friend request sent to <span className="font-bold text-white">{profile.username}</span> —
        they&rsquo;ll see it in their bell.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => router.push('/dashboard')}>Continue</Button>
        <Button variant="secondary" onClick={() => router.push('/friends')}>
          Friends
        </Button>
      </div>
    </CardShell>
  );
}

function ErrorCard({
  profile,
  message,
}: {
  profile: UserProfile;
  message: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <CardShell eyebrow="Couldn&rsquo;t send">
      <PersonHeader profile={profile} />
      <p className="text-[14px] text-red-300 mb-3">{message}</p>
      <Link href="/friends" className="block">
        <Button variant="secondary" className="w-full">
          Go to friends list
        </Button>
      </Link>
    </CardShell>
  );
}
