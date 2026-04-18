'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { ReactionEmoji, FeedItem } from '@/types/feed';
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

const REACTIONS: { emoji: ReactionEmoji; label: string; color: string }[] = [
  { emoji: '🔥', label: 'Hyped', color: '#f97316' },
  { emoji: '💪', label: 'Beast', color: '#ef4444' },
  { emoji: '👏', label: 'Respect', color: '#fbbf24' },
  { emoji: '⚡', label: 'Fast',   color: '#a855f7' },
  { emoji: '🤝', label: 'With you', color: '#22d3ee' },
];

interface ActorCosm { frame?: string; name?: string; tier?: number; baseColor?: string; pulseColor?: string; ringColor?: string; }

export default function FeedPage() {
  const { user } = useAuth();
  const { items, loading } = useFeed();
  const addToast = useUIStore((s) => s.addToast);
  const [sharedReactions, setSharedReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [filter, setFilter] = useState<'all' | 'friends' | 'mine'>('all');
  const [actorCosm, setActorCosm] = useState<Record<string, ActorCosm>>({});

  // Fetch poster cosmetics once per actor so cards show real frames/orbs.
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

  // Load shared reactions for all feed items that have an originId
  useEffect(() => {
    async function loadReactions() {
      const reactionMap: Record<string, Record<string, string[]>> = {};
      for (const item of items) {
        const originId = (item as unknown as Record<string, unknown>).originId as string | undefined;
        if (!originId) continue;
        try {
          const snap = await getDoc(doc(db, `reactions/${originId}`));
          if (snap.exists()) reactionMap[originId] = snap.data().reactions || {};
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
        const ref = doc(db, `reactions/${originId}`);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { reactions: { [emoji]: [user.uid] } });
        } else {
          await updateDoc(ref, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
        }
        setSharedReactions((prev) => {
          const current = prev[originId] || {};
          const emojiList = current[emoji] || [];
          if (!emojiList.includes(user.uid)) {
            return { ...prev, [originId]: { ...current, [emoji]: [...emojiList, user.uid] } };
          }
          return prev;
        });
      } else {
        const ref = doc(db, `feed/${user.uid}/items`, itemId);
        await updateDoc(ref, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
      }
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

  // Visible items — all by default (includes user's own activity)
  const visibleItems = items.filter((item) => {
    if (filter === 'friends') return item.actorId !== user?.uid;
    if (filter === 'mine')    return item.actorId === user?.uid;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Premium header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 border"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 100% 0%, rgba(249,115,22,0.18), transparent 55%),' +
            'linear-gradient(165deg, #10101a 0%, #0b0b14 100%)',
          borderColor: 'rgba(249,115,22,0.22)',
          boxShadow: '0 0 30px -14px rgba(249,115,22,0.4), inset 0 1px 0 rgba(249,115,22,0.08)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-orange-400">
              Live
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white mt-0.5">Activity Feed</h1>
            <p className="text-[11px] text-slate-500 mt-1">
              Every log, streak and milestone from your circle.
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Live</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 inline-flex items-center gap-1 bg-[#0b0b14] rounded-xl p-1 border border-[#1e1e30]">
          {(['all', 'friends', 'mine'] as const).map((key) => {
            const labels = { all: 'All', friends: 'Friends', mine: 'Me' };
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all',
                  active
                    ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'text-slate-500 hover:text-white'
                )}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon size={40} className="text-orange-400" />}
          title={filter === 'mine' ? 'No activity from you yet' : 'No activity yet'}
          description={
            filter === 'mine'
              ? 'Log a habit and it will appear here.'
              : 'Add friends to see their progress — yours shows up too.'
          }
          action={
            <Link href="/friends">
              <span className="text-orange-400 hover:underline text-sm">Find Friends</span>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visibleItems.map((item, i) => (
              <FeedCard
                key={item.id}
                item={item}
                index={i}
                isMine={item.actorId === user?.uid}
                cosm={actorCosm[item.actorId] || {}}
                sharedReactions={sharedReactions}
                currentUid={user?.uid}
                onReact={handleReaction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ---- Feed card — premium gradient stripe, bigger message, refined reactions ----

interface FeedCardProps {
  item: FeedItem;
  index: number;
  isMine: boolean;
  cosm: ActorCosm;
  sharedReactions: Record<string, Record<string, string[]>>;
  currentUid?: string;
  onReact: (originId: string | undefined, itemId: string, emoji: ReactionEmoji, actorId?: string) => void;
}

function FeedCard({ item, index, isMine, cosm, sharedReactions, currentUid, onReact }: FeedCardProps) {
  const resolvedCat = item.categorySlug
    ? getCategoryBySlug(item.categorySlug)
    : item.categoryName
      ? getCategoryByName(item.categoryName)
      : undefined;
  const color = item.categoryColor || resolvedCat?.color || '#f97316';
  const originId = (item as unknown as Record<string, unknown>).originId as string | undefined;
  const sharedR = originId ? sharedReactions[originId] : null;
  const reactionsData = sharedR || item.reactions || {};
  const totalReactions = Object.values(reactionsData as Record<string, string[]>)
    .reduce((n, arr) => n + (arr?.length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border transition-all"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, #10101a 40%, #0b0b14 100%)`,
        borderColor: `${color}2a`,
        boxShadow: `inset 0 1px 0 ${color}20, 0 6px 22px -14px ${color}44`,
      }}
    >
      {/* Category-color accent stripe on left edge */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${color}, ${color}40 70%, transparent)`,
          boxShadow: `0 0 12px ${color}aa`,
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{ background: color }}
      />

      <div className="relative p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${item.actorUsername}`}>
            <FramedAvatar src={item.actorAvatar} alt={item.actorUsername} size="md" frameId={cosm.frame} />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${item.actorUsername}`} className="flex items-center gap-1.5 min-w-0">
              <span className="min-w-0 truncate">
                <NamePlate name={item.actorUsername} effectId={cosm.name} size="sm" className="hover:text-orange-400" />
              </span>
              {cosm.tier !== undefined && (
                <MiniOrb
                  tier={cosm.tier}
                  baseColorId={cosm.baseColor}
                  pulseColorId={cosm.pulseColor}
                  ringColorId={cosm.ringColor}
                  size={18}
                />
              )}
              {isMine && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/15 border border-orange-500/35 px-1.5 py-0.5 rounded">
                  You
                </span>
              )}
            </Link>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
              {resolvedCat?.name && (
                <>
                  <span className="mx-1.5 text-slate-700">·</span>
                  <span style={{ color }}>{resolvedCat.name}</span>
                </>
              )}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color}22, #0b0b14)`,
              border: `1px solid ${color}40`,
              boxShadow: `0 0 12px -4px ${color}66`,
            }}
          >
            <CategoryIcon
              slug={item.categorySlug}
              name={item.categoryName}
              icon={item.categoryIcon || ''}
              color={color}
              size="sm"
            />
          </div>
        </div>

        {/* Message + verified */}
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-sm text-slate-200 flex-1 min-w-0 leading-snug">
            {highlightValue(item.message, color)}
          </p>
          {item.verified && <VerifiedBadge />}
        </div>

        {/* Proof photo */}
        {item.proofImageUrl && (
          <ProofImage src={item.proofImageUrl} alt={`${item.actorUsername}'s proof`} />
        )}

        {/* Reactions — sleek chip bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {REACTIONS.map(({ emoji, label, color: rColor }) => {
            const emojiUsers = (reactionsData as Record<string, string[]>)[emoji] || [];
            const reacted = emojiUsers.includes(currentUid || '');
            const count = emojiUsers.length;
            return (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.88 }}
                onClick={() => item.id && onReact(originId, item.id, emoji, item.actorId)}
                title={label}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border',
                  reacted
                    ? 'border-[color:var(--r-color)]'
                    : 'border-[#1e1e30] hover:border-[color:var(--r-color)]/50',
                )}
                style={{
                  ['--r-color' as string]: rColor,
                  background: reacted ? `${rColor}22` : '#0b0b14',
                  boxShadow: reacted ? `0 0 10px -2px ${rColor}66, inset 0 1px 0 ${rColor}22` : undefined,
                } as React.CSSProperties}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 0 && (
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: reacted ? rColor : '#94a3b8' }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
          {totalReactions > 0 && (
            <span className="text-[10px] text-slate-600 font-mono ml-auto">
              {totalReactions} reaction{totalReactions === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Comments */}
        {originId && <FeedComments originId={originId} actorId={item.actorId} />}
      </div>
    </motion.div>
  );
}

// Highlight the numeric value in messages like "jovan logged 20 commits of ..."
// by wrapping the first number in a colored span. Purely visual — falls back
// cleanly if no number is found.
function highlightValue(message: string, color: string) {
  const match = message.match(/\b(\d+(?:[.,]\d+)?)\b/);
  if (!match || match.index === undefined) return message;
  const before = message.slice(0, match.index);
  const num = match[1];
  const after = message.slice(match.index + num.length);
  return (
    <>
      {before}
      <span
        className="font-mono font-bold"
        style={{ color, textShadow: `0 0 8px ${color}44` }}
      >
        {num}
      </span>
      {after}
    </>
  );
}
