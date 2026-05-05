'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getLevelForXP } from '@/constants/levels';

// Editorial level-up: a paper sheet press-stamps onto the screen.
// Hairline frame, italic display "Level Up.", mono Lv.{N}, and a
// concentric stamp-press radial in place of the orange particle burst.
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
          className="dir-b fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0.92, rotate: -1.5, opacity: 0 }}
            animate={{ scale: [0.92, 1.04, 1], rotate: [-1.5, 0.6, 0], opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            style={{
              background: 'var(--b-paper)',
              color: 'var(--b-ink)',
              border: '1px solid var(--b-ink)',
              borderTop: '2px solid var(--b-ink)',
              padding: '40px 56px',
              minWidth: 320,
              textAlign: 'center',
            }}
          >
            {/* Stamp-press radial — three concentric ink hairlines fanning
                out behind the sheet to read as an inked impression rather
                than a particle burst. */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0.55 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className="absolute inset-0 m-auto pointer-events-none"
              style={{
                width: 220,
                height: 220,
                border: '1px solid var(--b-ink)',
                borderRadius: '50%',
              }}
            />
            <motion.div
              initial={{ scale: 0.4, opacity: 0.4 }}
              animate={{ scale: 3.0, opacity: 0 }}
              transition={{ delay: 0.15, duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 m-auto pointer-events-none"
              style={{
                width: 220,
                height: 220,
                border: '1px solid var(--b-ink)',
                borderRadius: '50%',
              }}
            />
            <motion.div
              initial={{ scale: 0.4, opacity: 0.3 }}
              animate={{ scale: 3.6, opacity: 0 }}
              transition={{ delay: 0.3, duration: 1.3, ease: 'easeOut' }}
              className="absolute inset-0 m-auto pointer-events-none"
              style={{
                width: 220,
                height: 220,
                border: '1px solid var(--b-ink)',
                borderRadius: '50%',
              }}
            />

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="spread relative z-10"
              style={{ fontSize: 9, color: 'var(--b-ink-60)', marginBottom: 14 }}
            >
              Volume One — Ascension
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
              className="font-display relative z-10"
              style={{
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 56,
                lineHeight: 1.05,
                color: 'var(--b-ink)',
                margin: 0,
              }}
            >
              Level Up.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-mono relative z-10 tabular"
              style={{
                fontSize: 18,
                color: 'var(--b-accent)',
                letterSpacing: '0.08em',
                marginTop: 14,
                fontWeight: 600,
              }}
            >
              Lv.{levelInfo.level}
            </motion.p>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="relative z-10"
              style={{
                width: 64,
                height: 1,
                background: 'var(--b-ink)',
                margin: '14px auto',
                transformOrigin: 'center',
              }}
            />

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="font-display relative z-10"
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 22,
                color: 'var(--b-ink)',
                margin: 0,
              }}
            >
              {levelInfo.title}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="spread relative z-10"
              style={{ fontSize: 9, color: 'var(--b-ink-40)', marginTop: 24 }}
            >
              Tap to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
