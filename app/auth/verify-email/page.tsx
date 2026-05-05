'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { resendVerificationEmail } from '@/lib/auth';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';

export default function VerifyEmailPage() {
  const addToast = useUIStore((s) => s.addToast);
  const { firebaseUser } = useAuth();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      addToast({ type: 'success', message: 'Verification email sent!' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send email.' });
    } finally {
      setSending(false);
    }
  };

  const email = firebaseUser?.email || 'your email address';

  return (
    <div
      className="dir-b min-h-screen flex flex-col"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)' }}
    >
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
          padding: '48px 22px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
        }}
      >
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center' }}
        >
          A note from the editor
        </div>

        <h1
          className="font-display"
          style={{
            fontSize: 42,
            fontWeight: 500,
            lineHeight: 1,
            margin: '8px 0 14px',
            textAlign: 'center',
          }}
        >
          <em style={{ fontStyle: 'italic' }}>Verify your </em>
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>email</em>
          <em style={{ fontStyle: 'italic' }}>.</em>
        </h1>

        <p
          className="font-body"
          style={{
            fontSize: 15,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: 1.55,
            margin: '0 auto 28px',
            maxWidth: 340,
          }}
        >
          We sent a link to <span style={{ color: 'var(--b-ink)', fontStyle: 'normal' }}>{email}</span>. Click it to confirm your account.
        </p>

        {/* Editorial blockquote — quiet hairline frame */}
        <div
          style={{
            borderTop: '1px solid var(--b-ink)',
            borderBottom: '1px solid var(--b-rule)',
            padding: '20px 4px',
            marginBottom: 28,
          }}
        >
          <p
            className="font-body"
            style={{
              fontSize: 13,
              color: 'var(--b-ink-60)',
              fontStyle: 'italic',
              lineHeight: 1.55,
              textAlign: 'center',
            }}
          >
            Didn&rsquo;t see it? Check spam, then resend below.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.button
            type="button"
            onClick={handleResend}
            disabled={sending}
            whileTap={{ scale: 0.98 }}
            className="font-body"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'transparent',
              color: 'var(--b-ink)',
              border: '1px solid var(--b-ink)',
              cursor: sending ? 'wait' : 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Resend verification →'}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => window.location.reload()}
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
            I&rsquo;ve verified — refresh →
          </motion.button>
        </div>

        <p
          className="font-body"
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--b-ink-60)',
            marginTop: 28,
            fontStyle: 'italic',
          }}
        >
          <Link
            href="/auth/login"
            className="spread"
            style={{
              fontSize: 10,
              color: 'var(--b-ink)',
              fontStyle: 'normal',
              borderBottom: '1px solid var(--b-ink)',
              paddingBottom: 1,
            }}
          >
            Back to sign in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
