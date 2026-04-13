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

        {/* Phoenix SVG */}
        <motion.svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 64 64"
          fill="none"
          whileHover={!animate ? { scale: 1.08, rotate: -3 } : undefined}
          className="relative z-10"
        >
          {/* Phoenix body — rising bird with spread wings */}
          <path
            d="M32 8C32 8 26 14 24 22C22 30 24 34 28 36C26 32 26 26 28 20C30 14 32 12 32 12C32 12 34 14 36 20C38 26 38 32 36 36C40 34 42 30 40 22C38 14 32 8 32 8Z"
            fill="url(#phoenixBody)"
          />
          {/* Left wing */}
          <path
            d="M28 36C24 34 18 30 12 28C8 27 4 28 4 28C4 28 10 32 16 34C22 36 26 37 28 36Z"
            fill="url(#phoenixWingL)"
          />
          {/* Right wing */}
          <path
            d="M36 36C40 34 46 30 52 28C56 27 60 28 60 28C60 28 54 32 48 34C42 36 38 37 36 36Z"
            fill="url(#phoenixWingR)"
          />
          {/* Left wing upper */}
          <path
            d="M26 28C22 26 16 22 10 18C6 16 2 16 2 16C2 16 8 22 14 26C20 30 24 30 26 28Z"
            fill="url(#phoenixWingL)"
            opacity="0.7"
          />
          {/* Right wing upper */}
          <path
            d="M38 28C42 26 48 22 54 18C58 16 62 16 62 16C62 16 56 22 50 26C44 30 40 30 38 28Z"
            fill="url(#phoenixWingR)"
            opacity="0.7"
          />
          {/* Tail feathers */}
          <path
            d="M32 36C30 40 28 48 28 54C28 58 30 60 32 60C34 60 36 58 36 54C36 48 34 40 32 36Z"
            fill="url(#phoenixTail)"
          />
          {/* Inner tail detail */}
          <path
            d="M32 40C31 44 30 50 30 54C30 56 31 57 32 57C33 57 34 56 34 54C34 50 33 44 32 40Z"
            fill="url(#phoenixTailInner)"
            opacity="0.6"
          />
          {/* Head crest */}
          <path
            d="M32 8C32 8 30 4 28 2C30 4 32 6 32 8Z"
            stroke="url(#phoenixBody)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M32 8C32 8 34 4 36 2C34 4 32 6 32 8Z"
            stroke="url(#phoenixBody)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <defs>
            <linearGradient id="phoenixBody" x1="32" y1="8" x2="32" y2="40">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="phoenixWingL" x1="4" y1="28" x2="28" y2="36">
              <stop offset="0%" stopColor="#fbbf24" opacity="0.4" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="phoenixWingR" x1="60" y1="28" x2="36" y2="36">
              <stop offset="0%" stopColor="#fbbf24" opacity="0.4" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="phoenixTail" x1="32" y1="36" x2="32" y2="60">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="phoenixTailInner" x1="32" y1="40" x2="32" y2="57">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#ef4444" />
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
