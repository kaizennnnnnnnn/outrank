'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { updateDocument } from '@/lib/firestore';
import { increment, Timestamp } from 'firebase/firestore';
import { getLoginReward } from '@/constants/loginRewards';
import { Button } from '@/components/ui/Button';
import { ParticleBurst } from '@/components/effects/ParticleBurst';
import { haptic } from '@/lib/haptics';

/**
 * Fires once per calendar day when the user opens the app. Shows the current
 * streak day, animates a chest open, and writes the reward to Firestore.
 * Missing a day resets the streak to 1.
 */
export function DailyLoginChest() {
  const { user } = useAuth();
  const [state, setState] = useState<{ day: number; fragments: number; bonus?: string } | null>(null);
  const [opened, setOpened] = useState(false);
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

    // gap === 1 → streak continues; gap > 1 → streak resets
    const newStreak = gap === 1 ? currentStreak + 1 : 1;
    const reward = getLoginReward(newStreak);

    (async () => {
      try {
        await updateDocument('users', user.uid, {
          lastLoginClaimAt: Timestamp.now(),
          loginStreak: newStreak,
          fragments: increment(reward.fragments),
        });
        setState({ day: newStreak, fragments: reward.fragments, bonus: reward.bonus });
      } catch {
        // Silent — if the write fails we skip the chest until tomorrow
      }
    })();
  }, [user]);

  const open = () => {
    if (opened) return;
    setOpened(true);
    setBurst((n) => n + 1);
    haptic('success');
  };

  const dismiss = () => {
    setState(null);
    setOpened(false);
  };

  return (
    <>
      <ParticleBurst trigger={burst} color="#fbbf24" count={90} />
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={opened ? dismiss : undefined}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl p-6 border border-orange-500/30 bg-gradient-to-b from-[#12121c] to-[#07070c] overflow-hidden"
              style={{ boxShadow: '0 0 40px -10px rgba(251, 191, 36, 0.5)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 text-center">
                Daily Login
              </p>
              <p className="text-center text-xs text-slate-500 mt-1">
                Day {state.day}
                {state.bonus ? ` · ${state.bonus}` : ''}
              </p>

              <div className="flex justify-center py-8">
                <motion.div
                  animate={opened ? {
                    rotate: [0, -8, 8, -6, 6, 0],
                    scale: [1, 1.1, 1.1, 1.05, 1, 1],
                  } : { y: [0, -4, 0] }}
                  transition={opened ? { duration: 0.8 } : { duration: 2, repeat: Infinity }}
                >
                  <Chest opened={opened} />
                </motion.div>
              </div>

              {opened ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4"
                >
                  <p className="font-mono text-3xl font-bold text-orange-400">
                    +{state.fragments}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">fragments added</p>
                </motion.div>
              ) : (
                <p className="text-center text-xs text-slate-400 mb-4">
                  Tap to open your chest
                </p>
              )}

              <Button className="w-full" onClick={opened ? dismiss : open}>
                {opened ? 'Continue' : 'Open Chest'}
              </Button>

              {/* 7-day strip */}
              <div className="mt-4 flex items-center justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                  const r = getLoginReward(d);
                  const isCurrent = d === ((state.day - 1) % 7) + 1;
                  return (
                    <div
                      key={d}
                      className="flex-1 text-center rounded-md p-1.5 transition-all"
                      style={{
                        background: isCurrent ? 'rgba(249,115,22,0.15)' : '#0b0b14',
                        border: `1px solid ${isCurrent ? 'rgba(249,115,22,0.45)' : '#1e1e30'}`,
                      }}
                    >
                      <p className="text-[9px] text-slate-600">D{d}</p>
                      <p className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-orange-400' : 'text-slate-400'}`}>
                        {r.fragments}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Chest({ opened }: { opened: boolean }) {
  return (
    <svg width={110} height={110} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="chest-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="chest-lid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b45309" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id="chest-glow" cx="50%" cy="50%">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.5" stopColor="#f97316" stopOpacity="0.6" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      {opened && (
        <circle cx="60" cy="50" r="45" fill="url(#chest-glow)" />
      )}
      {/* Body */}
      <rect x="20" y="55" width="80" height="45" rx="4" fill="url(#chest-body)" stroke="#fbbf24" strokeWidth="1.5" />
      <rect x="55" y="70" width="10" height="15" rx="1" fill="#fbbf24" />
      {/* Lid */}
      <g transform={opened ? 'rotate(-35 20 55)' : ''}>
        <path
          d="M20 55 Q 60 20 100 55 L 100 65 L 20 65 Z"
          fill="url(#chest-lid)"
          stroke="#fbbf24"
          strokeWidth="1.5"
        />
        <circle cx="60" cy="55" r="4" fill="#fbbf24" />
      </g>
    </svg>
  );
}
