'use client';

import { forwardRef, InputHTMLAttributes, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { registerSchema, RegisterInput } from '@/lib/validations';
import { registerWithEmail, loginWithGoogle } from '@/lib/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sanitizeUsername } from '@/lib/security';
import { useUIStore } from '@/store/uiStore';

export default function RegisterPage() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const watchUsername = watch('username');

  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const sanitized = sanitizeUsername(username).toLowerCase();
      const docSnap = await getDoc(doc(db, 'usernames', sanitized));
      setUsernameAvailable(!docSnap.exists());
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      await registerWithEmail(data.email, data.password, sanitizeUsername(data.username));
      addToast({ type: 'success', message: 'Account created! Check your email to verify.' });
      router.push('/onboarding');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      addToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { isNewUser } = await loginWithGoogle();
      router.push(isNewUser ? '/onboarding' : '/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
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
          padding: '32px 22px 32px',
        }}
      >
        <div
          className="spread"
          style={{ fontSize: 9, color: 'var(--b-ink-60)', textAlign: 'center' }}
        >
          Volume One · Issue One
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
          <em style={{ fontStyle: 'italic' }}>Create </em>
          <em style={{ fontStyle: 'italic', color: 'var(--b-accent)' }}>account</em>
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
          Start competing with friends today.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <EditorialField
              label="Username"
              placeholder="your_username"
              error={errors.username?.message}
              {...register('username', {
                onBlur: (e) => checkUsername(e.target.value),
              })}
            />
            {checkingUsername && (
              <p className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-40)', marginTop: 4, fontStyle: 'italic' }}>
                Checking…
              </p>
            )}
            {usernameAvailable === true && watchUsername && watchUsername.length >= 3 && (
              <p className="font-body" style={{ fontSize: 11, color: 'var(--b-ink-60)', marginTop: 4, fontStyle: 'italic' }}>
                Available.
              </p>
            )}
            {usernameAvailable === false && (
              <p className="font-body" style={{ fontSize: 11, color: 'var(--b-accent)', marginTop: 4, fontStyle: 'italic' }}>
                Already taken.
              </p>
            )}
          </div>
          <EditorialField
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <EditorialField
            label="Password"
            type="password"
            placeholder="Min 8 chars, 1 number, 1 special"
            error={errors.password?.message}
            {...register('password')}
          />
          <EditorialField
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
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
            {loading ? 'Creating…' : 'Create account →'}
          </motion.button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--b-rule)' }} />
          <div className="spread" style={{ fontSize: 9, color: 'var(--b-ink-40)' }}>
            or
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--b-rule)' }} />
        </div>

        <motion.button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="font-body"
          style={{
            width: '100%',
            padding: '14px 16px',
            background: 'transparent',
            color: 'var(--b-ink)',
            border: '1px solid var(--b-ink)',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </motion.button>

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
          Already have one?{' '}
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
