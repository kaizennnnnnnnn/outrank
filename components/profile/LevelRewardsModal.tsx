'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEVEL_REWARDS, LevelReward } from '@/constants/levelRewards';
import { LEVELS } from '@/constants/levels';

function xpForLevel(lv: number): number {
  const found = LEVELS.find((l) => l.level === lv);
  return found?.xpRequired ?? 0;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  currentXP: number;
}

const tierColor: Record<LevelReward['tier'], string> = {
  minor:    'var(--b-ink-60)',
  medium:   'var(--b-ink)',
  major:    'var(--b-accent)',
  capstone: 'var(--b-accent)',
};

const tierLabel: Record<LevelReward['tier'], string> = {
  minor:    'Tick',
  medium:   'Milestone',
  major:    'Major',
  capstone: 'Capstone',
};

/**
 * Editorial Direction B v2 level rewards modal. Italic Fraunces title;
 * level rows are a hairline ledger with mono numerals on the left and
 * a tier eyebrow + reward sentence on the right. The current level row
 * gets a 2px ink left rule and a small "Current" cap.
 */
export function LevelRewardsModal({ isOpen, onClose, currentLevel, currentXP }: Props) {
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const xpInLevel = Math.max(0, currentXP - currentLevelXP);
  const xpNeeded = Math.max(1, nextLevelXP - currentLevelXP);
  const progress = nextLevelXP > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1;

  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [animatedXP, setAnimatedXP] = useState(0);
  useEffect(() => {
    if (!isOpen) { setAnimatedProgress(0); setAnimatedXP(0); return; }
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setAnimatedProgress(progress * eased);
      setAnimatedXP(Math.round(xpInLevel * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, progress, xpInLevel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="dir-b"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 190,
            background: 'rgba(20, 18, 14, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 540,
              maxHeight: '85vh',
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              border: '1px solid var(--b-ink)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--b-ink)' }}>
              <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
                Level Progression
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
                <div>
                  <p
                    className="font-display tabular"
                    style={{
                      fontSize: 36,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    Level {currentLevel}
                  </p>
                  <p
                    className="font-mono tabular"
                    style={{ fontSize: 10, color: 'var(--b-ink-60)', marginTop: 4 }}
                  >
                    {currentXP.toLocaleString()} XP TOTAL
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="spread"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 9,
                    color: 'var(--b-ink-60)',
                  }}
                >
                  Close
                </button>
              </div>

              {/* Animated progress bar */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span
                    className="font-body"
                    style={{ fontSize: 10, color: 'var(--b-ink-60)' }}
                  >
                    Progress to Level {currentLevel + 1}
                  </span>
                  <span
                    className="font-mono tabular"
                    style={{ fontSize: 10, color: 'var(--b-ink-40)' }}
                  >
                    {animatedXP.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                  </span>
                </div>
                <div style={{ height: 2, background: 'var(--b-rule)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(2, animatedProgress * 100)}%`,
                      height: '100%',
                      background: 'var(--b-accent)',
                      transition: 'width 40ms linear',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 14px' }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {LEVEL_REWARDS.map((r) => {
                  const xpAt = xpForLevel(r.level);
                  const isPast = r.level <= currentLevel;
                  const isCurrent = r.level === currentLevel;
                  const isNext = r.level === currentLevel + 1;
                  const color = tierColor[r.tier];
                  return (
                    <li
                      key={r.level}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '46px 1fr auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: '1px solid var(--b-rule)',
                        borderLeft: isCurrent ? '2px solid var(--b-accent)' : '2px solid transparent',
                        paddingLeft: isCurrent ? 10 : 0,
                        opacity: isPast || isCurrent || isNext ? 1 : 0.55,
                      }}
                    >
                      <span
                        className="font-display tabular"
                        style={{
                          fontSize: 24,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          color: isPast ? 'var(--b-ink)' : 'var(--b-ink-40)',
                          textAlign: 'right',
                        }}
                      >
                        {r.level}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            className="spread"
                            style={{ fontSize: 9, color }}
                          >
                            {tierLabel[r.tier]}
                          </span>
                          <span
                            className="font-mono tabular"
                            style={{ fontSize: 9, color: 'var(--b-ink-40)' }}
                          >
                            {xpAt.toLocaleString()} XP
                          </span>
                        </div>
                        <p
                          className="font-body"
                          style={{
                            fontSize: 13,
                            color: 'var(--b-ink)',
                            margin: '3px 0 0',
                            lineHeight: 1.4,
                          }}
                        >
                          +{r.fragments} fragments
                          {r.extra && (
                            <span style={{ color: 'var(--b-ink-60)' }}> · {r.extra}</span>
                          )}
                        </p>
                      </div>
                      <span
                        className="spread"
                        style={{
                          fontSize: 8,
                          color: isCurrent ? 'var(--b-accent)' : 'var(--b-ink-40)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isCurrent ? 'Current' : isPast ? 'Claimed' : isNext ? 'Next' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* After 50 — prestige */}
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 14px',
                  borderTop: '2px solid var(--b-ink)',
                  borderBottom: '1px solid var(--b-ink)',
                  textAlign: 'center',
                }}
              >
                <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
                  After Level 50
                </div>
                <p
                  className="font-display"
                  style={{
                    fontSize: 18,
                    fontStyle: 'italic',
                    fontWeight: 500,
                    margin: '4px 0 4px',
                  }}
                >
                  Prestige unlocks.
                </p>
                <p
                  className="font-body"
                  style={{ fontSize: 11, color: 'var(--b-ink-60)', margin: 0, lineHeight: 1.5 }}
                >
                  Reset to Level 1 with a permanent +1% XP multiplier per ascension.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
