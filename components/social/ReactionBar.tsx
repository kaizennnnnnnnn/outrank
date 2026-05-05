'use client';

import { motion } from 'framer-motion';
import { ReactionEmoji } from '@/types/feed';
import {
  BFlameGlyph, BTrophyGlyph, BCheerGlyph, BCheckGlyph, BHeartGlyph,
} from '@/components/editorial/BGlyphs';

/**
 * Editorial Direction B v2 reaction strip — same vocabulary as the
 * ReactionStrip on the feed page. The data layer still keys on the
 * legacy emoji strings (the Firestore documents and Cloud Function
 * fan-outs use them), but the chrome is glyph-and-label only — no
 * emoji rendered on screen.
 */
const REACTIONS: { kind: ReactionEmoji; label: string; Glyph: React.ComponentType<{ size?: number }>; color: string }[] = [
  { kind: '🔥', label: 'Hyped',   Glyph: BFlameGlyph,  color: '#f97316' },
  { kind: '💪', label: 'Beast',   Glyph: BTrophyGlyph, color: '#ef4444' },
  { kind: '👏', label: 'Respect', Glyph: BCheerGlyph,  color: '#fbbf24' },
  { kind: '⚡', label: 'Fast',    Glyph: BCheckGlyph,  color: '#a855f7' },
  { kind: '🤝', label: 'With',    Glyph: BHeartGlyph,  color: '#22d3ee' },
];

interface ReactionBarProps {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onReact: (emoji: string) => void;
}

export function ReactionBar({ reactions, currentUserId, onReact }: ReactionBarProps) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {REACTIONS.map(({ kind, label, Glyph, color }) => {
        const users = reactions[kind] || [];
        const reacted = users.includes(currentUserId);
        const count = users.length;

        return (
          <motion.button
            key={kind}
            whileTap={{ scale: 0.94 }}
            onClick={() => onReact(kind)}
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
    </div>
  );
}
