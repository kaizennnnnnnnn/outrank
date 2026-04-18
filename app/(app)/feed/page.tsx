'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFeed } from '@/hooks/useFeed';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/utils';
import { doc, createDocument } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { arrayUnion, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useUIStore } from '@/store/uiStore';
import { ReactionEmoji } from '@/types/feed';
import { cn } from '@/lib/utils';
import { ActivityIcon } from '@/components/ui/AppIcons';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { ProofImage, VerifiedBadge } from '@/components/social/ProofImage';
import { FeedComments } from '@/components/social/FeedComments';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { MiniOrb } from '@/components/profile/MiniOrb';
import { getCategoryByName, getCategoryBySlug } from '@/constants/categories';
import Link from 'next/link';

const REACTIONS: ReactionEmoji[] = ['🔥', '💪', '👏', '⚡', '🤝'];

export default function FeedPage() {
  const { user } = useAuth();
  const { items, loading } = useFeed();
  const addToast = useUIStore((s) => s.addToast);
  const [sharedReactions, setSharedReactions] = useState<Record<string, Record<string, string[]>>>({});

  // Fetch per-actor cosmetics once so each feed card shows the poster's real
  // frame / name effect / mini orb instead of a plain avatar.
  interface ActorCosm { frame?: string; name?: string; tier?: number; baseColor?: string; pulseColor?: string; ringColor?: string; }
  const [actorCosm, setActorCosm] = useState<Record<string, ActorCosm>>({});
  useEffect(() => {
    const need = Array.from(new Set(items.map((i) => i.actorId))).filter((id) => !actorCosm[id]);
    if (need.length === 0) return;
    Promise.all(
      need.map((id) => getDoc(doc(db, `users/${id}`)).then((snap) => {
        if (!snap.exists()) return null;
        const d = snap.data() as Record<string, unknown>;
        return { id, snap: {
          frame: d.equippedFrame as string | undefined,
          name:  d.equippedNameEffect as string | undefined,
          tier:  (d.orbTier as number) || 1,
          baseColor:  d.orbBaseColor as string | undefined,
          pulseColor: d.orbPulseColor as string | undefined,
          ringColor:  d.orbRingColor as string | undefined,
        } as ActorCosm };
      })),
    ).then((rows) => {
      const next: Record<string, ActorCosm> = {};
      for (const r of rows) { if (r) next[r.id] = r.snap; }
      if (Object.keys(next).length) setActorCosm((prev) => ({ ...prev, ...next }));
    });
  }, [items, actorCosm]);

  // Load shared reactions for all feed items that have originId
  useEffect(() => {
    async function loadReactions() {
      const reactionMap: Record<string, Record<string, string[]>> = {};
      for (const item of items) {
        const originId = (item as unknown as Record<string, unknown>).originId as string | undefined;
        if (!originId) continue;
        try {
          const snap = await getDoc(doc(db, `reactions/${originId}`));
          if (snap.exists()) {
            reactionMap[originId] = snap.data().reactions || {};
          }
        } catch { /* ignore */ }
      }
      setSharedReactions(reactionMap);
    }
    if (items.length > 0) loadReactions();
  }, [items]);

  const handleReaction = async (originId: string | undefined, itemId: string, emoji: ReactionEmoji, actorId?: string) => {
    if (!user) return;
    try {
      if (originId) {
        // Use shared reactions document
        const ref = doc(db, `reactions/${originId}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { reactions: { [emoji]: [user.uid] } });
        } else {
          await updateDoc(ref, {
            [`reactions.${emoji}`]: arrayUnion(user.uid),
          });
        }
        // Update local state immediately
        setSharedReactions((prev) => {
          const current = prev[originId] || {};
          const emojiList = current[emoji] || [];
          if (!emojiList.includes(user.uid)) {
            return { ...prev, [originId]: { ...current, [emoji]: [...emojiList, user.uid] } };
          }
          return prev;
        });
      } else {
        // Fallback: update own feed copy
        const ref = doc(db, `feed/${user.uid}/items`, itemId);
        await updateDoc(ref, {
          [`reactions.${emoji}`]: arrayUnion(user.uid),
        });
      }
      // Notify the actor that someone reacted
      if (actorId && actorId !== user.uid) {
        try {
          await createDocument(`notifications/${actorId}/items`, {
            type: 'friend_logged',
            message: `${user.username} reacted ${emoji} to your log`,
            isRead: false,
            relatedId: '',
            actorId: user.uid,
            actorAvatar: user.avatarUrl || '',
            createdAt: Timestamp.now(),
          });
        } catch { /* silent */ }
      }
    } catch (err) {
      console.error('Reaction failed:', err);
      addToast({ type: 'error', message: 'Failed to react' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white font-heading">Activity Feed</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon size={40} className="text-red-400" />}
          title="No activity yet"
          description="Add friends to see their progress in your feed."
          action={
            <Link href="/friends">
              <span className="text-orange-400 hover:underline text-sm">Find Friends</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.filter((item) => item.actorId !== user?.uid).map((item) => {
            const resolvedCat = item.categorySlug
              ? getCategoryBySlug(item.categorySlug)
              : item.categoryName
                ? getCategoryByName(item.categoryName)
                : undefined;
            const color = item.categoryColor || resolvedCat?.color || '#f97316';
            const cosm = actorCosm[item.actorId] || {};
            return (
            <div key={item.id} className="glass-card rounded-2xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3">
                <Link href={`/profile/${item.actorUsername}`}>
                  <FramedAvatar src={item.actorAvatar} alt={item.actorUsername} size="md" frameId={cosm.frame} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${item.actorUsername}`} className="flex items-center gap-1.5">
                    <NamePlate name={item.actorUsername} effectId={cosm.name} size="sm" className="hover:text-orange-400" />
                    {cosm.tier !== undefined && (
                      <MiniOrb
                        tier={cosm.tier}
                        baseColorId={cosm.baseColor}
                        pulseColorId={cosm.pulseColor}
                        ringColorId={cosm.ringColor}
                        size={18}
                      />
                    )}
                  </Link>
                  <p className="text-xs text-slate-600">
                    {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
                  </p>
                </div>
                <CategoryIcon
                  slug={item.categorySlug}
                  name={item.categoryName}
                  icon={item.categoryIcon || ''}
                  color={color}
                  size="sm"
                />
              </div>

              {/* Content */}
              <p className="text-sm text-slate-300 flex items-center gap-2">
                <span>{item.message}</span>
                {item.verified && <VerifiedBadge />}
              </p>

              {/* Proof photo */}
              {item.proofImageUrl && (
                <ProofImage src={item.proofImageUrl} alt={`${item.actorUsername}'s proof`} />
              )}

              {/* Reactions */}
              <div className="flex items-center gap-2">
                {REACTIONS.map((emoji) => {
                  const originId = (item as unknown as Record<string, unknown>).originId as string | undefined;
                  const shared = originId ? sharedReactions[originId] : null;
                  const reactionsData = shared || item.reactions || {};
                  const emojiUsers = (reactionsData as Record<string, string[]>)[emoji] || [];
                  const reacted = emojiUsers.includes(user?.uid || '');
                  const count = emojiUsers.length;
                  return (
                    <button
                      key={emoji}
                      onClick={() => item.id && handleReaction(originId, item.id, emoji, item.actorId)}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all',
                        reacted
                          ? 'bg-red-500/20 border border-red-500/30'
                          : 'bg-[#18182a] border border-[#2d2d45] hover:border-red-500/20'
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-slate-400">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Comments */}
              {(() => {
                const originId = (item as unknown as Record<string, string>).originId;
                return originId ? <FeedComments originId={originId} actorId={item.actorId} /> : null;
              })()}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
