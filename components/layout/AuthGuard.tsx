'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SplashScreen } from '@/components/ui/SplashScreen';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/verify-email'];
const ONBOARDING_PATH = '/onboarding';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isOnboarding = pathname === ONBOARDING_PATH;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 2100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (loading || showSplash) return;

    // Not logged in → redirect to login (unless on public page)
    if (!isAuthenticated && !isPublic) {
      router.push('/auth/login');
      return;
    }

    // Logged in on auth pages → redirect to dashboard
    if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, loading, isPublic, pathname, router, showSplash, user]);

  if (loading || showSplash) {
    return <SplashScreen show={true} />;
  }

  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
