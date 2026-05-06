'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firestore';
import { increment, Timestamp } from 'firebase/firestore';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';
import { rollChestReward, RARITY_CONFIG, ChestRarity, ChestReward } from '@/constants/chestLoot';

type Phase = 'idle' | 'shake' | 'unlock' | 'crack' | 'open' | 'reveal';

/**
 * Daily chest — one roll per calendar day. Editorial Direction B v2:
 * paper modal, italic display headline, hairline 7-day strip. The
 * chest itself opens through a multi-stage 3D animation (shake →
 * unlock click → lid crack → lid swing → reward rises) so it reads
 * as a real wooden chest being opened rather than a wobble + sparkle.
 */
export function DailyLoginChest() {
  const { user } = useAuth();
  const [state, setState] = useState<{ day: number; reward: ChestReward } | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [burst, setBurst] = useState(0);

  useEffect(() => {
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
  }, [user]);

  // The opening sequence runs as a chained timeline: shake → unlock
  // (padlock pops + drops) → crack (lid lifts a notch) → open (lid
  // swings fully back) → reveal (reward rises out). Total ~2.6s.
  const open = () => {
    if (phase !== 'idle' || !state) return;
    setPhase('shake');
    haptic('tap');

    setTimeout(() => {
      setPhase('unlock');
      haptic('tap');
    }, 500);

    setTimeout(() => {
      setPhase('crack');
    }, 950);

    setTimeout(() => {
      setPhase('open');
      haptic('success');
    }, 1300);

    setTimeout(() => {
      setPhase('reveal');
      setBurst((n) => n + 1);
      if (state.reward.rarity === 'epic' || state.reward.rarity === 'legendary') {
        haptic('double');
      }
    }, 2300);
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

  const lidOpen = phase === 'open' || phase === 'reveal';

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
            }}
            onClick={phase === 'reveal' ? dismiss : undefined}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 380,
                background: 'var(--b-paper)',
                color: 'var(--b-ink)',
                border: '1px solid var(--b-ink)',
                borderTop: `3px solid ${rc.color}`,
                padding: '18px 22px 22px',
                overflow: 'hidden',
              }}
            >
              {/* Eyebrow + headline */}
              <div className="spread" style={{ fontSize: 9, color: rc.color, textAlign: 'center' }}>
                Daily Chest · Day {day}{day % 7 === 0 ? ' · Weekly' : ''}
              </div>
              <h2
                className="font-display"
                style={{
                  fontSize: 26,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  lineHeight: 1.05,
                  margin: '4px 0 12px',
                  textAlign: 'center',
                }}
              >
                {phase === 'reveal' ? 'A token for the journal.' : 'Today’s offering.'}
              </h2>

              {/* Stage area — chest or reveal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 240,
                  position: 'relative',
                }}
              >
                {phase !== 'reveal' ? (
                  <RealisticChest phase={phase} rarity={reward.rarity} lidOpen={lidOpen} />
                ) : (
                  <RewardReveal reward={reward} />
                )}
              </div>

              {/* Action button — editorial filled-ink style */}
              <button
                onClick={phase === 'idle' ? open : phase === 'reveal' ? dismiss : undefined}
                disabled={phase !== 'idle' && phase !== 'reveal'}
                className="font-body"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: phase === 'idle' || phase === 'reveal' ? 'var(--b-ink)' : 'transparent',
                  color: phase === 'idle' || phase === 'reveal' ? 'var(--b-paper)' : 'var(--b-ink-60)',
                  border: '1px solid var(--b-ink)',
                  cursor: phase === 'idle' || phase === 'reveal' ? 'pointer' : 'default',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginTop: 6,
                }}
              >
                {phase === 'idle' ? 'Open chest →'
                  : phase === 'reveal' ? 'Continue →'
                  : 'Opening…'}
              </button>

              {/* 7-day strip — editorial hairline tiles */}
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
                  fontSize: 10,
                  textAlign: 'center',
                  color: 'var(--b-ink-40)',
                  marginTop: 10,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                }}
              >
                Reward rolled by rarity. Weekly chest guarantees Epic or Legendary.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Realistic chest ────────────────────────────────────────────────

