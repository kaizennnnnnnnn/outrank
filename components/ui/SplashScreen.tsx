'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface SplashScreenProps {
  show: boolean;
}

const EMBERS = Array.from({ length: 28 }, (_, i) => {
  const rand = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };
  return {
    x: (rand(i + 1) - 0.5) * 240,
    delay: 0.25 + rand(i + 2) * 0.9,
    dur: 1.6 + rand(i + 3) * 1.2,
    end: -(160 + rand(i + 4) * 160),
    size: rand(i + 5) < 0.25 ? 4 : rand(i + 5) < 0.55 ? 3 : 2,
    hot: rand(i + 6) < 0.5,
    drift: (rand(i + 7) - 0.5) * 120,
  };
});

const SHOCKWAVES = [
  { delay: 0.25, duration: 1.4, color: 'rgba(220,38,38,0.55)', scale: 6 },
  { delay: 0.40, duration: 1.5, color: 'rgba(239,68,68,0.4)', scale: 7 },
  { delay: 0.55, duration: 1.6, color: 'rgba(251,191,36,0.3)', scale: 8 },
  { delay: 0.80, duration: 1.5, color: 'rgba(220,38,38,0.2)', scale: 5.5 },
];

const BEAMS = [
  { rot: -18, delay: 0.45 },
  { rot: -6, delay: 0.50 },
  { rot: 6, delay: 0.55 },
  { rot: 18, delay: 0.60 },
];

const ORBIT_SPARKS = Array.from({ length: 8 }, (_, i) => ({
  angle: (i / 8) * Math.PI * 2,
  delay: 0.6 + i * 0.03,
}));

const LETTERS = [
  { char: 'O', color: 'white' },
  { char: 'u', color: 'white' },
  { char: 't', color: 'white' },
  { char: 'r', color: 'grad' },
  { char: 'a', color: 'grad' },
  { char: 'n', color: 'grad' },
  { char: 'k', color: 'grad' },
];

