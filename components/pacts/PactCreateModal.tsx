'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { useUIStore } from '@/store/uiStore';
import { PILLARS } from '@/constants/pillars';
import { CATEGORIES } from '@/constants/categories';
import { createPactInvite, PACT_REWARDS } from '@/lib/pacts';
import { PactDurationDays, PactReward } from '@/types/pact';
import { getDocument } from '@/lib/firestore';
import { UserProfile } from '@/types/user';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Pre-pick this friend on open. Used by the friends-page "Pact"
   * button — skips step 1 and lands the user on pillar selection.
   * Can still be cleared by tapping Back.
   */
  initialFriend?: UserProfile;
}

const DURATIONS: PactDurationDays[] = [7, 14, 30];

/**
 * Three-step pact creation flow inside an editorial Modal:
 *
 *   1. Pick a friend from the user's accepted-friends list.
 *   2. Pick one of the five pillars (custom habits aren't pact-eligible).
 *   3. Pick a duration (7/14/30 days) → confirm.
 */
export function PactCreateModal({ isOpen, onClose, initialFriend }: Props) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const addToast = useUIStore((s) => s.addToast);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [pickedFriend, setPickedFriend] = useState<UserProfile | null>(null);
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);
  const [pickedDuration, setPickedDuration] = useState<PactDurationDays>(7);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialFriend) {
      setPickedFriend(initialFriend);
      setStep(2);
    } else {
      setPickedFriend(null);
      setStep(1);
    }
    setPickedSlug(null);
    setPickedDuration(7);
  }, [isOpen, initialFriend]);

  useEffect(() => {
    if (!isOpen || friends.length === 0) {
      setFriendProfiles([]);
      return;
    }
    setProfilesLoading(true);
    let cancelled = false;
    Promise.all(
      friends.map((f) => getDocument<UserProfile>('users', f.id)),
    )
      .then((rows) => {
        if (cancelled) return;
        setFriendProfiles(rows.filter((r): r is UserProfile => !!r));
        setProfilesLoading(false);
      })
      .catch(() => {
        if (!cancelled) setProfilesLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, friends]);

  const submit = async () => {
    if (!user || !pickedFriend || !pickedSlug) return;
    const pillar = PILLARS.find((p) => p.slug === pickedSlug);
    const cat = CATEGORIES.find((c) => c.slug === pickedSlug);
    if (!pillar || !cat) return;

    setCreating(true);
    try {
      await createPactInvite({
        initiatorId: user.uid,
        initiatorMeta: { username: user.username, avatarUrl: user.avatarUrl || '' },
        friendId: pickedFriend.uid,
        friendMeta: { username: pickedFriend.username, avatarUrl: pickedFriend.avatarUrl || '' },
        habitSlug: pillar.slug,
        habitName: pillar.name,
        habitColor: cat.color,
        durationDays: pickedDuration,
      });
      addToast({ type: 'success', message: `Invite sent to ${pickedFriend.username}` });
      onClose();
    } catch {
      addToast({ type: 'error', message: 'Could not send invite' });
    } finally {
      setCreating(false);
    }
  };

  const reward = PACT_REWARDS[pickedDuration];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Pact">
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Stepper step={step} />

        {step === 1 && (
          <FriendStep
            friends={friendProfiles}
            loading={profilesLoading}
            onPick={(f) => {
              setPickedFriend(f);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <PillarStep
            picked={pickedSlug}
            onPick={(slug) => {
              setPickedSlug(slug);
              setStep(3);
            }}
          />
        )}

        {step === 3 && pickedFriend && pickedSlug && (
          <DurationStep
            duration={pickedDuration}
            onChange={setPickedDuration}
            friend={pickedFriend}
            slug={pickedSlug}
            reward={reward}
          />
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid var(--b-rule)',
          }}
        >
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1))}
              disabled={creating}
              className="font-body"
              style={{
                padding: '8px 14px',
                background: 'transparent',
                color: 'var(--b-ink-60)',
                border: '1px solid var(--b-rule)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              ← Back
            </button>
          ) : <span />}
          {step === 3 && (
            <button
              onClick={submit}
              disabled={creating}
              className="font-body"
              style={{
                padding: '10px 16px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: '1px solid var(--b-ink)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: creating ? 0.7 : 1,
              }}
            >
              {creating ? 'Sending…' : 'Send Invite →'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            flex: 1,
            height: 2,
            background: step >= n ? 'var(--b-ink)' : 'var(--b-rule)',
            transition: 'background-color 200ms ease',
          }}
        />
      ))}
    </div>
  );
}

