'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { PhoenixMascot } from '@/components/onboarding/PhoenixMascot';

/**
 * Cold-open entry for unauthenticated users. Two paths:
 *   1. Get Started → /welcome/intro (5-page carousel, then funnel)
 *   2. I have an account → /auth/login
 *
 * Editorial Direction B v2 — paper-and-ink. The phoenix mascot is the
 * hero; the rest of the page reads like the cover of a periodical
 * issue: spread caps brand, italic display headline, body subtitle,
 * filled-ink CTA pair.
 */
export default function WelcomePage() {
  return (
    <div
      className="dir-b min-h-screen flex flex-col"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
      {/* Brand nameplate */}
      <div
        className="spread"
        style={{
          fontSize: 11,
          color: 'var(--b-ink)',
          letterSpacing: '0.32em',
          padding: '24px 22px 12px',
          borderBottom: '1px solid var(--b-rule)',
          textAlign: 'center',
        }}
      >
        OUTRANK
      </div>

      {/* Hero */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 22px 16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <PhoenixMascot size={150} greeting />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', marginTop: 32 }}
        >
          Volume One · Issue One
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="font-display"
          style={{
            fontSize: 50,
            fontWeight: 500,
            lineHeight: 1,
            margin: '6px 0 0',
            textAlign: 'center',
          }}
        >
          Welcome to{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>Outrank</em>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-body"
          style={{
            fontSize: 14,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
            marginTop: 14,
            maxWidth: 360,
            lineHeight: 1.55,
            fontStyle: 'italic',
          }}
        >
          Build the version of you that doesn&rsquo;t quit.
        </motion.p>
      </div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        style={{
          padding: '14px 22px 32px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <Link href="/welcome/intro" style={{ display: 'block' }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="font-body"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--b-ink)',
              color: 'var(--b-paper)',
              border: '1px solid var(--b-ink)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Get started →
          </motion.button>
        </Link>
        <Link href="/auth/login" style={{ display: 'block' }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="font-body"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              color: 'var(--b-ink-60)',
              border: '1px solid var(--b-ink)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            I have an account
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
