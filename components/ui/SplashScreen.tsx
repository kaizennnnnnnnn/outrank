'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  show: boolean;
}

const EMBERS = [
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
  { x: -100, delay: 0.45, dur: 2.2, end: -200 },
  { x: 100, delay: 0.65, dur: 2.0, end: -215 },
  { x: -45, delay: 1.0, dur: 1.8, end: -175 },
  { x: 30, delay: 1.1, dur: 2.2, end: -225 },
  { x: -70, delay: 0.25, dur: 2.3, end: -205 },
];

const LETTERS = [
  { char: 'O', gradient: false },
  { char: 'u', gradient: false },
  { char: 't', gradient: false },
  { char: 'r', gradient: true },
  { char: 'a', gradient: true },
  { char: 'n', gradient: true },
  { char: 'k', gradient: true },
];

export function SplashScreen({ show }: SplashScreenProps) {
  // Gate all animated content behind a client-only flag. The SSR HTML
  // renders only the dark backdrop — no phoenix, no letters — so nothing
  // is visible before hydration. Once mounted, framer-motion plays the
  // full entrance from its true initial state. This kills the
  // "phoenix pops out, vanishes, then animates back in" flash.
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
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[300] bg-[#06060c] flex flex-col items-center justify-center overflow-hidden"
        >
          {mounted && (
            <>
          {/* Ember particles rising */}
          {EMBERS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: p.x, y: 50, scale: 0 }}
              animate={{
                opacity: [0, 0.9, 0],
                y: [50, p.end],
                x: [p.x, p.x * 0.5],
                scale: [0, 1, 0.3],
              }}
              transition={{ delay: p.delay, duration: p.dur, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: i % 4 === 0 ? 4 : i % 3 === 0 ? 3 : 2,
                height: i % 4 === 0 ? 4 : i % 3 === 0 ? 3 : 2,
                background: i % 3 === 0 ? '#fef3c7' : i % 2 === 0 ? '#ef4444' : '#fbbf24',
                boxShadow: `0 0 ${i % 3 === 0 ? 10 : 6}px ${i % 2 === 0 ? '#ef4444' : '#fbbf24'}`,
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
              background:
                'radial-gradient(circle, rgba(220,38,38,0.2) 0%, rgba(239,68,68,0.08) 30%, transparent 60%)',
            }}
          />

          {/* Expanding heat rings — three of them, staggered */}
          <motion.div
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ delay: 0.3, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full border border-red-600/40"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.3 }}
            animate={{ scale: 5, opacity: 0 }}
            transition={{ delay: 0.5, duration: 1.5, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full border border-orange-500/30"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ delay: 0.75, duration: 1.7, ease: 'easeOut' }}
            className="absolute w-24 h-24 rounded-full border border-amber-400/25"
          />

          {/* Phoenix SVG — dramatic entrance with wobble + continuous wing flap */}
          <motion.div
            initial={{ opacity: 0, scale: 0.2, y: 40, rotate: -4 }}
            animate={{
              opacity: 1,
              scale: [0.2, 1.25, 0.95, 1.02, 1],
              y: [40, -15, 2, -1, 0],
              rotate: [-4, 3, -1, 0, 0],
            }}
            transition={{
              duration: 1.0,
              ease: [0.16, 1, 0.3, 1],
              times: [0, 0.4, 0.65, 0.85, 1],
            }}
            className="relative z-10"
          >
            {/* Breathing glow */}
            <motion.div
              animate={{ opacity: [0.25, 0.6, 0.25], scale: [0.95, 1.2, 0.95] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-8 rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(220,38,38,0.4) 0%, rgba(251,191,36,0.15) 40%, transparent 65%)',
              }}
            />

            {/* Phoenix with gentle flap — scale only, GPU-composited */}
            <motion.div
              animate={{ scale: [1, 1.06, 0.97, 1.04, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg
                width={90}
                height={90}
                viewBox="0 0 64 64"
                fill="none"
                className="relative z-10 drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]"
              >
                {/* Upper (back) wings — amber layer, drawn first so lower red wings overlap them */}
                <path d="M26 28C22 26 16 22 10 18C6 16 2 16 2 16C2 16 8 22 14 26C20 30 24 30 26 28Z" fill="url(#splashWingLup)" opacity="0.8" />
                <path d="M38 28C42 26 48 22 54 18C58 16 62 16 62 16C62 16 56 22 50 26C44 30 40 30 38 28Z" fill="url(#splashWingRup)" opacity="0.8" />
                {/* Upper-wing bright rachis (feather spine) */}
                <path d="M4 17 C 12 20 20 25 26 29" stroke="url(#splashWingHL)" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.6" />
                <path d="M60 17 C 52 20 44 25 38 29" stroke="url(#splashWingHR)" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.6" />

                {/* Lower (front) wings — warm red */}
                <path d="M28 36C24 34 18 30 12 28C8 27 4 28 4 28C4 28 10 32 16 34C22 36 26 37 28 36Z" fill="url(#splashWingL)" />
                <path d="M36 36C40 34 46 30 52 28C56 27 60 28 60 28C60 28 54 32 48 34C42 36 38 37 36 36Z" fill="url(#splashWingR)" />
                {/* Lower-wing rachis */}
                <path d="M5 28 C 13 31 21 34 28 36" stroke="url(#splashWingHL)" strokeWidth="0.5" strokeLinecap="round" fill="none" opacity="0.75" />
                <path d="M59 28 C 51 31 43 34 36 36" stroke="url(#splashWingHR)" strokeWidth="0.5" strokeLinecap="round" fill="none" opacity="0.75" />

                {/* Body — flame */}
                <path d="M32 8C32 8 26 14 24 22C22 30 24 34 28 36C26 32 26 26 28 20C30 14 32 12 32 12C32 12 34 14 36 20C38 26 38 32 36 36C40 34 42 30 40 22C38 14 32 8 32 8Z" fill="url(#splashBody)" />
                {/* Body hot inner core — brighter flame tongue inside */}
                <path d="M32 13C32 13 29 17 28 23C27 29 28 33 30 34C29 31 29 26 30 21C31 17 32 15 32 15C32 15 33 17 34 21C35 26 35 31 34 34C36 33 37 29 36 23C35 17 32 13 32 13Z" fill="url(#splashBodyCore)" opacity="0.85" />
                {/* Highlight sliver on the body's leading edge */}
                <path d="M31.2 11 C 30 14 29 19 29 24" stroke="url(#splashBodySpec)" strokeWidth="0.55" strokeLinecap="round" fill="none" opacity="0.85" />

                {/* Tail — main */}
                <path d="M32 36C30 40 28 48 28 54C28 58 30 60 32 60C34 60 36 58 36 54C36 48 34 40 32 36Z" fill="url(#splashTail)" />
                {/* Tail inner highlight — hot core running down the middle */}
                <path d="M32 40C31 44 30 50 30 54C30 56 31 57 32 57C33 57 34 56 34 54C34 50 33 44 32 40Z" fill="url(#splashTailI)" opacity="0.75" />
                {/* Tail tip spark — tiny bright nib at the drop point */}
                <path d="M32 57.3 C 31.5 58 31.5 59 32 59.5 C 32.5 59 32.5 58 32 57.3Z" fill="#fef3c7" opacity="0.9" />

                <defs>
                  {/* Body gradient — white-hot core through gold/orange/red/dark */}
                  <linearGradient id="splashBody" x1="32" y1="8" x2="32" y2="40">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="18%" stopColor="#fde68a" />
                    <stop offset="40%" stopColor="#fb923c" />
                    <stop offset="68%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#7f1d1d" />
                  </linearGradient>
                  <linearGradient id="splashBodyCore" x1="32" y1="13" x2="32" y2="34">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="35%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="splashBodySpec" x1="31" y1="11" x2="29" y2="24">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                  </linearGradient>

                  {/* Lower (front) wings — amber edge fading into deep red */}
                  <linearGradient id="splashWingL" x1="4" y1="28" x2="28" y2="36">
                    <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
                    <stop offset="35%" stopColor="#fb923c" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>
                  <linearGradient id="splashWingR" x1="60" y1="28" x2="36" y2="36">
                    <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
                    <stop offset="35%" stopColor="#fb923c" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#b91c1c" />
                  </linearGradient>

                  {/* Upper (back) wings — warmer amber band */}
                  <linearGradient id="splashWingLup" x1="2" y1="16" x2="26" y2="28">
                    <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                  <linearGradient id="splashWingRup" x1="62" y1="16" x2="38" y2="28">
                    <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>

                  {/* Feather-spine highlights */}
                  <linearGradient id="splashWingHL" x1="4" y1="28" x2="28" y2="36">
                    <stop offset="0%" stopColor="#fef3c7" stopOpacity="0" />
                    <stop offset="55%" stopColor="#fef3c7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="splashWingHR" x1="60" y1="28" x2="36" y2="36">
                    <stop offset="0%" stopColor="#fef3c7" stopOpacity="0" />
                    <stop offset="55%" stopColor="#fef3c7" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
                  </linearGradient>

                  {/* Tail — orange through deep red */}
                  <linearGradient id="splashTail" x1="32" y1="36" x2="32" y2="60">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="45%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#7f1d1d" />
                  </linearGradient>
                  <linearGradient id="splashTailI" x1="32" y1="40" x2="32" y2="57">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>

          {/* Letter-by-letter logo reveal */}
          {/* Letter reveal */}
          <div className="mt-5 relative z-10 flex gap-[1px]">
            {LETTERS.map((l, i) => (
              <motion.span
                key={i}
                style={{ display: 'inline-block' }}
                initial={{ opacity: 0, y: 22, scale: 0.5, rotate: -14 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2 + i * 0.05,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={
                  'font-heading text-4xl font-bold tracking-wider ' +
                  (l.gradient
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-orange-400'
                    : 'text-white')
                }
              >
                {l.char}
              </motion.span>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="text-sm text-slate-500 mt-2 relative z-10 tracking-wide"
          >
            Rise above the rest.
          </motion.p>

          {/* Loading bar with shimmer */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.25 }}
            className="mt-10 w-48 h-[3px] bg-[#111] rounded-full overflow-hidden relative z-10"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              transition={{ delay: 0.9, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-full relative"
              style={{
                background: 'linear-gradient(90deg, #991b1b, #dc2626, #ef4444, #fbbf24)',
                boxShadow: '0 0 10px rgba(220,38,38,0.5)',
              }}
            >
              <motion.div
                animate={{ x: ['-120%', '320%'] }}
                transition={{ duration: 0.8, delay: 0.9, ease: 'linear' }}
                className="absolute inset-y-0 w-1/3"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                }}
              />
            </motion.div>
          </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
