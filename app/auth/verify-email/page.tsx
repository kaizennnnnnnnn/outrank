'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { resendVerificationEmail } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';

export default function VerifyEmailPage() {
  const addToast = useUIStore((s) => s.addToast);
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

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-6"
      >
        <div className="text-6xl">📧</div>
        <h1 className="text-2xl font-bold text-white font-heading">Check Your Email</h1>
        <p className="text-slate-400">
          We&apos;ve sent a verification link to your email address. Click the link to verify your account and unlock all features.
        </p>

        <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl p-6 space-y-3">
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

        <Link href="/auth/login" className="text-sm text-orange-400 hover:text-orange-300">
          Back to Login
        </Link>
      </motion.div>
    </div>
  );
}
