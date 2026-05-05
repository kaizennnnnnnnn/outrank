'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { formatRelativeTime } from '@/lib/utils';
import { ReactionEmoji } from '@/types/feed';
import { RecapFeedItem } from '@/types/recap';
import { FramedAvatar } from '@/components/profile/FramedAvatar';
import { NamePlate } from '@/components/profile/NamePlate';
import {
  BFlameGlyph, BTrophyGlyph, BCheerGlyph, BCheckGlyph, BHeartGlyph,
} from '@/components/editorial/BGlyphs';

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

const REACTIONS: { kind: ReactionEmoji; label: string; Glyph: React.ComponentType<{ size?: number }>; color: string }[] = [
  { kind: '🔥', label: 'Hyped',   Glyph: BFlameGlyph,  color: '#f97316' },
  { kind: '💪', label: 'Beast',   Glyph: BTrophyGlyph, color: '#ef4444' },
  { kind: '👏', label: 'Respect', Glyph: BCheerGlyph,  color: '#fbbf24' },
  { kind: '⚡', label: 'Fast',    Glyph: BCheckGlyph,  color: '#a855f7' },
  { kind: '🤝', label: 'With',    Glyph: BHeartGlyph,  color: '#22d3ee' },
];

/**
 * Editorial Direction B v2 recap feed card. Hero proof image still
 * bleeds full-width — that's the photo content, not chrome — but the
 * surrounding paper is hairline-bordered, italic Fraunces ledger.
 *
 * The reaction strip mirrors the feed page's ReactionStrip exactly:
 * named glyph buttons, no rendered emoji.
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
      onClick={() => router.push(detailHref)}
      style={{
        position: 'relative',
        background: 'transparent',
        borderTop: '1px solid var(--b-ink)',
        borderBottom: '1px solid var(--b-rule)',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 0' }}>
        <Link
          href={`/profile/${item.actorUsername}`}
          onClick={(e) => e.stopPropagation()}
          style={{ flexShrink: 0 }}
        >
          <FramedAvatar src={item.actorAvatar} alt={item.actorUsername} size="sm" frameId={cosm.frame} />
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/profile/${item.actorUsername}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <NamePlate
              name={item.actorUsername}
              effectId={cosm.name}
              size="sm"
            />
            {isMine && (
              <span
                className="spread"
                style={{ fontSize: 8, color: 'var(--b-accent)' }}
              >
                You
              </span>
            )}
          </Link>
          <p
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--b-ink-40)', margin: '2px 0 0', letterSpacing: '0.04em' }}
          >
            {item.createdAt?.toDate ? formatRelativeTime(item.createdAt.toDate()) : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p
            className="font-display tabular"
            style={{
              fontSize: 22,
              fontStyle: 'italic',
              fontWeight: 500,
              lineHeight: 1,
              color: 'var(--b-ink)',
              margin: 0,
            }}
          >
            +{item.totalXP}
            <span
              className="font-mono"
              style={{ fontStyle: 'normal', fontSize: 10, color: 'var(--b-ink-40)', marginLeft: 4 }}
            >
              XP
            </span>
          </p>
        </div>
      </header>

      {/* Hero photo — full-bleed when present */}
      {item.heroProofUrl && (
        <div style={{ marginTop: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.heroProofUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', maxHeight: 288, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Pillar grid — up to 3 hairline stat tiles */}
      {item.topCategories.length > 0 && (() => {
        const visible = item.topCategories.slice(0, 3);
        return (
          <div
            style={{
              padding: '12px 14px 0',
              display: 'grid',
              gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))`,
              gap: 6,
            }}
          >
            {visible.map((c) => (
              <div
                key={c.slug}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--b-rule)',
                  minWidth: 0,
                }}
              >
                <p
                  className="spread"
                  style={{
                    fontSize: 8,
                    color: 'var(--b-ink-60)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.name}
                </p>
                <p
                  className="font-display tabular"
                  style={{
                    fontSize: 16,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    color: 'var(--b-ink)',
                    margin: '4px 0 0',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {c.value}
                  {c.unit && (
                    <span
                      className="font-mono"
                      style={{ fontStyle: 'normal', fontSize: 10, color: 'var(--b-ink-60)', marginLeft: 2 }}
                    >
                      {c.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Footer row */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <p
          className="font-mono tabular"
          style={{
            fontSize: 10,
            color: 'var(--b-ink-60)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.logCount} log{item.logCount === 1 ? '' : 's'}
          {item.proofCount > 0 && ` · ${item.proofCount} photo${item.proofCount === 1 ? '' : 's'}`}
          {item.topCategories.length > 3 && ` · +${item.topCategories.length - 3} more`}
        </p>
        <Link
          href={detailHref}
          onClick={(e) => e.stopPropagation()}
          className="spread"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            background: 'var(--b-ink)',
            color: 'var(--b-paper)',
            fontSize: 9,
            fontWeight: 700,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          View day →
        </Link>
      </div>

      {/* Reactions */}
      <div style={{ borderTop: '1px solid var(--b-rule)', padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {REACTIONS.map(({ kind, label, Glyph, color }) => {
            const list = (reactionsData as Record<string, string[]>)[kind] ?? [];
            const reacted = !!currentUid && list.includes(currentUid);
            const count = list.length;
            return (
              <motion.button
                key={kind}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id) onReact(item.originId, item.id, kind, item.actorId);
                }}
                title={label}
                className="font-body"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  background: reacted ? `${color}14` : 'transparent',
                  border: reacted ? `1px solid ${color}` : '1px solid var(--b-rule)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: reacted ? color : 'var(--b-ink-60)',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ color, display: 'inline-flex' }}>
                  <Glyph size={12} />
                </span>
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className="font-mono tabular"
                    style={{ fontSize: 9, color: reacted ? color : 'var(--b-ink-40)', marginLeft: 2 }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}

          {totalReactions > 0 && (
            <span
              className="font-mono tabular"
              style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--b-ink-40)' }}
            >
              {totalReactions}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