/**
 * 3D-perspective wooden chest. Body and lid render as separate layered
 * elements so the lid can pivot on its back edge in real space. The
 * sequence is:
 *   shake — body rocks left/right (the user is jostling it)
 *   unlock — padlock shudders, brightens, then the shackle pops + the
 *     padlock falls out of frame
 *   crack — lid lifts a few degrees, the interior glow ignites
 *   open — lid swings fully back (≈115°) past vertical with a small
 *     overshoot bounce, like a heavy oak lid catching its hinges
 *   reveal — reward rises out of the chest (handled in RewardReveal)
 */
function RealisticChest({
  phase,
  rarity,
  lidOpen,
}: {
  phase: Phase;
  rarity: ChestRarity;
  lidOpen: boolean;
}) {
  const rc = RARITY_CONFIG[rarity];

  // Body shake — runs only during the 'shake' window.
  const bodyShake = phase === 'shake'
    ? { x: [0, -3, 3, -4, 4, -2, 2, 0], rotate: [0, -1.5, 1.5, -2, 2, -1, 1, 0] }
    : { x: 0, rotate: 0 };

  // Lid rotation lifecycle — uses rotateX on a perspective parent so
  // it reads as the lid pivoting on a hinge at its back edge.
  const lidRotate =
    phase === 'idle' || phase === 'shake' || phase === 'unlock' ? 0
      : phase === 'crack' ? -18
      : -118;

  const lidTransition =
    phase === 'crack'
      ? { duration: 0.35, ease: 'easeOut' as const }
      : phase === 'open' || phase === 'reveal'
        ? { duration: 1.0, ease: [0.34, 1.6, 0.64, 1] as [number, number, number, number] }
        : { duration: 0.2 };

  // Padlock falls during 'unlock' phase.
  const padlockY = phase === 'unlock' || phase === 'crack' || phase === 'open' || phase === 'reveal' ? 80 : 0;
  const padlockOpacity = phase === 'unlock' ? 1 : (phase === 'idle' || phase === 'shake') ? 1 : 0;
  const padlockShake = phase === 'shake'
    ? { x: [0, -1, 1, -1.5, 1.5, -1, 1, 0] }
    : { x: 0 };

  return (
    <div
      style={{
        perspective: 800,
        perspectiveOrigin: '50% 50%',
        width: 220,
        height: 200,
        position: 'relative',
      }}
    >
      <motion.div
        animate={bodyShake}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Idle bob — gentle vertical drift when not in any opening
            phase. Stops the moment the user taps Open. */}
        <motion.div
          animate={
            phase === 'idle'
              ? { y: [0, -4, 0] }
              : { y: 0 }
          }
          transition={
            phase === 'idle'
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          {/* Floor shadow — softens after the chest "lifts" during open */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 8,
              transform: 'translateX(-50%)',
              width: 160,
              height: 14,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)',
              filter: 'blur(4px)',
              opacity: lidOpen ? 0.9 : 0.7,
              transition: 'opacity 800ms',
            }}
          />

          {/* Inner glow — fades in as lid cracks, peaks during open/reveal */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '38%',
              transform: 'translate(-50%, -50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${rc.color}cc, ${rc.color}55 30%, transparent 60%)`,
              opacity:
                phase === 'crack' ? 0.55 :
                phase === 'open' ? 0.95 :
                phase === 'reveal' ? 0.85 :
                0,
              transition: 'opacity 600ms ease-out',
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />

          {/* Body — rendered behind everything */}
          <ChestBody phase={phase} />

          {/* Interior — visible once the lid moves, with a vertical
              light beam coming up out of the box */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: 60,
              transform: 'translateX(-50%)',
              width: 150,
              height: 6,
              background: `linear-gradient(180deg, ${rc.color}, ${rc.color}cc)`,
              opacity: phase === 'crack' || phase === 'open' || phase === 'reveal' ? 1 : 0,
              transition: 'opacity 300ms',
              boxShadow: `0 0 18px ${rc.color}, inset 0 1px 0 rgba(255,255,255,0.8)`,
              borderRadius: 1,
            }}
          />
          {/* Beam of light shooting upward from inside */}
          {(phase === 'crack' || phase === 'open' || phase === 'reveal') && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0, scaleY: 0.2 }}
              animate={{ opacity: [0, 0.85, 0.5], scaleY: [0.3, 1, 1] }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 76,
                transform: 'translateX(-50%)',
                transformOrigin: 'bottom center',
                width: 110,
                height: 160,
                background: `linear-gradient(180deg, transparent, ${rc.color}55 50%, ${rc.color}aa 100%)`,
                clipPath: 'polygon(40% 0, 60% 0, 80% 100%, 20% 100%)',
                filter: 'blur(2px)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Lid — pivots on its back edge */}
          <motion.div
            animate={{ rotateX: lidRotate }}
            transition={lidTransition}
            style={{
              position: 'absolute',
              left: '50%',
              top: 30,
              transform: 'translateX(-50%)',
              transformOrigin: '50% 100%',
              transformStyle: 'preserve-3d',
              width: 180,
              height: 56,
            }}
          >
            <ChestLid />
          </motion.div>

          {/* Padlock — shakes during shake phase, pops + falls during unlock */}
          <motion.div
            animate={{
              y: padlockY,
              opacity: padlockOpacity,
              ...padlockShake,
              rotate: phase === 'unlock' ? [0, -8, -22, -45] : 0,
            }}
            transition={
              phase === 'unlock'
                ? { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                : { duration: 0.4 }
            }
            style={{
              position: 'absolute',
              left: '50%',
              top: 76,
              transform: 'translateX(-50%)',
              zIndex: 5,
            }}
          >
            <Padlock unlocking={phase === 'unlock'} />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Chest body — wooden box with iron banding + corner studs. */
function ChestBody({ phase }: { phase: Phase }) {
  void phase;
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 78,
        transform: 'translateX(-50%)',
        width: 180,
        height: 110,
      }}
    >
      {/* Wood face with grain via repeating gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(90deg, #4a2511 0 8px, #5a2c14 8px 16px, #401e0d 16px 22px),' +
            'linear-gradient(180deg, #6b3a1c 0%, #3a1c0c 100%)',
          backgroundBlendMode: 'multiply',
          borderRadius: 4,
          boxShadow:
            'inset 0 -10px 18px rgba(0,0,0,0.55), inset 0 4px 8px rgba(255,200,140,0.12), 0 6px 16px -4px rgba(0,0,0,0.6)',
        }}
      />
      {/* Iron upper band */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 8,
          background: 'linear-gradient(180deg, #4a4a52 0%, #2c2c34 100%)',
          borderTop: '1px solid #6a6a72',
          borderBottom: '1px solid #1a1a20',
        }}
      />
      {/* Iron lower band */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 10,
          background: 'linear-gradient(180deg, #3a3a42 0%, #1a1a20 100%)',
          borderTop: '1px solid #5a5a62',
          borderBottom: '1px solid #0a0a10',
          borderRadius: '0 0 4px 4px',
        }}
      />
      {/* Vertical iron strap, center */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 12,
          background: 'linear-gradient(90deg, #2c2c34 0%, #4a4a52 50%, #2c2c34 100%)',
          boxShadow: 'inset 0 0 0 1px #1a1a20',
        }}
      />
      {/* Lock plate where padlock hooks in — small iron rectangle in
          the middle of the front face. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 38,
          transform: 'translateX(-50%)',
          width: 28,
          height: 24,
          background: 'linear-gradient(180deg, #3a3a42 0%, #1a1a20 100%)',
          border: '1px solid #5a5a62',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 6,
            height: 8,
            background: '#0a0a10',
            borderRadius: 2,
            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.6)',
          }}
        />
      </div>
      {/* Corner studs */}
      {[
        { x: 4, y: 4 },
        { x: 168, y: 4 },
        { x: 4, y: 96 },
        { x: 168, y: 96 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #8a8a92 0%, #2a2a32 70%)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.5), inset 0 -1px 0 rgba(0,0,0,0.5)',
          }}
        />
      ))}
    </div>
  );
}

