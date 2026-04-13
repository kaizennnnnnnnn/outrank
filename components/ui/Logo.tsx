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
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
  xl: { icon: 72, text: 'text-5xl' },
};

export function Logo({ size = 'md', animate = false, showText = true, className }: LogoProps) {
  const s = sizeMap[size];

  const iconVariants = {
    idle: { rotate: 0 },
    animate: {
      rotate: [0, -5, 5, 0],
      transition: { duration: 0.6, ease: 'easeInOut' as const },
    },
  };

  const glowVariants = {
    idle: { opacity: 0 },
    animate: {
      opacity: [0, 0.6, 0],
      scale: [0.8, 1.2, 0.8],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
    },
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div className="relative">
        {/* Glow behind logo */}
        {animate && (
          <motion.div
            variants={glowVariants}
            initial="idle"
            animate="animate"
            className="absolute inset-0 rounded-full blur-xl"
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
              width: s.icon * 1.5,
              height: s.icon * 1.5,
              left: -(s.icon * 0.25),
              top: -(s.icon * 0.25),
            }}
          />
        )}

        <motion.svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 48 48"
          fill="none"
          variants={animate ? iconVariants : undefined}
          initial="idle"
          animate={animate ? 'animate' : 'idle'}
          whileHover={!animate ? { scale: 1.1, rotate: -5 } : undefined}
          className="relative z-10"
        >
          {/* Shield/badge shape */}
          <path
            d="M24 2L6 10V22C6 34.36 13.68 45.72 24 48C34.32 45.72 42 34.36 42 22V10L24 2Z"
            fill="url(#shieldGrad)"
            stroke="url(#strokeGrad)"
            strokeWidth="1.5"
          />

          {/* Inner lightning bolt - the core icon */}
          <path
            d="M27 8L16 26H22L20 40L32 20H26L27 8Z"
            fill="url(#boltGrad)"
          />

          {/* Small upward arrow accent */}
          <path
            d="M24 6L21 10H27L24 6Z"
            fill="#06b6d4"
            opacity="0.8"
          />

          <defs>
            <linearGradient id="shieldGrad" x1="6" y1="2" x2="42" y2="48">
              <stop offset="0%" stopColor="#0c1929" />
              <stop offset="100%" stopColor="#0a1120" />
            </linearGradient>
            <linearGradient id="strokeGrad" x1="6" y1="2" x2="42" y2="48">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="boltGrad" x1="16" y1="8" x2="32" y2="40">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {showText && (
        <span className={cn('font-heading font-bold tracking-wider', s.text)}>
          <span className="text-white">Out</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">rank</span>
        </span>
      )}
    </div>
  );
}