export function SplashScreen({ show }: SplashScreenProps) {
  const embers = useMemo(() => EMBERS, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.15, filter: 'blur(12px)' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[300] bg-[#06060c] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Slow low-frequency camera shake — keeps everything breathing */}
          <motion.div
            animate={{ x: [0, -2, 1, -1, 2, 0], y: [0, 1, -1, 2, -1, 0] }}
            transition={{ duration: 0.45, repeat: 6, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Radial darkness pulsing red from center */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.45] }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(220,38,38,0.22) 0%, rgba(127,29,29,0.08) 35%, transparent 65%)',
              }}
            />

            {/* Big ignition flash — single bright burst */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 2.2, 3.5] }}
              transition={{ delay: 0.35, duration: 0.55, ease: 'easeOut' }}
              className="absolute w-[280px] h-[280px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,240,200,0.95) 0%, rgba(251,191,36,0.6) 22%, rgba(239,68,68,0.3) 45%, transparent 70%)',
                filter: 'blur(2px)',
              }}
            />

            {/* Shockwaves */}
            {SHOCKWAVES.map((s, i) => (
              <motion.div
                key={`sw-${i}`}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: s.scale, opacity: 0 }}
                transition={{ delay: s.delay, duration: s.duration, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border-2"
                style={{ borderColor: s.color, boxShadow: `0 0 30px ${s.color}` }}
              />
            ))}

            {/* Embers drifting up */}
            {embers.map((p, i) => (
              <motion.div
                key={`em-${i}`}
                initial={{ opacity: 0, x: p.x, y: 80, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [80, p.end],
                  x: [p.x, p.x + p.drift],
                  scale: [0, 1.1, 0.2],
                }}
                transition={{ delay: p.delay, duration: p.dur, ease: 'easeOut' }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: p.hot ? '#fef3c7' : '#f97316',
                  boxShadow: `0 0 ${p.size * 4}px ${p.hot ? '#fbbf24' : '#ef4444'}, 0 0 ${p.size * 8}px ${p.hot ? '#f59e0b' : '#dc2626'}`,
                }}
              />
            ))}

            {/* Vertical energy beams behind phoenix */}
            {BEAMS.map((b, i) => (
              <motion.div
                key={`beam-${i}`}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 0.85, 0], scaleY: [0, 1, 0.6] }}
                transition={{ delay: b.delay, duration: 0.7, ease: 'easeOut' }}
                className="absolute origin-bottom"
                style={{
                  width: 3,
                  height: 260,
                  bottom: '50%',
                  transform: `rotate(${b.rot}deg)`,
                  background:
                    'linear-gradient(to top, rgba(251,191,36,0.9) 0%, rgba(239,68,68,0.6) 40%, transparent 100%)',
                  filter: 'blur(1px)',
                  boxShadow: '0 0 12px rgba(239,68,68,0.8)',
                }}
              />
            ))}

            {/* Lightning crackles — short angular bolts */}
            {[0, 1, 2].map((i) => (
              <motion.svg
                key={`bolt-${i}`}
                width="140"
                height="140"
                viewBox="0 0 140 140"
                className="absolute"
                style={{
                  transform: `rotate(${i * 120}deg) translateY(-90px)`,
                  mixBlendMode: 'screen',
                }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 1.2] }}
                transition={{ delay: 0.42 + i * 0.05, duration: 0.35 }}
              >
                <path
                  d="M70 30 L62 60 L78 58 L60 100 L70 74 L56 76 L70 30"
                  fill="none"
                  stroke="#fef3c7"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 6px #fbbf24)' }}
                />
              </motion.svg>
            ))}

            {/* Phoenix — swoop in + wing flap loop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.15, y: 80, rotate: -8 }}
              animate={{
                opacity: 1,
                scale: [0.15, 1.35, 0.95, 1.05, 1],
                y: [80, -20, 4, -2, 0],
                rotate: [-8, 4, -2, 1, 0],
              }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], times: [0, 0.4, 0.6, 0.8, 1] }}
              className="relative z-10"
            >
              {/* Pulsing halo */}
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.25, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-10 rounded-full blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(251,191,36,0.45) 0%, rgba(220,38,38,0.3) 40%, transparent 70%)',
                }}
              />

              {/* Orbiting sparks */}
              {ORBIT_SPARKS.map((o, i) => (
                <motion.div
                  key={`orb-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0.6, 1, 0.4],
                    scale: [0, 1, 1, 1, 0.5],
                    rotate: [0, 360],
                  }}
                  transition={{
                    delay: o.delay,
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute top-1/2 left-1/2 w-0 h-0"
                  style={{ transform: `rotate(${(o.angle * 180) / Math.PI}deg)` }}
                >
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: 3,
                      height: 3,
                      left: 64,
                      top: -1.5,
                      background: '#fef3c7',
                      boxShadow: '0 0 8px #fbbf24, 0 0 16px #f97316',
                    }}
                  />
                </motion.div>
              ))}

              {/* Phoenix icon with wing flap */}
              <motion.div
                animate={{ scaleX: [1, 1.12, 0.95, 1.08, 1], scaleY: [1, 0.94, 1.03, 0.97, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg
                  width={100}
                  height={100}
                  viewBox="0 0 64 64"
                  fill="none"
                  className="relative z-10 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]"
                >
                  <path d="M32 8C32 8 26 14 24 22C22 30 24 34 28 36C26 32 26 26 28 20C30 14 32 12 32 12C32 12 34 14 36 20C38 26 38 32 36 36C40 34 42 30 40 22C38 14 32 8 32 8Z" fill="url(#splashBody)" />
                  <path d="M28 36C24 34 18 30 12 28C8 27 4 28 4 28C4 28 10 32 16 34C22 36 26 37 28 36Z" fill="url(#splashWingL)" />
                  <path d="M36 36C40 34 46 30 52 28C56 27 60 28 60 28C60 28 54 32 48 34C42 36 38 37 36 36Z" fill="url(#splashWingR)" />
                  <path d="M26 28C22 26 16 22 10 18C6 16 2 16 2 16C2 16 8 22 14 26C20 30 24 30 26 28Z" fill="url(#splashWingL)" opacity="0.7" />
                  <path d="M38 28C42 26 48 22 54 18C58 16 62 16 62 16C62 16 56 22 50 26C44 30 40 30 38 28Z" fill="url(#splashWingR)" opacity="0.7" />
                  <path d="M32 36C30 40 28 48 28 54C28 58 30 60 32 60C34 60 36 58 36 54C36 48 34 40 32 36Z" fill="url(#splashTail)" />
                  <path d="M32 40C31 44 30 50 30 54C30 56 31 57 32 57C33 57 34 56 34 54C34 50 33 44 32 40Z" fill="url(#splashTailI)" opacity="0.6" />
                  <defs>
                    <linearGradient id="splashBody" x1="32" y1="8" x2="32" y2="40">
                      <stop offset="0%" stopColor="#fef3c7" />
                      <stop offset="30%" stopColor="#fbbf24" />
                      <stop offset="65%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                    <linearGradient id="splashWingL" x1="4" y1="28" x2="28" y2="36">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    <linearGradient id="splashWingR" x1="60" y1="28" x2="36" y2="36">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    <linearGradient id="splashTail" x1="32" y1="36" x2="32" y2="60">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#7f1d1d" />
                    </linearGradient>
                    <linearGradient id="splashTailI" x1="32" y1="40" x2="32" y2="57">
                      <stop offset="0%" stopColor="#fef3c7" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </motion.div>

            {/* Letter-by-letter logo reveal */}
            <div className="mt-6 relative z-10 flex gap-[1px]">
              {LETTERS.map((l, i) => (
                <motion.span
                  key={`ltr-${i}`}
                  initial={{ opacity: 0, y: 30, scale: 0.4, rotate: -25, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: 0.85 + i * 0.055,
                    duration: 0.55,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={
                    'font-heading text-4xl font-bold tracking-wider ' +
                    (l.color === 'white'
                      ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                      : 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-red-500 to-red-700 drop-shadow-[0_0_12px_rgba(239,68,68,0.5)]')
                  }
                >
                  {l.char}
                </motion.span>
              ))}
            </div>

            {/* Tagline — flicker in */}
            <motion.p
              initial={{ opacity: 0, y: 10, letterSpacing: '0.05em' }}
              animate={{
                opacity: [0, 0.3, 1, 0.7, 1],
                y: 0,
                letterSpacing: '0.2em',
              }}
              transition={{ delay: 1.25, duration: 0.75, ease: 'easeOut' }}
              className="text-[11px] text-orange-300/80 mt-2.5 relative z-10 uppercase font-mono tracking-[0.2em]"
            >
              Rise above the rest
            </motion.p>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.35, duration: 0.3 }}
              className="mt-10 w-48 h-[3px] bg-[#111] rounded-full overflow-hidden relative z-10"
              style={{ boxShadow: '0 0 15px rgba(220,38,38,0.3) inset' }}
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ delay: 1.35, duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
                className="h-full rounded-full relative"
                style={{
                  background:
                    'linear-gradient(90deg, #7f1d1d, #dc2626, #ef4444, #fbbf24, #fef3c7)',
                  boxShadow: '0 0 14px rgba(251,191,36,0.7)',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.1, delay: 1.35, ease: 'linear' }}
                  className="absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
