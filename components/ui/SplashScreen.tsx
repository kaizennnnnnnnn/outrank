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
          {/* Animated grid lines background */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />

          {/* Expanding ring 1 */}
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ delay: 0.4, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-32 h-32 rounded-full border border-cyan-500/30"
          />

          {/* Expanding ring 2 */}
          <motion.div
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ delay: 0.6, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-32 h-32 rounded-full border border-blue-500/20"
          />

          {/* Expanding ring 3 */}
          <motion.div
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ delay: 0.8, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-32 h-32 rounded-full border border-cyan-400/10"
          />

          {/* Central glow burst */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.8, 0.3], scale: [0, 1.5, 1] }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute w-[500px] h-[500px]"
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(37,99,235,0.08) 30%, transparent 60%)',
            }}
          />

          {/* Top light beam */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 0.3, 0.1], scaleY: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="absolute top-0 w-px h-1/2 origin-bottom"
            style={{ background: 'linear-gradient(to top, rgba(6,182,212,0.4), transparent)' }}
          />

          {/* Bottom light beam */}
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: [0, 0.3, 0.1], scaleY: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="absolute bottom-0 w-px h-1/2 origin-top"
            style={{ background: 'linear-gradient(to bottom, rgba(6,182,212,0.4), transparent)' }}
          />

          {/* Left light beam */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 0.2, 0.05], scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="absolute left-0 h-px w-1/2 origin-right"
            style={{ background: 'linear-gradient(to left, rgba(37,99,235,0.4), transparent)' }}
          />

          {/* Right light beam */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 0.2, 0.05], scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="absolute right-0 h-px w-1/2 origin-left"
            style={{ background: 'linear-gradient(to right, rgba(37,99,235,0.4), transparent)' }}
          />

          {/* Floating particles — deterministic positions to avoid hydration mismatch */}
          {[
            { ix: -15, iy: 10, ax: -50, ay: -130, d: 1.7 },
            { ix: 12, iy: -8, ax: 40, ay: -160, d: 1.9 },
            { ix: -5, iy: 15, ax: -30, ay: -110, d: 2.0 },
            { ix: 18, iy: 5, ax: 55, ay: -140, d: 1.6 },
            { ix: -10, iy: -12, ax: -45, ay: -170, d: 2.1 },
            { ix: 8, iy: 18, ax: 20, ay: -120, d: 1.8 },
            { ix: -18, iy: -5, ax: -60, ay: -150, d: 2.2 },
            { ix: 14, iy: -15, ax: 35, ay: -180, d: 1.5 },
            { ix: -3, iy: 8, ax: -25, ay: -100, d: 2.0 },
            { ix: 16, iy: 12, ax: 50, ay: -135, d: 1.7 },
            { ix: -12, iy: -18, ax: -40, ay: -165, d: 1.9 },
            { ix: 6, iy: -10, ax: 15, ay: -145, d: 2.1 },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: p.ix, y: p.iy, scale: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [0, p.ay],
                x: [p.ix, p.ax],
                scale: [0, 1, 0.5],
              }}
              transition={{
                delay: 0.5 + i * 0.08,
                duration: p.d,
                ease: 'easeOut',
              }}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: i % 2 === 0 ? '#06b6d4' : '#2563eb',
                boxShadow: `0 0 6px ${i % 2 === 0 ? '#06b6d4' : '#2563eb'}`,
              }}
            />
          ))}

          {/* Logo — dramatic entrance */}
          <motion.div
            initial={{ opacity: 0, scale: 0.3, rotateY: 90 }}
            animate={{ opacity: 1, scale: [0.3, 1.15, 1], rotateY: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10"
          >
            {/* Logo glow */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.95, 1.1, 0.95],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-6 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)' }}
            />

            {/* Shield logo SVG — larger version */}
            <svg width={80} height={80} viewBox="0 0 48 48" fill="none" className="relative z-10 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <path
                d="M24 2L6 10V22C6 34.36 13.68 45.72 24 48C34.32 45.72 42 34.36 42 22V10L24 2Z"
                fill="url(#splashShield)"
                stroke="url(#splashStroke)"
                strokeWidth="1.5"
              />
              <path
                d="M27 8L16 26H22L20 40L32 20H26L27 8Z"
                fill="url(#splashBolt)"
              />
              <defs>
                <linearGradient id="splashShield" x1="6" y1="2" x2="42" y2="48">
                  <stop offset="0%" stopColor="#0c1929" />
                  <stop offset="100%" stopColor="#0a1120" />
                </linearGradient>
                <linearGradient id="splashStroke" x1="6" y1="2" x2="42" y2="48">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="splashBolt" x1="16" y1="8" x2="32" y2="40">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* Text — slides up with impact */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 relative z-10"
          >
            <h1 className="font-heading text-4xl font-bold tracking-wider">
              <span className="text-white">Out</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500">rank</span>
            </h1>
          </motion.div>

          {/* Tagline — fades in */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-sm text-slate-500 mt-2 relative z-10 tracking-wide"
          >
            Rise above the rest.
          </motion.p>

          {/* Loading bar — sleek */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="mt-10 w-48 h-[3px] bg-[#111] rounded-full overflow-hidden relative z-10"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ delay: 1, duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #2563eb, #06b6d4, #22d3ee)',
                boxShadow: '0 0 10px rgba(6,182,212,0.5)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
