'use client';

import { motion } from 'framer-motion';
import { isPillarSlug, PillarSlug } from '@/constants/pillars';
import { getTodaysTip } from '@/constants/pillarTips';

interface Props {
  slug: string;
  /** Hex color of the pillar — used for the left-edge accent. */
  color: string;
}

/**
 * Daily rotating tip for a pillar habit. Same tip for everyone on the
 * same calendar day; rotation indexes via day-of-year. Renders nothing
 * for non-pillar slugs.
 *
 * Editorial Direction B v2 — paper background, hairline border, left
 * accent stripe in the pillar's category color (water blue / sleep
 * indigo / etc.). Eyebrow uses .spread, title is font-display italic.
 */
export function PillarTip({ slug, color }: Props) {
  if (!isPillarSlug(slug)) return null;
  const tip = getTodaysTip(slug as PillarSlug);
  if (!tip.title) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--b-paper)',
        border: '1px solid var(--b-rule)',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ padding: 16 }}>
        <p
          className="spread"
          style={{ fontSize: 9, color, marginBottom: 6 }}
        >
          Tip of the day
        </p>
        <p
          className="font-display"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.25,
            color: 'var(--b-ink)',
          }}
        >
          {tip.title}
        </p>
        <p
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--b-ink-60)',
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {tip.body}
        </p>
        {tip.source && (
          <p
            className="font-body tabular"
            style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 8 }}
          >
            — {tip.source}
          </p>
        )}
      </div>
    </motion.div>
  );
}
