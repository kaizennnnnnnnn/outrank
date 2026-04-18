'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firestore';
import { increment, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';
import { rollChestReward, RARITY_CONFIG, ChestRarity, ChestReward } from '@/constants/chestLoot';

/**
 * Daily chest — one roll per calendar day. The roll uses a weighted rarity
 * table with streak-based pity and guaranteed Epic+ on every 7th day.
 * Reveal animation ramps with rarity: more shake, brighter burst, louder halo.
 */
export function DailyLoginChest() {
  const { user } = useAuth();
  const [state, setState] = useState<{ day: number; reward: ChestReward } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'reveal'>('idle');
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

    // Already claimed today
    if (gap === 0) return;

    const newStreak = gap === 1 ? currentStreak + 1 : 1;
    const reward = rollChestReward(newStreak);

    (async () => {
      try {
        // Awakening bump (+3 per claim, clamped at 100). Read-clamp-write so
        // increment() can't overshoot the cap.
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

  const open = () => {
    if (phase !== 'idle' || !state) return;
    setPhase('opening');
    haptic('success');
    // Opening phase runs ~1.4s, then reveal with particle burst
    setTimeout(() => {
      setPhase('reveal');
      setBurst((n) => n + 1);
      if (state.reward.rarity === 'epic' || state.reward.rarity === 'legendary') {
        haptic('double');
      }
    }, 1400);
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

  return (
    <>
      <ParticleBurst trigger={burst} color={particleColor} count={particleCount} />
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={phase === 'reveal' ? dismiss : undefined}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl p-6 border overflow-hidden"
              style={{
                background: `radial-gradient(ellipse 120% 80% at 50% 0%, ${rc.color}33, transparent 55%), linear-gradient(180deg, #0f0b18 0%, #07070c 100%)`,
                borderColor: `${rc.color}55`,
                boxShadow: `0 20px 80px -10px ${rc.glow}`,
              }}
            >
              {/* Decorative animated arc behind chest */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 45%, ${rc.color}22 0%, transparent 55%)`,
                }}
                animate={
                  phase === 'opening'
                    ? { opacity: [0.3, 0.9, 0.5, 1] }
                    : phase === 'reveal'
                      ? { opacity: 0.7 }
                      : { opacity: 0.3 }
                }
                transition={{ duration: 1.2 }}
              />

              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-center" style={{ color: rc.color }}>
                  Daily Chest
                </p>
                <p className="text-center text-[11px] text-slate-500 mt-1">
                  Day {day}{day % 7 === 0 ? ' · Weekly chest' : ''}
                </p>

                {/* Chest zone — swaps between animated chest and reveal payload */}
                <div className="flex flex-col items-center justify-center py-6 min-h-[220px]">
                  {phase !== 'reveal' ? (
                    <AnimatedChest phase={phase} rarity={phase === 'opening' ? reward.rarity : 'common'} />
                  ) : (
                    <RewardReveal reward={reward} />
                  )}
                </div>

                <div className="relative">
                  <Button
                    className="w-full text-base py-3"
                    onClick={phase === 'idle' ? open : phase === 'reveal' ? dismiss : undefined}
                    disabled={phase === 'opening'}
                  >
                    {phase === 'idle' ? 'Open Chest'
                      : phase === 'opening' ? 'Opening…'
                      : 'Continue'}
                  </Button>
                </div>

                {/* 7-day strip */}
                <div className="mt-4 flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                    const isCurrent = d === ((day - 1) % 7) + 1;
                    return (
                      <div
                        key={d}
                        className="flex-1 text-center rounded-lg py-1 transition-all"
                        style={{
                          background: isCurrent ? `${rc.color}22` : '#0b0b14',
                          border: `1px solid ${isCurrent ? `${rc.color}60` : '#1e1e30'}`,
                        }}
                      >
                        <p className="text-[9px] text-slate-600">D{d}</p>
                        <p
                          className={`text-[11px] font-bold ${isCurrent ? '' : 'text-slate-500'}`}
                          style={isCurrent ? { color: rc.color } : undefined}
                        >
                          {d === 7 ? '★' : '◆'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] text-center text-slate-600 mt-3 leading-relaxed">
                  Reward rolled by rarity. Weekly chest guarantees Epic or Legendary.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * SVG chest that animates through idle → opening → (reveal replaces it).
 * Opening phase: wobble ramp, glow pulse, then lid flips open.
 */
function AnimatedChest({ phase, rarity }: { phase: 'idle' | 'opening'; rarity: ChestRarity }) {
  const rc = RARITY_CONFIG[rarity];
  const isOpening = phase === 'opening';

  return (
    <motion.div
      animate={
        isOpening
          ? {
              rotate: [0, -4, 4, -6, 6, -8, 8, -5, 5, 0],
              scale:  [1, 1.04, 1.04, 1.08, 1.08, 1.12, 1.12, 1.18, 1.18, 1.25],
              y:      [0, 2, -2, 3, -3, 4, -4, 2, -2, 0],
            }
          : { y: [0, -6, 0] }
      }
      transition={isOpening
        ? { duration: 1.4, ease: 'easeInOut' }
        : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }
      className="relative"
    >
      {/* Pulsing rarity aura while opening */}
      {isOpening && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{
            scale: [1, 1.6, 1.2, 1.8, 2.2],
            opacity: [0.2, 0.7, 0.4, 0.9, 0],
          }}
          transition={{ duration: 1.4 }}
          style={{
            background: `radial-gradient(circle, ${rc.color}99 0%, ${rc.color}33 40%, transparent 70%)`,
          }}
        />
      )}

      <svg width={160} height={160} viewBox="0 0 120 120" fill="none" className="relative">
        <defs>
          <linearGradient id="chest-body-2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#a16207" />
            <stop offset="1" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="chest-lid-2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d97706" />
            <stop offset="0.5" stopColor="#b45309" />
            <stop offset="1" stopColor="#7c2d12" />
          </linearGradient>
          <radialGradient id="chest-glow-2" cx="50%" cy="50%">
            <stop offset="0" stopColor={rc.color} stopOpacity="1" />
            <stop offset="0.5" stopColor={rc.color} stopOpacity="0.5" />
            <stop offset="1" stopColor={rc.color} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="chest-trim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* Inner light beam from lid gap when opening */}
        {isOpening && (
          <motion.circle
            cx="60" cy="50" r="40"
            fill="url(#chest-glow-2)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.6, 0.9, 1] }}
            transition={{ duration: 1.4 }}
          />
        )}

        {/* Body */}
        <rect x="20" y="55" width="80" height="45" rx="5" fill="url(#chest-body-2)" stroke="url(#chest-trim)" strokeWidth="2" />
        <rect x="20" y="55" width="80" height="4" fill="#7c2d12" />
        <rect x="55" y="70" width="10" height="18" rx="1.5" fill="url(#chest-trim)" />
        <circle cx="60" cy="79" r="1.5" fill="#451a03" />

        {/* Lid — stays shut (chest reveal takes over after) */}
        <g>
          <path
            d="M20 55 Q 60 22 100 55 L 100 62 L 20 62 Z"
            fill="url(#chest-lid-2)"
            stroke="url(#chest-trim)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="60" cy="48" r="4" fill="url(#chest-trim)" stroke="#7c2d12" strokeWidth="0.8" />
          {/* Corner studs */}
          <circle cx="26" cy="60" r="1.5" fill="url(#chest-trim)" />
          <circle cx="94" cy="60" r="1.5" fill="url(#chest-trim)" />
        </g>

        {/* Bottom shadow */}
        <ellipse cx="60" cy="105" rx="38" ry="3" fill="#000" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

/** Reveal card with rarity banner + reward detail. */
function RewardReveal({ reward }: { reward: ChestReward }) {
  const rc = RARITY_CONFIG[reward.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 18, stiffness: 220 }}
      className="w-full flex flex-col items-center gap-3"
    >
      {/* Rarity banner */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full rounded-lg py-1.5 text-center overflow-hidden relative"
        style={{
          background: `linear-gradient(90deg, transparent, ${rc.color}55, ${rc.color}33, ${rc.color}55, transparent)`,
          border: `1px solid ${rc.color}55`,
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.4em]"
          style={{
            color: rc.color,
            textShadow: `0 0 8px ${rc.color}`,
          }}
        >
          {rc.name}
        </p>
      </motion.div>

      {/* Reward icon — circular gem in rarity color */}
      <motion.div
        initial={{ scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.25 }}
        className="relative w-28 h-28 rounded-full flex items-center justify-center animate-mini-orb-core"
        style={{
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${rc.color} 40%, ${rc.color}99 70%, #0f0b18 100%)`,
          boxShadow: `0 0 40px ${rc.color}, inset 0 -8px 20px ${rc.color}55`,
        }}
      >
        <RewardIcon reward={reward} color={rc.color} />
      </motion.div>

      {/* Label */}
      <div className="text-center">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="font-heading text-xl font-bold"
          style={{ color: rc.color }}
        >
          {reward.label}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[11px] text-slate-400 mt-1 max-w-[260px]"
        >
          {reward.detail}
        </motion.p>
      </div>
    </motion.div>
  );
}

/** Pick the right icon for a reward based on its payout. */
function RewardIcon({ reward, color }: { reward: ChestReward; color: string }) {
  // Priority: evolutions > fragments > xpBoost > xp > freeze
  const glow = { filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 2px #fff)` };

  if (reward.evolutions) {
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" style={glow}>
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z" />
      </svg>
    );
  }
  if (reward.xpBoost) {
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="currentColor" className="text-white" style={glow}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.fragments) {
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" style={glow}>
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
      </svg>
    );
  }
  if (reward.xp) {
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="currentColor" className="text-white" style={glow}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (reward.streakFreeze) {
    return (
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white" style={glow}>
        <path d="M12 2v20M5 6l14 12M5 18L19 6M2 12h20" strokeLinecap="round" />
      </svg>
    );
  }
  return null;
}
