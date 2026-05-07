'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firestore';
import { increment, Timestamp } from 'firebase/firestore';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';
import { rollChestReward, RARITY_CONFIG, LOOT_POOL, ChestRarity, ChestReward } from '@/constants/chestLoot';

type Phase = 'idle' | 'unfolding' | 'reveal';

/**
 * Daily reward — Front Page edition. Replaces the wooden chest with a
 * miniature editorial newspaper that unfolds to reveal the day's
 * dispatch. Animation:
 *   idle       — folded paper, masthead peeking; "READ TODAY'S EDITION"
 *   unfolding  — paper unfolds top-down on a perspective hinge (~900ms)
 *   reveal     — full front page rendered; headline, hero, byline
 *
 * Preview mode: visit any /(app) page with ?previewChest=1 to summon
 * the modal with a fake random reward (no Firestore write). Useful
 * for design review and replays without burning the real daily roll.
 */
export function DailyLoginChest() {
  const { user } = useAuth();
  const params = useSearchParams();
  const previewMode = params?.get('previewChest') === '1';

  const [state, setState] = useState<{ day: number; reward: ChestReward } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    // Preview path — bypass gating + Firestore writes, fabricate a
    // random reward across all rarities so the user can see the
    // animation on demand without consuming their real daily.
    if (previewMode) {
      const allRewards = Object.values(LOOT_POOL).flat();
      const reward = allRewards[Math.floor(Math.random() * allRewards.length)];
      setState({ day: 7, reward });
      return;
    }

    if (!user) return;
    const userData = user as unknown as Record<string, unknown>;

    const lastClaimRaw = userData.lastLoginClaimAt as { toDate?: () => Date } | Date | undefined;
    const lastClaim = lastClaimRaw
      ? (lastClaimRaw instanceof Date ? lastClaimRaw : lastClaimRaw.toDate?.() ?? null)
      : null;
    const currentStreak = (userData.loginStreak as number) || 0;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const lastDay = lastClaim ? new Date(lastClaim) : null;
    if (lastDay) lastDay.setHours(0, 0, 0, 0);

    const gap = lastDay
      ? Math.round((today.getTime() - lastDay.getTime()) / 86_400_000)
      : Number.POSITIVE_INFINITY;

    if (gap === 0) return;

    const newStreak = gap === 1 ? currentStreak + 1 : 1;
    const reward = rollChestReward(newStreak);

    (async () => {
      try {
        const currentAwakening = ((userData.awakening as number) || 0);
        const nextAwakening = Math.min(100, currentAwakening + 3);

        const payload: Record<string, unknown> = {
          lastLoginClaimAt: Timestamp.now(),
          loginStreak: newStreak,
          awakening: nextAwakening,
        };
        if (reward.fragments) payload.fragments = increment(reward.fragments);
        if (reward.evolutions) payload.orbEvolutionCharges = increment(reward.evolutions);
        if (reward.xp) {
          payload.totalXP = increment(reward.xp);
          payload.weeklyXP = increment(reward.xp);
          payload.monthlyXP = increment(reward.xp);
          payload.seasonPassXP = increment(reward.xp);
        }
        if (reward.xpBoost) payload.xpBoostActivatedAt = Timestamp.now();
        if (reward.streakFreeze) payload.streakFreezeTokens = increment(1);
        await updateDocument('users', user.uid, payload);
        setState({ day: newStreak, reward });
      } catch {
        // Silent — if the write fails we skip the chest until tomorrow
      }
    })();
  }, [user, previewMode]);

  // Open the paper. The unfold runs as a CSS-driven framer transition,
  // we just gate the phase changes here. Total ~1.1s before the user
  // can dismiss / replay.
  const open = () => {
    if (phase !== 'idle' || !state) return;
    setPhase('unfolding');
    haptic('tap');

    setTimeout(() => {
      setPhase('reveal');
      setBurst((n) => n + 1);
      if (state.reward.rarity === 'epic' || state.reward.rarity === 'legendary') {
        haptic('double');
      } else {
        haptic('success');
      }
    }, 1100);
  };

  // Replay — go back to idle so the user can re-trigger the unfold.
  // Same modal session, same reward, just re-runs the visual.
  const replay = () => {
    if (phase !== 'reveal') return;
    setPhase('idle');
  };

  const dismiss = () => {
    setState(null);
    setPhase('idle');
  };

  if (!state) return null;

  const { reward, day } = state;
  const rc = RARITY_CONFIG[reward.rarity];
  const particleColor = rc.color;
  const particleCount =
    reward.rarity === 'legendary' ? 220 :
    reward.rarity === 'epic'      ? 160 :
    reward.rarity === 'rare'      ? 110 :
    reward.rarity === 'uncommon'  ?  80 :
                                     60;

  const dateLabel = new Date().toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <>
      <ParticleBurst trigger={burst} color={particleColor} count={particleCount} />
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dir-b"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 170,
              background: 'rgba(0,0,0,0.78)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              overflowY: 'auto',
            }}
            onClick={phase === 'reveal' ? dismiss : undefined}
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 380,
              }}
            >
              {/* The paper — unfolds top-down. Perspective parent gives
                  the rotateX a real hinge feel. The motion.div below it
                  is the actual paper; its transformOrigin is 'top
                  center' so it pivots from the masthead edge. */}
              <div style={{ perspective: 1200, perspectiveOrigin: '50% 0%' }}>
                <motion.div
                  animate={
                    phase === 'idle'
                      ? { rotateX: -82, scaleY: 0.32, opacity: 0.85 }
                      : { rotateX: 0, scaleY: 1, opacity: 1 }
                  }
                  transition={{
                    duration: phase === 'idle' ? 0.0 : 0.95,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    transformOrigin: '50% 0%',
                    transformStyle: 'preserve-3d',
                    background: 'var(--b-paper)',
                    color: 'var(--b-ink)',
                    border: '1px solid var(--b-ink)',
                    borderTop: `3px solid ${rc.color}`,
                    padding: '16px 20px 18px',
                    boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)',
                  }}
                >
                  {/* Masthead — always rendered (peeks above the fold
                      even when paper is folded). */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      borderBottom: '1px solid var(--b-ink)',
                      paddingBottom: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span className="spread" style={{ fontSize: 9 }}>OUTRANK</span>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'var(--b-ink-60)',
                        fontFamily: 'var(--font-inter)',
                      }}
                    >
                      A Self-Improvement Periodical
                    </span>
                  </div>

                  {/* Date / dispatch number row */}
                  <div
                    className="font-mono tabular"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 9,
                      color: 'var(--b-ink-60)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    <span>Dispatch №{day}</span>
                    <span>{dateLabel}</span>
                  </div>

                  {/* Body of the front page — only fades in during
                      reveal so it doesn't read on the folded state. */}
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: phase === 'reveal' ? 1 : 0,
                    }}
                    transition={{ duration: 0.4, delay: phase === 'reveal' ? 0.05 : 0 }}
                  >
                    {/* Editorial sub-eyebrow in rarity tone */}
                    <div
                      className="spread"
                      style={{ fontSize: 8.5, color: rc.color, textAlign: 'center', marginBottom: 4 }}
                    >
                      {day % 7 === 0 ? 'Weekly Edition · Special' : 'Daily Edition'}
                    </div>

                    {/* The headline — the whole point of the page */}
                    <h2
                      className="font-display"
                      style={{
                        fontSize: 30,
                        fontWeight: 500,
                        lineHeight: 1.0,
                        margin: '2px 0 4px',
                        textAlign: 'center',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      A token has been{' '}
                      <em style={{ fontStyle: 'italic', color: rc.color }}>awarded</em>.
                    </h2>

                    <p
                      className="font-body"
                      style={{
                        fontSize: 11.5,
                        color: 'var(--b-ink-60)',
                        textAlign: 'center',
                        lineHeight: 1.5,
                        margin: '0 0 14px',
                        fontStyle: 'italic',
                        maxWidth: 280,
                        marginInline: 'auto',
                      }}
                    >
                      {rc.label}
                    </p>

                    {/* Hairline rule before the hero illustration */}
                    <div
                      style={{
                        borderTop: '1px solid var(--b-rule)',
                        margin: '0 0 14px',
                      }}
                    />

                    {/* Hero block — illustration + reward details. Two
                        columns on wider, stacks on tight. */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '92px 1fr',
                        gap: 14,
                        alignItems: 'center',
                        marginBottom: 14,
                      }}
                    >
                      {/* Hairline-framed editorial illustration */}
                      <div
                        style={{
                          width: 92,
                          height: 92,
                          border: '1px solid var(--b-ink)',
                          background: 'var(--b-paper)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        {/* Faint rarity-tinted wash inside the frame */}
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            inset: 1,
                            background: `radial-gradient(circle at 35% 30%, ${rc.color}22, transparent 70%)`,
                            pointerEvents: 'none',
                          }}
                        />
                        <RewardIcon reward={reward} color={rc.color} />
                      </div>

                      {/* Reward copy */}
                      <div>
                        <div
                          className="spread"
                          style={{
                            fontSize: 8.5,
                            color: rc.color,
                            marginBottom: 2,
                          }}
                        >
                          Rarity · {rc.name}
                        </div>
                        <div
                          className="font-display"
                          style={{
                            fontSize: 16,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            color: 'var(--b-ink)',
                            lineHeight: 1.15,
                            marginBottom: 4,
                          }}
                        >
                          {reward.label}
                        </div>
                        <div
                          className="font-body"
                          style={{
                            fontSize: 10.5,
                            color: 'var(--b-ink-60)',
                            lineHeight: 1.4,
                          }}
                        >
                          {reward.detail}
                        </div>
                      </div>
                    </div>

                    {/* Byline footer rule */}
                    <div
                      style={{
                        borderTop: '1px solid var(--b-rule)',
                        paddingTop: 6,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span
                        className="spread"
                        style={{ fontSize: 8, color: 'var(--b-ink-60)' }}
                      >
                        By the Editors
                      </span>
                      <span
                        className="font-mono tabular"
                        style={{
                          fontSize: 8,
                          color: 'var(--b-ink-40)',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Outrank Press
                      </span>
                    </div>
                  </motion.div>

                  {/* Pre-reveal teaser — shows on idle/unfolding so the
                      paper doesn't look empty before it unfolds. */}
                  {phase !== 'reveal' && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 0 4px',
                      }}
                    >
                      <div
                        className="font-display"
                        style={{
                          fontSize: 16,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          color: 'var(--b-ink-60)',
                        }}
                      >
                        Today&rsquo;s edition awaits.
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Action row — sits below the paper, never folds */}
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={
                    phase === 'idle' ? open
                    : phase === 'reveal' ? dismiss
                    : undefined
                  }
                  disabled={phase === 'unfolding'}
                  className="font-body"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: phase === 'unfolding' ? 'transparent' : 'var(--b-ink)',
                    color: phase === 'unfolding' ? 'var(--b-ink-60)' : 'var(--b-paper)',
                    border: '1px solid var(--b-ink)',
                    cursor: phase === 'unfolding' ? 'default' : 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                  }}
                >
                  {phase === 'idle' ? "Read today's edition →"
                    : phase === 'reveal' ? 'Continue →'
                    : 'Unfolding…'}
                </button>

                {/* Replay link — only on reveal so the user can re-watch
                    the unfold without dismissing the modal. */}
                {phase === 'reveal' && (
                  <button
                    onClick={replay}
                    className="font-body"
                    style={{
                      width: '100%',
                      marginTop: 6,
                      padding: '6px 0',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 10,
                      color: 'var(--b-ink-60)',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ↻ Replay
                  </button>
                )}
              </div>

              {/* 7-day strip — editorial hairline tiles. Lives outside
                  the paper so it shows even before the unfold. */}
              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const dayIndex = ((day - 1) % 7) + 1;
                  const isCurrent = d === dayIndex;
                  const isPast = d < dayIndex;
                  const isWeekly = d === 7;
                  return (
                    <div
                      key={d}
                      style={{
                        textAlign: 'center',
                        padding: '4px 0',
                        background: isCurrent ? `${rc.color}20` : 'transparent',
                        border: isCurrent ? `1px solid ${rc.color}` : '1px solid var(--b-rule)',
                      }}
                    >
                      <div
                        className="font-mono"
                        style={{
                          fontSize: 8,
                          color: 'var(--b-ink-40)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        D{d}
                      </div>
                      <div
                        className="font-display tabular"
                        style={{
                          fontSize: 12,
                          fontStyle: 'italic',
                          fontWeight: 500,
                          color: isCurrent
                            ? rc.color
                            : isPast
                              ? 'var(--b-ink-60)'
                              : 'var(--b-ink-40)',
                          marginTop: 1,
                        }}
                      >
                        {isWeekly ? '★' : '◆'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p
                className="font-body"
                style={{
                  fontSize: 9.5,
                  textAlign: 'center',
                  color: 'var(--b-ink-40)',
                  marginTop: 10,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}
              >
                Reward rolled by rarity. Day 7 guarantees Epic or Legendary.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Reward icon ────────────────────────────────────────────────────

function RewardIcon({ reward, color }: { reward: ChestReward; color: string }) {
  const stroke = { color, filter: `drop-shadow(0 0 4px ${color}66)` };

  if (reward.evolutions) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" />
      </svg>
    );
  }
  if (reward.xpBoost) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.fragments) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      </svg>
    );
  }
  if (reward.xp) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.streakFreeze) {
    return (
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={stroke}>
        <path d="M12 2v20M5 6l14 12M5 18L19 6M2 12h20" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}

// ChestRarity is exported via the constants module; nothing else here.
export type { ChestRarity };
