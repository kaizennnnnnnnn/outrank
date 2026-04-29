'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { ReactionEmoji } from '@/types/feed';
import { RecapFeedItem } from '@/types/recap';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';

interface ActorCosm {
  frame?: string;
  name?: string;
  tier?: number;
  baseColor?: string;
  pulseColor?: string;
  ringColor?: string;
}

interface RecapFeedCardProps {
  item: RecapFeedItem;
  index: number;
  isMine: boolean;
  cosm: ActorCosm;
  sharedReactions: Record<string, Record<string, string[]>>;
  currentUid?: string;
  onReact: (originId: string | undefined, itemId: string, emoji: ReactionEmoji, actorId?: string) => void;
}

const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '🔥', label: 'Hyped' },
  { emoji: '💪', label: 'Beast' },
  { emoji: '👏', label: 'Respect' },
  { emoji: '⚡', label: 'Fast' },
  { emoji: '🤝', label: 'With you' },
];

/**
 * Premium-aesthetic recap feed card.
 *
 * Design rationale (after the v1 screenshot read as cheap):
 *   - **Photo leads.** When a hero proof exists, it bleeds edge-to-edge
 *     and dominates the card. The card chrome dissolves around it.
 *   - **One accent color.** No more rainbow per-pillar chips. Stats and
 *     categories are slate typography with a single warm-orange accent
 *     reserved for active state and the actor's identity.
 *   - **Type does the structure.** No glowing borders, no gradient
 *     fills, no left-edge accents. Hairlines and weight contrast.
 *   - **Whole-card tap.** Card is wrapped in a Link to the detail
 *     view; the redundant "Open day →" CTA is gone. Reactions are
 *     event.stopPropagation'd so they don't navigate.
 *
 * Inspirations: Strava (photo as hero), Whoop (single accent), Linear
 * (monospace numbers, hairlines).
 */
export function RecapFeedCard({
  item,
  index,
  isMine,
  cosm,
  sharedReactions,
  currentUid,
  onReact,
}: RecapFeedCardProps) {
  const router = useRouter();
  const reactionsData = sharedReactions[item.originId] || item.reactions || {};
  const totalReactions = Object.values(reactionsData as Record<string, string[]>).reduce(
    (n, arr) => n + (arr?.length || 0),
    0,
  );
  const detailHref = `/recap/${item.actorId}/${item.recapDate}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.25 }}
      className="relative overflow-hidden rounded-2xl bg-[#0c0c14] border border-white/[0.05] hover:border-white/[0.10] transition-colors cursor-pointer"
      onClick={() => router.push(detailHref)}
    >
      {/* Header — quiet, lives above the photo */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link
          href={`/profile/${item.actorUsername}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0"
        >
          <FramedAvatar src={item.actorAvatar} alt={item.actorUsername} size="sm" frameId={cosm.frame} />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${item.actorUsername}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 min-w-0"
          >
            <NamePlate
              name={item.actorUsername}
              effectId={cosm.name}
              size="sm"
              className="hover:text-white"
            />
            {isMine && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
                You
              </span>
            )}
          </Link>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
          </p>
        </div>

        {/* Right side: tight XP number, no gradient text */}
        <div className="text-right shrink-0">
          <p className="font-mono text-base font-semibold text-white tabular-nums leading-none">
            +{item.totalXP}
            <span className="text-slate-600 text-[10px] font-normal ml-1">XP</span>
          </p>
        </div>
      </header>

      {/* Hero photo — edge-to-edge bleed when present */}
      {item.heroProofUrl && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.heroProofUrl}
            alt=""
            loading="lazy"
            className="w-full max-h-80 object-cover"
          />
        </div>
      )}

      {/* Pillar strip — clean inline list, no per-chip color, monospace
          numbers. The information density is the same; the visual
          density drops dramatically. */}
      {item.topCategories.length > 0 && (
        <div className="px-4 pt-3 pb-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-[12px]">
          {item.topCategories.map((c, i) => (
            <span key={c.slug} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-700">·</span>}
              <span className="text-slate-400">{c.name}</span>
              <span className="font-mono tabular-nums text-slate-200">
                {c.value}{c.unit}
              </span>
            </span>
          ))}
          {item.logCount > item.topCategories.length && (
            <span className="text-slate-600 text-[11px]">
              +{item.logCount - item.topCategories.length} more
            </span>
          )}
        </div>
      )}

      {/* Meta — log count + photos. One quiet line. */}
      <p className="px-4 pt-1 text-[11px] text-slate-600 font-mono tabular-nums">
        {item.logCount} log{item.logCount === 1 ? '' : 's'}
        {item.proofCount > 0 && ` · ${item.proofCount} photo${item.proofCount === 1 ? '' : 's'}`}
      </p>

      {/* Hairline + reactions */}
      <div className="mt-3 border-t border-white/[0.04]">
        <div className="px-3 py-2 flex items-center gap-1">
          {REACTIONS.map(({ emoji, label }) => {
            const emojiUsers = (reactionsData as Record<string, string[]>)[emoji] || [];
            const reacted = emojiUsers.includes(currentUid || '');
            const count = emojiUsers.length;
            return (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id) onReact(item.originId, item.id, emoji, item.actorId);
                }}
                title={label}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[12px] transition-colors',
                  reacted
                    ? 'bg-white/[0.08] text-white'
                    : 'text-slate-500 hover:text-white hover:bg-white/[0.04]',
                )}
              >
                <span className="text-[13px] leading-none">{emoji}</span>
                {count > 0 && (
                  <span className="font-mono tabular-nums text-[11px] text-slate-400">
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}

          {totalReactions > 0 && (
            <span className="ml-auto text-[10px] text-slate-600 font-mono tabular-nums pr-1">
              {totalReactions}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