function FriendStep({
  friends,
  loading,
  onPick,
}: {
  friends: UserProfile[];
  loading: boolean;
  onPick: (f: UserProfile) => void;
}) {
  if (loading) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--b-ink-60)', textAlign: 'center', padding: '24px 0' }}
      >
        Loading friends…
      </p>
    );
  }
  if (friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <p
          className="font-display"
          style={{ fontStyle: 'italic', fontSize: 16, fontWeight: 500, color: 'var(--b-ink)', margin: 0 }}
        >
          No friends yet.
        </p>
        <p
          className="font-body"
          style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4 }}
        >
          Pacts need a partner. Add friends from the Friends page.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
        Pick a Partner
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 300,
          overflowY: 'auto',
          borderTop: '1px solid var(--b-rule)',
        }}
      >
        {friends.map((f) => (
          <button
            key={f.uid}
            onClick={() => onPick(f)}
            className="font-body"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--b-rule)',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--b-ink)',
            }}
          >
            <Avatar src={f.avatarUrl} alt={f.username} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="font-display"
                style={{
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 14,
                  color: 'var(--b-ink)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {f.username}
              </p>
              <p
                className="font-mono tabular"
                style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
              >
                Lv.{f.level} · {f.totalXP.toLocaleString()} XP
              </p>
            </div>
            <span
              className="spread"
              style={{ fontSize: 9, color: 'var(--b-ink-40)' }}
            >
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PillarStep({
  picked,
  onPick,
}: {
  picked: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <div>
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
        Pick a Pillar
      </div>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          borderTop: '1px solid var(--b-rule)',
        }}
      >
        {PILLARS.map((p, i) => {
          const cat = CATEGORIES.find((c) => c.slug === p.slug);
          if (!cat) return null;
          const isPicked = picked === p.slug;
          return (
            <li key={p.slug} style={{ borderBottom: '1px solid var(--b-rule)' }}>
              <button
                onClick={() => onPick(p.slug)}
                className="font-body"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 32px 1fr',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '12px 8px',
                  background: isPicked ? 'var(--b-paper-2)' : 'transparent',
                  border: 'none',
                  borderLeft: isPicked ? `3px solid ${cat.color}` : '3px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--b-ink)',
                }}
              >
                <span
                  className="font-display tabular"
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: 14,
                    color: 'var(--b-ink-40)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <CategoryIcon
                  slug={p.slug}
                  name={p.name}
                  icon={cat.icon}
                  color={cat.color}
                  size="sm"
                />
                <span
                  className="font-display"
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 500,
                    fontSize: 14,
                    color: 'var(--b-ink)',
                  }}
                >
                  {p.name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DurationStep({
  duration,
  onChange,
  friend,
  slug,
  reward,
}: {
  duration: PactDurationDays;
  onChange: (d: PactDurationDays) => void;
  friend: UserProfile;
  slug: string;
  reward: PactReward;
}) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  return (
    <div>
      <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 8 }}>
        Pick Duration
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          marginBottom: 14,
        }}
      >
        {DURATIONS.map((d) => {
          const r = PACT_REWARDS[d];
          const isPicked = duration === d;
          return (
            <button
              key={d}
              onClick={() => onChange(d)}
              className="font-body"
              style={{
                padding: 12,
                textAlign: 'center',
                background: isPicked ? 'var(--b-ink)' : 'transparent',
                color: isPicked ? 'var(--b-paper)' : 'var(--b-ink)',
                border: '1px solid var(--b-ink)',
                cursor: 'pointer',
              }}
            >
              <p
                className="font-display tabular"
                style={{
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 28,
                  lineHeight: 1,
                  margin: 0,
                  color: isPicked ? 'var(--b-paper)' : 'var(--b-ink)',
                }}
              >
                {d}
              </p>
              <p
                className="spread"
                style={{
                  fontSize: 9,
                  color: isPicked ? 'var(--b-paper)' : 'var(--b-ink-60)',
                  marginTop: 4,
                }}
              >
                Days
              </p>
              <p
                className="font-mono tabular"
                style={{
                  fontSize: 10,
                  color: isPicked ? 'var(--b-paper)' : 'var(--b-ink-60)',
                  marginTop: 4,
                }}
              >
                +{r.xp} XP
              </p>
            </button>
          );
        })}
      </div>

      {/* Summary blockquote */}
      <div style={{ borderTop: '2px solid var(--b-ink)', paddingTop: 10 }}>
        <p
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-ink)', lineHeight: 1.5, margin: 0 }}
        >
          You ×{' '}
          <em
            className="font-display"
            style={{ fontStyle: 'italic', fontSize: 14 }}
          >
            {friend.username}
          </em>{' '}
          commit to{' '}
          <span style={{ fontWeight: 600 }}>{cat?.name}</span> for{' '}
          <span className="font-mono tabular" style={{ fontWeight: 600 }}>
            {duration} days
          </span>
          .
        </p>
        <p
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 6 }}
        >
          <span className="spread" style={{ fontSize: 9, marginRight: 6 }}>Win</span>
          <span style={{ color: 'var(--b-accent)' }}>
            +{reward.xp} XP / +{reward.fragments} frags each
          </span>
          {reward.cosmeticId && <span> · cosmetic</span>}
        </p>
        <p
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
        >
          <span className="spread" style={{ fontSize: 9, marginRight: 6 }}>Lose</span>
          <span style={{ color: 'var(--b-accent)' }}>−50 fragments each</span> if either side breaks.
        </p>
        <p
          className="font-mono tabular"
          style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 2 }}
        >
          One free miss covered by an auto-freeze. Use it carefully.
        </p>
      </div>
    </div>
  );
}
