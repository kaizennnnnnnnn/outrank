'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  show: boolean;
}

export function SplashScreen({ show }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[300] bg-[#06060c] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Ember particles rising */}
          {[
            { x: -60, delay: 0.3, dur: 2.2, end: -200 },
            { x: 40, delay: 0.5, dur: 1.8, end: -180 },
            { x: -30, delay: 0.7, dur: 2.0, end: -220 },
            { x: 70, delay: 0.4, dur: 2.4, end: -190 },
            { x: -80, delay: 0.6, dur: 1.9, end: -210 },
            { x: 20, delay: 0.8, dur: 2.1, end: -170 },
            { x: -50, delay: 0.9, dur: 2.3, end: -230 },
            { x: 55, delay: 0.35, dur: 1.7, end: -185 },
            { x: -15, delay: 0.55, dur: 2.5, end: -240 },
            { x: 85, delay: 0.75, dur: 2.0, end: -195 },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: p.x, y: 50, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                y: [50, p.end],
                x: [p.x, p.x * 0.5],
                scale: [0, 1, 0.3],
              }}
              transition={{ delay: p.delay, duration: p.dur, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
                background: i % 2 === 0 ? '#ef4444' : '#fbbf24',
                boxShadow: `0 0 ${i % 2 === 0 ? 8 : 6}px ${i % 2 === 0 ? '#ef4444' : '#fbbf24'}`,
              }}
            />
          ))}

          {/* Central fire glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.6, 0.25], scale: [0, 1.5, 1] }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-[400px] h-[400px]"
            style={{
              background: 'radial-gradient(circle, rgba(220,38,38,0.2) 0%, rgba(239,68,68,0.08) 30%, transparent 60%)',
            }}
          />

          {/* Expanding heat rings */}
          <motion.div
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ delay: 0.3, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full border border-red-600/30"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full border border-orange-500/20"
          />

          {/* Phoenix SVG — dramatic entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: 40 }}
            animate={{ opacity: 1, scale: [0.2, 1.2, 1], y: [40, -10, 0] }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            {/* Breathing glow */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1.15, 0.95] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-8 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 65%)' }}
            />

            {/* Phoenix icon */}
            <svg width={90} height={90} viewBox="0 0 64 64" fill="none" className="relative z-10 drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]">
              <path d="M32 8C32 8 26 14 24 22C22 30 24 34 28 36C26 32 26 26 28 20C30 14 32 12 32 12C32 12 34 14 36 20C38 26 38 32 36 36C40 34 42 30 40 22C38 14 32 8 32 8Z" fill="url(#splashBody)" />
              <path d="M28 36C24 34 18 30 12 28C8 27 4 28 4 28C4 28 10 32 16 34C22 36 26 37 28 36Z" fill="url(#splashWingL)" />
              <path d="M36 36C40 34 46 30 52 28C56 27 60 28 60 28C60 28 54 32 48 34C42 36 38 37 36 36Z" fill="url(#splashWingR)" />
              <path d="M26 28C22 26 16 22 10 18C6 16 2 16 2 16C2 16 8 22 14 26C20 30 24 30 26 28Z" fill="url(#splashWingL)" opacity="0.7" />
              <path d="M38 28C42 26 48 22 54 18C58 16 62 16 62 16C62 16 56 22 50 26C44 30 40 30 38 28Z" fill="url(#splashWingR)" opacity="0.7" />
              <path d="M32 36C30 40 28 48 28 54C28 58 30 60 32 60C34 60 36 58 36 54C36 48 34 40 32 36Z" fill="url(#splashTail)" />
              <path d="M32 40C31 44 30 50 30 54C30 56 31 57 32 57C33 57 34 56 34 54C34 50 33 44 32 40Z" fill="url(#splashTailI)" opacity="0.6" />
              <defs>
                <linearGradient id="splashBody" x1="32" y1="8" x2="32" y2="40"><stop offset="0%" stopColor="#fbbf24" /><stop offset="40%" stopColor="#ef4444" /><stop offset="100%" stopColor="#991b1b" /></linearGradient>
                <linearGradient id="splashWingL" x1="4" y1="28" x2="28" y2="36"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
                <linearGradient id="splashWingR" x1="60" y1="28" x2="36" y2="36"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" /><stop offset="100%" stopColor="#dc2626" /></linearGradient>
                <linearGradient id="splashTail" x1="32" y1="36" x2="32" y2="60"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#7f1d1d" /></linearGradient>
                <linearGradient id="splashTailI" x1="32" y1="40" x2="32" y2="57"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 relative z-10"
          >
            <h1 className="font-heading text-4xl font-bold tracking-wider">
              <span className="text-white">Out</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-orange-400">rank</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="text-sm text-slate-500 mt-2 relative z-10 tracking-wide"
          >
            Rise above the rest.
          </motion.p>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 1.1, duration: 0.3 }}
            className="mt-10 w-48 h-[3px] bg-[#111] rounded-full overflow-hidden relative z-10"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ delay: 1.1, duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #991b1b, #dc2626, #ef4444, #fbbf24)',
                boxShadow: '0 0 10px rgba(220,38,38,0.5)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
