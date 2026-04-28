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
 */
export function PillarTip({ slug, color }: Props) {
  if (!isPillarSlug(slug)) return null;
  const tip = getTodaysTip(slug as PillarSlug);
  if (!tip.title) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${color}10 0%, rgba(11,11,20,0.7) 70%)`,
        borderLeft: `2px solid ${color}`,
      }}
    >
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color }}>
          Tip of the day
        </p>
        <p className="text-sm font-bold text-white leading-snug">{tip.title}</p>
        <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">{tip.body}</p>
        {tip.source && (
          <p className="text-[10px] font-mono text-slate-600 mt-2">— {tip.source}</p>
        )}
      </div>
    </motion.div>
  );
}
