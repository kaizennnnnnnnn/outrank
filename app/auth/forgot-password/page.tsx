'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/lib/validations';
import { resetPassword } from '@/lib/auth';
import { useUIStore } from '@/store/uiStore';

export default function ForgotPasswordPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

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
      setSubmittedEmail(data.email);
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
        }}
      >
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center' }}
        >
          Lost your way
        </div>

        <h1
          className="font-display"
          style={{
            fontSize: 44,
            fontWeight: 500,
            lineHeight: 1,
            margin: '8px 0 6px',
            textAlign: 'center',
          }}
        >
          <em style={{ fontStyle: 'italic' }}>Reset </em>
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>password</em>
          <em style={{ fontStyle: 'italic' }}>.</em>
        </h1>

        <p
          className="font-body"
          style={{
            fontSize: 14,
            color: 'var(--b-ink-60)',
            textAlign: 'center',
            fontStyle: 'italic',
            marginBottom: 32,
          }}
        >
          We&rsquo;ll send you a reset link.
        </p>

        {sent ? (
          /* Editorial blockquote success state */
          <div>
            <div
              style={{
                borderTop: '1px solid var(--b-ink)',
                borderBottom: '1px solid var(--b-rule)',
                padding: '24px 4px',
                marginBottom: 24,
              }}
            >
              <div
                className="spread"
                style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center', marginBottom: 8 }}
              >
                Sent
              </div>
              <p
                className="font-display"
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  margin: 0,
                }}
              >
                Check{' '}
                <span style={{ color: 'var(--b-accent)' }}>{submittedEmail}</span>{' '}
                for the reset link.
              </p>
            </div>
            <Link href="/auth/login" style={{ display: 'block' }}>
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
                Back to sign in →
              </motion.button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <EditorialField
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="font-body"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--b-ink)',
                color: 'var(--b-paper)',
                border: '1px solid var(--b-ink)',
                cursor: loading ? 'wait' : 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                opacity: loading ? 0.6 : 1,
                marginTop: 4,
              }}
            >
              {loading ? 'Sending…' : 'Send reset link →'}
            </motion.button>
          </form>
        )}

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
          Remember your password?{' '}
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
            Sign in →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

interface EditorialFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const EditorialField = forwardRef<HTMLInputElement, EditorialFieldProps>(
  ({ label, error, type = 'text', ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label className="spread" style={{ fontSize: 9, color: 'var(--b-ink-60)' }}>
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        {...props}
        className="font-body"
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: error ? '1px solid var(--b-accent)' : '1px solid var(--b-ink)',
          padding: '8px 0',
          fontSize: 16,
          color: 'var(--b-ink)',
          outline: 'none',
          width: '100%',
        }}
      />
      {error && (
        <span
          className="font-body"
          style={{ fontSize: 12, color: 'var(--b-accent)', fontStyle: 'italic' }}
        >
          {error}
        </span>
      )}
    </div>
  ),
);
EditorialField.displayName = 'EditorialField';
