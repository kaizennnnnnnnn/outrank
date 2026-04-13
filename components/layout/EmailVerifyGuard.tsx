'use client';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { resendVerificationEmail } from '@/lib/auth';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';

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
      addToast({ type: 'success', message: 'Verification email sent! Check your inbox.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to send email. Try again later.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">📧</div>
        <h1 className="text-2xl font-bold text-white font-heading">Verify Your Email</h1>
        <p className="text-slate-400">
          We sent a verification link to your email. Click it to unlock all features of Outrank.
        </p>
        <div className="space-y-3">
          <Button onClick={handleResend} loading={sending} className="w-full">
            Resend Verification Email
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            I&apos;ve Verified - Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
