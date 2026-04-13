'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/hooks/useFirestore';
import { orderBy, limit } from '@/lib/firestore';
import { EarnedBadge, RARITY_COLORS } from '@/types/badge';
import { getBadgeById } from '@/constants/badges';

export function BadgeUnlockOverlay() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [badge, setBadge] = useState<{ name: string; icon: string; rarity: string; description: string } | null>(null);
  const [prevCount, setPrevCount] = useState<number | null>(null);

  const { data: earned } = useCollection<EarnedBadge & { id: string }>(
    `userBadges/${user?.uid}/earned`,
    [orderBy('earnedAt', 'desc'), limit(1)],
    !!user?.uid
  );

  useEffect(() => {
    if (!earned || earned.length === 0) return;

    const count = earned.length;
    if (prevCount !== null && count > prevCount) {
      const latest = earned[0];
      const badgeInfo = getBadgeById(latest.badgeId);
      if (badgeInfo) {
        setBadge(badgeInfo);
        setShow(true);
        setTimeout(() => setShow(false), 3500);
      }
    }
    setPrevCount(count);
  }, [earned, prevCount]);

  if (!badge) return null;

  const color = RARITY_COLORS[badge.rarity as keyof typeof RARITY_COLORS] || '#94a3b8';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          {/* Card flip */}
          <motion.div
            initial={{ rotateY: 180, scale: 0.8 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative w-64 rounded-2xl border-2 p-8 text-center"
            style={{
              borderColor: color,
              backgroundColor: '#10101a',
              boxShadow: `0 0 40px ${color}40, 0 0 80px ${color}20`,
            }}
          >
            {/* Glow pulse */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl"
              style={{ boxShadow: `inset 0 0 30px ${color}20` }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color }}
            >
              Badge Unlocked!
            </motion.p>

            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="text-6xl block mb-4"
            >
              {badge.icon}
            </motion.span>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-lg font-bold text-white mb-1"
            >
              {badge.name}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-slate-400"
            >
              {badge.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-4 inline-flex px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {badge.rarity.toUpperCase()}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
