'use client';

import { motion } from 'framer-motion';
import { getXPProgress, getLevelForXP, getNextLevel } from '@/constants/levels';

interface XPProgressBarProps {
  totalXP: number;
  showLabel?: boolean;
}

/**
 * Editorial Direction B v2 XP bar. Track is the rule colour, fill is
 * accent ink — flat, no gradient, no glow. Labels are mono tabular.
 */
export function XPProgressBar({ totalXP, showLabel = true }: XPProgressBarProps) {
  const xp = getXPProgress(totalXP);
  const level = getLevelForXP(totalXP);
  const next = getNextLevel(level.level);

  return (
    <div style={{ width: '100%' }}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            className="font-body"
            style={{ fontSize: 11, color: 'var(--b-ink-60)' }}
          >
            <span className="font-mono tabular">Lv.{level.level}</span>{' '}
            <em
              className="font-display"
              style={{ fontStyle: 'italic', color: 'var(--b-ink)' }}
            >
              {level.title}
            </em>
          </span>
          {next && (
            <span
              className="font-mono tabular"
              style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
            >
              {xp.current}/{xp.needed} XP
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: 2,
          background: 'var(--b-rule)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          style={{ height: '100%', background: 'var(--b-accent)' }}
          initial={{ width: 0 }}
          animate={{ width: `${xp.percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      {next && showLabel && (
        <p
          className="font-body"
          style={{ fontSize: 10, color: 'var(--b-ink-40)', marginTop: 4 }}
        >
          Next: Lv.{next.level} {next.title}
        </p>
      )}
    </div>
  );
}
