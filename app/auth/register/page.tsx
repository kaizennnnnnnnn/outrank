'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/store/uiStore';
import { Logo } from '@/components/ui/Logo';

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
      await loginWithGoogle();
      router.push('/onboarding');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
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
          <h1 className="text-2xl font-bold text-white font-heading">Create Account</h1>
          <p className="text-slate-500 mt-1">Start competing with friends today</p>
        </div>

        <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                label="Username"
                placeholder="your_username"
                error={errors.username?.message}
                {...register('username', {
                  onBlur: (e) => checkUsername(e.target.value),
                })}
              />
              {checkingUsername && <p className="text-xs text-slate-500 mt-1">Checking...</p>}
              {usernameAvailable === true && watchUsername?.length >= 3 && (
                <p className="text-xs text-emerald-400 mt-1">Username available!</p>
              )}
              {usernameAvailable === false && (
                <p className="text-xs text-red-400 mt-1">Username taken</p>
              )}
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 chars, 1 number, 1 special"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" className="w-full" loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e1e30]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#10101a] px-3 text-slate-500">or continue with</span>
            </div>
          </div>

          <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={loading}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 font-medium">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