/** Chest lid — rounded top with iron banding + central key plate. */
function ChestLid() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'repeating-linear-gradient(90deg, #4a2511 0 8px, #5a2c14 8px 16px, #401e0d 16px 22px),' +
          'linear-gradient(180deg, #7a4221 0%, #4a2511 100%)',
        backgroundBlendMode: 'multiply',
        borderRadius: '24px 24px 4px 4px',
        boxShadow:
          'inset 0 -8px 14px rgba(0,0,0,0.5), inset 0 4px 6px rgba(255,200,140,0.18)',
      }}
    >
      {/* Iron rim along the lid bottom edge — the one that meets the body */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 8,
          background: 'linear-gradient(180deg, #4a4a52 0%, #1a1a20 100%)',
          borderTop: '1px solid #6a6a72',
          borderBottom: '1px solid #0a0a10',
        }}
      />
      {/* Top arc iron strap — goes over the dome of the lid */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          transform: 'translateX(-50%)',
          width: 12,
          background: 'linear-gradient(90deg, #2c2c34 0%, #4a4a52 50%, #2c2c34 100%)',
          borderRadius: '6px 6px 0 0',
          boxShadow: 'inset 0 0 0 1px #1a1a20',
        }}
      />
      {/* Center key escutcheon — gold plate */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 18,
          transform: 'translateX(-50%)',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 25%, #fde68a 0%, #b45309 70%)',
          boxShadow: '0 0 0 1.5px #7a3e0a, inset 0 -2px 4px rgba(0,0,0,0.4)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 4,
            height: 8,
            background: '#3a1a04',
            borderRadius: 1,
          }}
        />
      </div>
      {/* Lid corner studs */}
      {[
        { x: 6, y: 32 },
        { x: 162, y: 32 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #8a8a92 0%, #2a2a32 70%)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.5)',
          }}
        />
      ))}
    </div>
  );
}

