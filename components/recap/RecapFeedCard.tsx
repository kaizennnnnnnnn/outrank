'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { ReactionEmoji } from '@/types/feed';
import { RecapFeedItem } from '@/types/recap';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import { MiniOrb } from '@/components/profile/MiniOrb';

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

const REACTIONS: { emoji: ReactionEmoji; label: string; color: string }[] = [
  { emoji: '🔥', label: 'Hyped', color: '#f97316' },
  { emoji: '💪', label: 'Beast', color: '#ef4444' },
  { emoji: '👏', label: 'Respect', color: '#fbbf24' },
  { emoji: '⚡', label: 'Fast', color: '#a855f7' },
  { emoji: '🤝', label: 'With you', color: '#22d3ee' },
];

/**
 * One feed item per published Recap. Replaces per-log fan-out — friends
 * see one curated card per day, tap through to the full detail view
 * for photos / proofs / commentary.
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
  const heroColor = item.topCategories[0]?.color || '#f97316';
  const reactionsData = sharedReactions[item.originId] || item.reactions || {};
  const totalReactions = Object.values(reactionsData as Record<string, string[]>).reduce(
    (n, arr) => n + (arr?.length || 0),
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: `linear-gradient(135deg, ${heroColor}10 0%, #10101a 40%, #0b0b14 100%)`,
        borderColor: `${heroColor}2a`,
        boxShadow: `inset 0 1px 0 ${heroColor}20, 0 6px 22px -14px ${heroColor}44`,
      }}
    >
      {/* Left edge accent */}
      <div
        className="absolute top-0 left-0 bottom-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${heroColor}, ${heroColor}40 70%, transparent)`,
          boxShadow: `0 0 12px ${heroColor}aa`,
        }}
      />

      <div className="relative p-4 space-y-3">
        {/* Header */}
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
              <span className="mx-1.5 text-slate-700">·</span>
              <span className="text-orange-400 font-bold uppercase tracking-widest text-[10px]">Daily Record</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-xl font-bold leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
                +{item.totalXP}
              </span>
              <span className="text-slate-500 text-[10px] font-mono ml-1">XP</span>
            </p>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              {item.logCount} log{item.logCount === 1 ? '' : 's'}
              {item.proofCount > 0 && ` · ${item.proofCount} 📸`}
            </p>
          </div>
        </div>

        {/* Hero image */}
        {item.heroProofUrl && (
          <Link
            href={`/recap/${item.actorId}/${item.recapDate}`}
            className="block rounded-xl overflow-hidden border border-[#1e1e30] hover:border-orange-500/40 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.heroProofUrl}
              alt={`${item.actorUsername}'s day`}
              loading="lazy"
              className="w-full max-h-72 object-cover"
            />
          </Link>
        )}

        {/* Top categories */}
        {item.topCategories.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.topCategories.map((c) => (
              <span
                key={c.slug}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-mono"
                style={{
                  background: `${c.color}12`,
                  border: `1px solid ${c.color}28`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: c.color, boxShadow: `0 0 4px ${c.color}` }}
                />
                <span style={{ color: c.color }} className="font-bold">{c.name}</span>
                <span className="text-slate-500">
                  {c.value}{c.unit}
                </span>
              </span>
            ))}
            {item.logCount > item.topCategories.length && (
              <span className="text-[10px] font-mono text-slate-500">
                +{item.logCount - item.topCategories.length} more
              </span>
            )}
          </div>
        )}

        {/* Reactions + open link */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {REACTIONS.map(({ emoji, label, color: rColor }) => {
            const emojiUsers = (reactionsData as Record<string, string[]>)[emoji] || [];
            const reacted = emojiUsers.includes(currentUid || '');
            const count = emojiUsers.length;
            return (
              <motion.button
                key={emoji}
                whileTap={{ scale: 0.88 }}
                onClick={() => item.id && onReact(item.originId, item.id, emoji, item.actorId)}
                title={label}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border',
                  reacted ? 'border-[color:var(--r-color)]' : 'border-[#1e1e30] hover:border-[color:var(--r-color)]/50',
                )}
                style={{
                  ['--r-color' as string]: rColor,
                  background: reacted ? `${rColor}22` : '#0b0b14',
                  boxShadow: reacted ? `0 0 10px -2px ${rColor}66, inset 0 1px 0 ${rColor}22` : undefined,
                } as React.CSSProperties}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 0 && (
                  <span className="font-mono text-[11px] font-bold" style={{ color: reacted ? rColor : '#94a3b8' }}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
          <Link
            href={`/recap/${item.actorId}/${item.recapDate}`}
            className="ml-auto text-[11px] font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300"
          >
            Open day →
          </Link>
        </div>

        {totalReactions > 0 && (
          <p className="text-[10px] text-slate-600 font-mono">
            {totalReactions} reaction{totalReactions === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </motion.div>
  );
}
