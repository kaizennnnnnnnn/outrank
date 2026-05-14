'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { getDocument } from '@/lib/firestore';
import { UserProfile } from '@/types/user';
import { CATEGORIES } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Masthead } from '@/components/editorial/Masthead';
import { useUIStore } from '@/store/uiStore';
import { createTournament, rewardForDuration, RoundDuration } from '@/lib/tournament';

interface ResolvedFriend {
  uid: string;
  username: string;
  avatarUrl: string;
}

const DURATION_OPTIONS: RoundDuration[] = [3, 7, 14];

/**
 * Tournament creation form. Picks 3 friends + a category + a round
 * duration, then writes the tournament doc + fans out invites. The
 * router pushes the user onto the new bracket page, where they wait
 * for invitees to accept.
 */
export default function NewTournamentPage() {
  const { user } = useAuth();
  const { friends, loading: friendsLoading } = useFriends();
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);

  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState<string>('gym');
  const [duration, setDuration] = useState<RoundDuration>(7);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedFriends, setResolvedFriends] = useState<ResolvedFriend[] | null>(null);

  // Resolve friend profiles — mirrors the friends page pattern but
  // pulls only the fields we need for the picker.
  useEffect(() => {
    if (friendsLoading) return;
    if (!user) return;
    let cancelled = false;
    (async () => {
      const resolved: ResolvedFriend[] = [];
      for (const f of friends) {
        const p = await getDocument<UserProfile>('users', f.id);
        if (!p) continue;
        resolved.push({ uid: f.id, username: p.username, avatarUrl: p.avatarUrl || '' });
      }
      if (!cancelled) setResolvedFriends(resolved);
    })();
    return () => { cancelled = true; };
  }, [friends, friendsLoading, user]);

  const reward = useMemo(() => rewardForDuration(duration), [duration]);
  const togglePick = (uid: string) => {
    setPickedIds((cur) => {
      if (cur.includes(uid)) return cur.filter((id) => id !== uid);
      if (cur.length >= 3) return cur;
      return [...cur, uid];
    });
  };

  const canSubmit = !!user && !submitting && pickedIds.length === 3 && title.trim().length > 0;

  const onSubmit = async () => {
    if (!canSubmit || !user || !resolvedFriends) return;
    setSubmitting(true);
    const picked = resolvedFriends.filter((f) => pickedIds.includes(f.uid));
    try {
      const id = await createTournament({
        creator: { uid: user.uid, username: user.username, avatarUrl: user.avatarUrl || '' },
        invitees: picked,
        categoryId: categorySlug,
        categorySlug,
        title: title.trim(),
        durationDaysPerRound: duration,
      });
      addToast({ type: 'success', message: 'Tournament invites sent' });
      router.push(`/tournaments/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create tournament';
      addToast({ type: 'error', message });
      setSubmitting(false);
    }
  };

  return (
    <div className="dir-b min-h-screen" style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}>
      <div className="max-w-2xl mx-auto pb-32">
        <Masthead section="New Tournament" />

        <div style={{ padding: '0 22px' }}>
          <Link
            href="/tournaments"
            className="font-body"
            style={{ fontSize: 10, color: 'var(--b-ink-60)', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            ← Back
          </Link>
          <h1 className="font-display" style={{ fontSize: 38, fontWeight: 500, lineHeight: 1, marginTop: 4 }}>
            <em style={{ fontStyle: 'italic' }}>Start a bracket</em>
          </h1>
          <p className="font-body" style={{ fontSize: 12, color: 'var(--b-ink-60)', marginTop: 6 }}>
            Pick three friends, a category, and a round length. Same length applies to semis and final.
          </p>

          <Field label="Title">
            <Input
              placeholder="e.g. Spring Gym Showdown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={48}
            />
          </Field>

          <Field label="Category">
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="font-body"
              style={{
                width: '100%',
                background: 'var(--b-paper)',
                color: 'var(--b-ink)',
                border: '1px solid var(--b-ink)',
                padding: '10px 12px',
                fontSize: 13,
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.icon} {c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Round duration">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {DURATION_OPTIONS.map((d) => {
                const r = rewardForDuration(d);
                const active = d === duration;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className="font-body"
                    style={{
                      border: `1px solid ${active ? 'var(--b-accent)' : 'var(--b-ink)'}`,
                      background: active ? 'var(--b-accent)' : 'transparent',
                      color: active ? '#ffffff' : 'var(--b-ink)',
                      padding: '12px 8px',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span className="font-display" style={{ fontSize: 18, fontStyle: 'italic', fontWeight: 600 }}>
                      {d}d
                    </span>
                    <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      +{r.fragments.toLocaleString()} ◆
                    </span>
                    <span style={{ fontSize: 9, opacity: 0.8 }}>+{r.xp} XP</span>
                    <span style={{ fontSize: 9, opacity: 0.8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {r.cosmeticLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <p
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 6, fontStyle: 'italic' }}
            >
              Longer brackets pay more — champion unlocks a tiered frame + name effect, plus the Tournament Champion badge.
            </p>
          </Field>

          <Field label={`Invite (${pickedIds.length} / 3)`}>
            {resolvedFriends === null ? (
              <Skeleton className="h-32" />
            ) : resolvedFriends.length < 3 ? (
              <p className="font-body" style={{ fontSize: 12, color: '#fbbf24', fontStyle: 'italic' }}>
                You need at least 3 friends to start a tournament.{' '}
                <Link href="/friends" style={{ color: 'var(--b-accent)' }}>Add some</Link>.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resolvedFriends.map((f) => {
                  const picked = pickedIds.includes(f.uid);
                  return (
                    <li key={f.uid}>
                      <button
                        type="button"
                        onClick={() => togglePick(f.uid)}
                        disabled={!picked && pickedIds.length >= 3}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          border: `1px solid ${picked ? 'var(--b-accent)' : 'var(--b-rule)'}`,
                          background: picked ? 'color-mix(in srgb, var(--b-accent) 8%, var(--b-paper))' : 'var(--b-paper)',
                          color: 'inherit',
                          cursor: (!picked && pickedIds.length >= 3) ? 'not-allowed' : 'pointer',
                          opacity: (!picked && pickedIds.length >= 3) ? 0.45 : 1,
                          textAlign: 'left',
                        }}
                      >
                        <Avatar src={f.avatarUrl} alt={f.username} size="sm" />
                        <span className="font-body" style={{ fontSize: 13, flex: 1 }}>{f.username}</span>
                        {picked && (
                          <span className="spread" style={{ fontSize: 8, color: 'var(--b-accent)', letterSpacing: '0.16em' }}>
                            Invited
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Field>

          <div style={{ marginTop: 24 }}>
            <Button onClick={onSubmit} disabled={!canSubmit} loading={submitting} className="w-full">
              {submitting ? 'Sending invites…' : 'Create tournament'}
            </Button>
            <p
              className="font-body"
              style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 8, textAlign: 'center' }}
            >
              Each invitee gets a push. Tournament starts once all three accept.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
