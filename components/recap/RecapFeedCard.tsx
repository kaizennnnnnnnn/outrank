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
 * Design rationale:
 *   - **Photo leads.** When a hero proof exists, it bleeds edge-to-edge.
 *   - **Single accent.** Slate typography + one warm-orange accent for
 *     active states and the View Day CTA.
 *   - **Stat-tile grid.** Up to 3 pillar tiles with a label/value
 *     hierarchy — reads as a stat block, not scattered inline text.
 *   - **Visible CTA.** A pill-style "View day" button on the bottom
 *     right makes the affordance obvious; the whole card is also
 *     tappable, but the button is the explicit visual cue.
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
            className="w-full max-h-72 object-cover"
          />
        </div>
      )}

      {/* Pillar grid — up to 3 structured stat tiles with clear
          label/value hierarchy. Reads as a stat block, not as scattered
          inline text. */}
      {item.topCategories.length > 0 && (() => {
        const visible = item.topCategories.slice(0, 3);
        const colCount = visible.length === 1 ? 'grid-cols-1' : visible.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
        return (
          <div className={cn('px-4 pt-3 grid gap-1.5', colCount)}>
            {visible.map((c) => (
              <div
                key={c.slug}
                className="rounded-lg bg-white/[0.025] border border-white/[0.05] px-2.5 py-2 min-w-0"
              >
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-medium truncate">
                  {c.name}
                </p>
                <p className="font-mono tabular-nums text-[15px] font-bold text-white mt-1 leading-none truncate">
                  {c.value}
                  {c.unit && (
                    <span className="text-slate-500 text-[10px] font-normal ml-0.5">
                      {c.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Footer row — meta info on the left, prominent View Day pill on
          the right. The pill is the visible affordance that the card
          opens a detail view. */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500 font-mono tabular-nums truncate">
          {item.logCount} log{item.logCount === 1 ? '' : 's'}
          {item.proofCount > 0 && ` · ${item.proofCount} photo${item.proofCount === 1 ? '' : 's'}`}
          {item.topCategories.length > 3 && ` · +${item.topCategories.length - 3} more`}
        </p>
        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 text-[11px] font-semibold text-orange-400 transition-colors flex-shrink-0"
        >
          View day
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Hairline + reactions */}
      <div className="border-t border-white/[0.04]">
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
