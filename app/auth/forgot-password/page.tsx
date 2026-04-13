'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validations';
import { resetPassword } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/store/uiStore';
import { Logo } from '@/components/ui/Logo';

export default function ForgotPasswordPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setSent(true);
      addToast({ type: 'success', message: 'Reset email sent! Check your inbox.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      addToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080f] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex mb-6">
            <Logo size="md" />
          </Link>
          <h1 className="text-2xl font-bold text-white font-heading">Reset Password</h1>
          <p className="text-slate-500 mt-1">We&apos;ll send you a reset link</p>
        </div>

        <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-5xl">📬</div>
              <p className="text-slate-300">Check your email for a password reset link.</p>
              <Link href="/auth/login">
                <Button variant="secondary" className="w-full mt-4">
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" className="w-full" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-medium">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
