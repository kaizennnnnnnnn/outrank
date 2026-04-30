'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';

/**
 * Cold-open entry for unauthenticated users. Two paths:
 *   1. Get Started → /welcome/intro (4-page carousel, then funnel)
 *   2. I have an account → /auth/login
 *
 * No nav, no chrome. The phoenix mascot is the hero. Aurora background
 * matches the marketing landing for visual continuity.
 */
export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col relative overflow-hidden">
      {/* Aurora — same red/orange palette as the marketing landing */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.45), transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full opacity-45 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.40), transparent 65%)' }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, #000 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 50%, #000 30%, transparent 80%)',
          }}
        />
      </div>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <PhoenixMascot size={150} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="font-heading text-4xl sm:text-5xl font-bold text-white text-center mt-8 leading-tight"
        >
          Welcome to{' '}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(90deg, #fb923c, #ef4444, #fb923c)',
            }}
          >
            Outrank
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-slate-300/85 text-center mt-4 max-w-sm text-base leading-relaxed"
        >
          Build the version of you that doesn&apos;t quit.
        </motion.p>
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="relative px-6 pb-10 space-y-3 max-w-md w-full mx-auto"
      >
        <Link href="/welcome/intro" className="block">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-full font-bold text-base text-white shadow-lg shadow-red-600/30 transition-all"
            style={{
              background: 'linear-gradient(90deg, #dc2626, #f97316)',
            }}
          >
            GET STARTED
          </motion.button>
        </Link>
        <Link href="/auth/login" className="block">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-full font-bold text-base text-slate-200 bg-transparent border border-white/15 hover:bg-white/[0.04] transition-colors"
          >
            I HAVE AN ACCOUNT
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
