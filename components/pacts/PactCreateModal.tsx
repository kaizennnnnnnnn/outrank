'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
import { cn } from '@/lib/utils';

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
 * Three-step pact creation flow inside a modal:
 *
 *   1. Pick a friend from the user's accepted-friends list.
 *   2. Pick one of the five pillars (custom habits aren't pact-eligible).
 *   3. Pick a duration (7/14/30 days) → confirm.
 *
 * Friend usernames + avatars are looked up once per friend on open
 * (parallelized) — friendships rows store only the friend's uid, not
 * profile fields, so a quick batch fetch builds the picker.
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

  // Reset on open. If the caller passed an initialFriend, jump straight
  // to step 2 — the friend's already chosen, no point in showing the
  // picker again.
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

  // Resolve usernames + avatars for the user's friends list. Reads once
  // per open; memoized via map.
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
      <div className="space-y-4">
        <Stepper step={step} />

        {step === 1 && (
          <FriendStep
            friends={friendProfiles}
            loading={profilesLoading}
            picked={pickedFriend}
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

        <div className="flex items-center justify-between gap-2 pt-2">
          {step > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1))}
              disabled={creating}
            >
              Back
            </Button>
          ) : <span />}
          {step === 3 && (
            <Button onClick={submit} loading={creating}>
              Send invite
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            'flex-1 h-1 rounded-full transition-colors',
            step >= n ? 'bg-orange-400' : 'bg-[#1e1e30]',
          )}
        />
      ))}
    </div>
  );
}

function FriendStep({
  friends,
  loading,
  picked,
  onPick,
}: {
  friends: UserProfile[];
  loading: boolean;
  picked: UserProfile | null;
  onPick: (f: UserProfile) => void;
}) {
  if (loading) {
    return <p className="text-sm text-slate-500 text-center py-6">Loading friends…</p>;
  }
  if (friends.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-slate-400">No friends yet — pacts need a partner.</p>
        <p className="text-[11px] text-slate-600 mt-1">Add friends from the Friends page.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        Pick a partner
      </p>
      {friends.map((f) => (
        <motion.button
          key={f.uid}
          whileTap={{ scale: 0.99 }}
          onClick={() => onPick(f)}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl p-3 transition-all',
            picked?.uid === f.uid
              ? 'bg-orange-500/15 border border-orange-500/40'
              : 'bg-[#0c0c16] border border-[#1e1e30] hover:border-orange-500/30',
          )}
        >
          <Avatar src={f.avatarUrl} alt={f.username} size="md" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-white truncate">{f.username}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Lv.{f.level} · {f.totalXP.toLocaleString()} XP
            </p>
          </div>
        </motion.button>
      ))}
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        Pick a pillar
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PILLARS.map((p) => {
          const cat = CATEGORIES.find((c) => c.slug === p.slug);
          if (!cat) return null;
          const isPicked = picked === p.slug;
          return (
            <motion.button
              key={p.slug}
              whileTap={{ scale: 0.97 }}
              onClick={() => onPick(p.slug)}
              className={cn(
                'flex items-center gap-2 rounded-xl p-3 transition-all text-left',
                isPicked
                  ? 'border-2'
                  : 'bg-[#0c0c16] border border-[#1e1e30] hover:border-[#2d2d45]',
              )}
              style={{
                background: isPicked ? `${cat.color}15` : undefined,
                borderColor: isPicked ? `${cat.color}77` : undefined,
                boxShadow: isPicked ? `0 0 12px -4px ${cat.color}aa` : undefined,
              }}
            >
              <CategoryIcon
                slug={p.slug}
                name={p.name}
                icon={cat.icon}
                color={cat.color}
                size="sm"
              />
              <span className="text-[12px] font-bold text-white truncate">{p.name}</span>
            </motion.button>
          );
        })}
      </div>
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
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        Pick duration
      </p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {DURATIONS.map((d) => {
          const r = PACT_REWARDS[d];
          const isPicked = duration === d;
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(d)}
              className={cn(
                'rounded-xl p-3 text-center transition-all',
                isPicked
                  ? 'bg-orange-500/15 border-2 border-orange-500/60'
                  : 'bg-[#0c0c16] border border-[#1e1e30] hover:border-[#2d2d45]',
              )}
            >
              <p className={cn(
                'font-heading text-2xl font-bold',
                isPicked ? 'text-orange-400' : 'text-white',
              )}>
                {d}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">
                days
              </p>
              <p className="text-[10px] font-mono text-slate-500 mt-1.5">
                +{r.xp} XP
              </p>
            </motion.button>
          );
        })}
      </div>

      <div
        className="rounded-xl p-3 mt-3"
        style={{
          background: cat ? `${cat.color}10` : undefined,
          border: cat ? `1px solid ${cat.color}33` : undefined,
        }}
      >
        <p className="text-[11px] text-slate-300 leading-relaxed">
          You × <span className="text-white font-bold">{friend.username}</span> commit to{' '}
          <span style={{ color: cat?.color }} className="font-bold">{cat?.name}</span> for{' '}
          <span className="text-white font-bold">{duration} days</span>.
        </p>
        <p className="text-[10px] font-mono text-slate-500 mt-2">
          Win: <span className="text-emerald-400">+{reward.xp} XP / +{reward.fragments} frags each</span>
          {reward.cosmeticId && <span className="text-emerald-400"> · cosmetic</span>}
        </p>
        <p className="text-[10px] font-mono text-slate-500">
          Lose: <span className="text-red-400">−50 fragments each</span> if either side breaks.
        </p>
      </div>
    </div>
  );
}
