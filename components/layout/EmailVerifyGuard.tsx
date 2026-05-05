'use client';

import { useAuth } from '@/hooks/useAuth';
import { resendVerificationEmail } from '@/lib/auth';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { MailFullIcon } from '@/components/ui/AppIcons';

/**
 * Editorial Direction B v2 dialog blocking the app until the user
 * verifies their email. Italic Fraunces headline, hairline-bordered
 * card on paper. Two CTAs: a filled-ink "Resend" and an outlined
 * "I've verified" that hard-reloads to recheck the auth flag.
 */
export function EmailVerifyGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  if (!isAuthenticated || isEmailVerified) {
    return <>{children}</>;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      addToast({ type: 'success', message: 'Verification email sent. Check your inbox.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send email. Try again later.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="dir-b min-h-screen flex items-center justify-center"
      style={{ background: 'var(--b-paper)', color: 'var(--b-ink)', padding: '24px 16px' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '28px 22px',
          borderTop: '2px solid var(--b-ink)',
          borderBottom: '1px solid var(--b-ink)',
        }}
      >
        <div className="spread" style={{ fontSize: 9, color: 'var(--b-accent)' }}>
          One last step
        </div>
        <h1
          className="font-display"
          style={{
            fontSize: 30,
            fontStyle: 'italic',
            fontWeight: 500,
            lineHeight: 1.1,
            margin: '4px 0 10px',
            color: 'var(--b-ink)',
          }}
        >
          Verify your email.
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--b-ink-60)' }}>
          <MailFullIcon size={28} />
          <p
            className="font-body"
            style={{ fontSize: 12, color: 'var(--b-ink-60)', lineHeight: 1.5, margin: 0 }}
          >
            We sent a link to your inbox. Click it to unlock the rest of Outrank — log habits, climb the standings, duel friends.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
          <button
            onClick={() => window.location.reload()}
            className="font-body"
            style={{
              width: '100%',
              height: 42,
              border: '1px solid var(--b-ink)',
              background: 'var(--b-ink)',
              color: 'var(--b-paper)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            I&rsquo;ve verified — refresh
          </button>
          <button
            onClick={handleResend}
            disabled={sending}
            className="font-body"
            style={{
              width: '100%',
              height: 42,
              border: '1px solid var(--b-ink)',
              background: 'transparent',
              color: 'var(--b-ink)',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.5 : 1,
            }}
          >
            {sending ? 'Sending…' : 'Resend verification email'}
          </button>
        </div>
      </div>
    </div>
  );
}
