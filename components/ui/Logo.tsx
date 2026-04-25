'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 28, text: 'text-lg' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 52, text: 'text-3xl' },
  xl: { icon: 80, text: 'text-5xl' },
};

export function Logo({ size = 'md', animate = false, showText = true, className }: LogoProps) {
  const s = sizeMap[size];

  const glowVariants = {
    idle: { opacity: 0 },
    animate: {
      opacity: [0, 0.5, 0],
      scale: [0.9, 1.1, 0.9],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
    },
  };

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <div className="relative">
        {/* Glow behind logo */}
        {animate && (
          <motion.div
            variants={glowVariants}
            initial="idle"
            animate="animate"
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)',
              width: s.icon * 1.6,
              height: s.icon * 1.6,
              left: -(s.icon * 0.3),
              top: -(s.icon * 0.3),
            }}
          />
        )}

        {/* Phoenix SVG — matches the splash-screen phoenix render. Same
            silhouette as the prior logo, with richer gradients (white-hot
            core, amber upper wings, hot tail spark) so the brand mark
            looks like the one on the loading screen. */}
        <motion.svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 64 64"
          fill="none"
          whileHover={!animate ? { scale: 1.08, rotate: -3 } : undefined}
          className="relative z-10 drop-shadow-[0_0_10px_rgba(220,38,38,0.35)]"
        >
          {/* Upper (back) wings — amber, drawn first so lower red wings overlap */}
          <path
            d="M26 28C22 26 16 22 10 18C6 16 2 16 2 16C2 16 8 22 14 26C20 30 24 30 26 28Z"
            fill="url(#phoenixWingLup)"
            opacity="0.8"
          />
          <path
            d="M38 28C42 26 48 22 54 18C58 16 62 16 62 16C62 16 56 22 50 26C44 30 40 30 38 28Z"
            fill="url(#phoenixWingRup)"
            opacity="0.8"
          />
          {/* Upper-wing rachis (feather spine highlights) */}
          <path d="M4 17 C 12 20 20 25 26 29" stroke="url(#phoenixWingHL)" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.6" />
          <path d="M60 17 C 52 20 44 25 38 29" stroke="url(#phoenixWingHR)" strokeWidth="0.4" strokeLinecap="round" fill="none" opacity="0.6" />

          {/* Lower (front) wings — warm red */}
          <path
            d="M28 36C24 34 18 30 12 28C8 27 4 28 4 28C4 28 10 32 16 34C22 36 26 37 28 36Z"
            fill="url(#phoenixWingL)"
          />
          <path
            d="M36 36C40 34 46 30 52 28C56 27 60 28 60 28C60 28 54 32 48 34C42 36 38 37 36 36Z"
            fill="url(#phoenixWingR)"
          />
          {/* Lower-wing rachis */}
          <path d="M5 28 C 13 31 21 34 28 36" stroke="url(#phoenixWingHL)" strokeWidth="0.5" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M59 28 C 51 31 43 34 36 36" stroke="url(#phoenixWingHR)" strokeWidth="0.5" strokeLinecap="round" fill="none" opacity="0.75" />

          {/* Body — flame */}
          <path
            d="M32 8C32 8 26 14 24 22C22 30 24 34 28 36C26 32 26 26 28 20C30 14 32 12 32 12C32 12 34 14 36 20C38 26 38 32 36 36C40 34 42 30 40 22C38 14 32 8 32 8Z"
            fill="url(#phoenixBody)"
          />
          {/* Hot inner core — brighter flame tongue inside the body */}
          <path
            d="M32 13C32 13 29 17 28 23C27 29 28 33 30 34C29 31 29 26 30 21C31 17 32 15 32 15C32 15 33 17 34 21C35 26 35 31 34 34C36 33 37 29 36 23C35 17 32 13 32 13Z"
            fill="url(#phoenixBodyCore)"
            opacity="0.85"
          />
          {/* Specular sliver on the body's leading edge */}
          <path d="M31.2 11 C 30 14 29 19 29 24" stroke="url(#phoenixBodySpec)" strokeWidth="0.55" strokeLinecap="round" fill="none" opacity="0.85" />

          {/* Tail — main */}
          <path
            d="M32 36C30 40 28 48 28 54C28 58 30 60 32 60C34 60 36 58 36 54C36 48 34 40 32 36Z"
            fill="url(#phoenixTail)"
          />
          {/* Tail inner highlight — hot core down the middle */}
          <path
            d="M32 40C31 44 30 50 30 54C30 56 31 57 32 57C33 57 34 56 34 54C34 50 33 44 32 40Z"
            fill="url(#phoenixTailInner)"
            opacity="0.75"
          />
          {/* Tiny bright nib at the tip — tail spark */}
          <path d="M32 57.3 C 31.5 58 31.5 59 32 59.5 C 32.5 59 32.5 58 32 57.3Z" fill="#fef3c7" opacity="0.9" />

          <defs>
            {/* Body — white-hot core through gold/orange/red/dark */}
            <linearGradient id="phoenixBody" x1="32" y1="8" x2="32" y2="40">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="18%" stopColor="#fde68a" />
              <stop offset="40%" stopColor="#fb923c" />
              <stop offset="68%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="phoenixBodyCore" x1="32" y1="13" x2="32" y2="34">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="phoenixBodySpec" x1="31" y1="11" x2="29" y2="24">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </linearGradient>

            {/* Lower (front) wings — amber edge fading into deep red */}
            <linearGradient id="phoenixWingL" x1="4" y1="28" x2="28" y2="36">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#fb923c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="phoenixWingR" x1="60" y1="28" x2="36" y2="36">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
              <stop offset="35%" stopColor="#fb923c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            {/* Upper (back) wings — warmer amber band */}
            <linearGradient id="phoenixWingLup" x1="2" y1="16" x2="26" y2="28">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="phoenixWingRup" x1="62" y1="16" x2="38" y2="28">
              <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* Feather-spine highlights */}
            <linearGradient id="phoenixWingHL" x1="4" y1="28" x2="28" y2="36">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0" />
              <stop offset="55%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="phoenixWingHR" x1="60" y1="28" x2="36" y2="36">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0" />
              <stop offset="55%" stopColor="#fef3c7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </linearGradient>

            {/* Tail — orange through deep red */}
            <linearGradient id="phoenixTail" x1="32" y1="36" x2="32" y2="60">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="45%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="phoenixTailInner" x1="32" y1="40" x2="32" y2="57">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {showText && (
        <span className={cn('font-heading font-bold tracking-wider', s.text)}>
          <span className="text-white">Out</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-orange-400">rank</span>
        </span>
      )}
    </div>
  );
}