/** Padlock with shackle — drops away during unlock phase. */
function Padlock({ unlocking }: { unlocking: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 28,
        height: 36,
      }}
    >
      {/* Shackle — top loop. Lifts up during unlocking. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: unlocking ? -4 : 0,
          transform: 'translateX(-50%)',
          width: 18,
          height: 12,
          borderRadius: '9px 9px 0 0',
          border: '3px solid #8a8a92',
          borderBottom: 'none',
          background: 'transparent',
          boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
          transition: 'top 200ms ease-out',
        }}
      />
      {/* Body — square iron lock */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 10,
          width: 28,
          height: 26,
          borderRadius: 4,
          background: 'linear-gradient(145deg, #6a6a72 0%, #2a2a32 100%)',
          border: '1px solid #1a1a20',
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.5)',
        }}
      >
        {/* Keyhole */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 5,
            height: 8,
            background: '#0a0a10',
            borderRadius: '50% 50% 30% 30%',
          }}
        />
      </div>
    </div>
  );
}

// ─── Reward reveal ──────────────────────────────────────────────────

function RewardReveal({ reward }: { reward: ChestReward }) {
  const rc = RARITY_CONFIG[reward.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 220 }}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Rarity tag — editorial spread caps in rarity color */}
      <div
        className="spread"
        style={{
          fontSize: 9,
          color: rc.color,
          padding: '4px 12px',
          border: `1px solid ${rc.color}80`,
          borderTop: `2px solid ${rc.color}`,
        }}
      >
        {rc.name}
      </div>

      {/* Reward gem — softer, hairline-rimmed orb */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.2 }}
        style={{
          position: 'relative',
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${rc.color} 45%, ${rc.color}99 75%, var(--b-paper) 100%)`,
          boxShadow: `0 0 32px ${rc.color}66, inset 0 -6px 14px ${rc.color}55`,
          border: `1px solid ${rc.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RewardIcon reward={reward} color="#fff" />
      </motion.div>

      {/* Label — italic display in rarity tone */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display"
          style={{
            fontSize: 22,
            fontStyle: 'italic',
            fontWeight: 500,
            color: rc.color,
            lineHeight: 1.1,
          }}
        >
          {reward.label}
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="font-body"
          style={{
            fontSize: 12,
            color: 'var(--b-ink-60)',
            marginTop: 4,
            maxWidth: 260,
            lineHeight: 1.45,
          }}
        >
          {reward.detail}
        </motion.p>
      </div>
    </motion.div>
  );
}

function RewardIcon({ reward, color }: { reward: ChestReward; color: string }) {
  const glow = { filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px #fff)` };

  if (reward.evolutions) {
    return (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color, ...glow }}>
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" />
      </svg>
    );
  }
  if (reward.xpBoost) {
    return (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="currentColor" style={{ color, ...glow }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.fragments) {
    return (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color, ...glow }}>
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      </svg>
    );
  }
  if (reward.xp) {
    return (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="currentColor" style={{ color, ...glow }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.streakFreeze) {
    return (
      <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color, ...glow }}>
        <path d="M12 2v20M5 6l14 12M5 18L19 6M2 12h20" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}
