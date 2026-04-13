'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { getLevelForXP } from '@/constants/levels';

export function LevelUpOverlay() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [levelInfo, setLevelInfo] = useState<{ level: number; title: string } | null>(null);
  const [prevLevel, setPrevLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const currentLevel = getLevelForXP(user.totalXP);

    if (prevLevel !== null && currentLevel.level > prevLevel) {
      setLevelInfo(currentLevel);
      setShow(true);

      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#2563eb', '#06b6d4', '#f97316', '#f59e0b', '#10b981'],
      });

      setTimeout(() => setShow(false), 4000);
    }

    setPrevLevel(currentLevel.level);
  }, [user?.totalXP, user, prevLevel]);

  return (
    <AnimatePresence>
      {show && levelInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: [0, 1.2, 1], rotate: [10, -5, 0] }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="text-center"
          >
            {/* Circular burst */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0 m-auto w-32 h-32 rounded-full bg-blue-600/30"
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-8xl mb-4"
            >
              ⚡
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-heading text-sm text-cyan-400 uppercase tracking-widest mb-2"
            >
              Level Up!
            </motion.p>

            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="font-heading text-6xl font-bold text-white mb-3"
            >
              {levelInfo.level}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="font-heading text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600"
            >
              {levelInfo.title}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-sm text-slate-500 mt-6"
            >
              Tap to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
