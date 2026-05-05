'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  show: boolean;
}

const LETTERS = ['O', 'u', 't', 'r', 'a', 'n', 'k'];

export function SplashScreen({ show }: SplashScreenProps) {
  // Gate animated content behind a client-only flag so the SSR HTML
  // shows just the paper backdrop — no flashed wordmark before
  // hydration. See levelup/CLAUDE.md "Framer Motion `initial`" gotcha.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="dir-b fixed inset-0 z-[300] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
        >
          {mounted && (
            <>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="spread"
                style={{
                  fontSize: 9,
                  color: 'var(--b-ink-60)',
                  marginBottom: 18,
                }}
              >
                Volume One
              </motion.p>

              <div className="flex" style={{ gap: 1 }}>
                {LETTERS.map((char, i) => (
                  <motion.span
                    key={i}
                    style={{ display: 'inline-block', color: 'var(--b-ink)' }}
                    initial={{ opacity: 0, y: 18, rotate: -3 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{
                      delay: 0.2 + i * 0.05,
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="font-display"
                  >
                    <span
                      style={{
                        fontStyle: 'italic',
                        fontWeight: 500,
                        fontSize: 56,
                        lineHeight: 1,
                      }}
                    >
                      {char}
                    </span>
                  </motion.span>
                ))}
              </div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: 96,
                  height: 1,
                  background: 'var(--b-ink)',
                  margin: '18px 0 12px',
                  transformOrigin: 'center',
                }}
              />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="font-display"
                style={{
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--b-ink-60)',
                }}
              >
                Rise above the rest.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.95, duration: 0.25 }}
                className="mt-10 relative overflow-hidden"
                style={{
                  width: 180,
                  height: 2,
                  background: 'var(--b-rule)',
                  transformOrigin: 'left',
                }}
              >
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '0%' }}
                  transition={{ delay: 0.95, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full"
                  style={{ background: 'var(--b-ink)' }}
                />
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
