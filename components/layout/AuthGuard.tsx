'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SplashScreen } from '@/components/ui/SplashScreen';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register', '/auth/forgot-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Keep splash for minimum 1.8s for the animation to complete
      const timer = setTimeout(() => setShowSplash(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (loading || showSplash) return;

    if (!isAuthenticated && !isPublic) {
      router.push('/auth/login');
    }

    if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, isPublic, pathname, router, showSplash]);

  // Show splash screen while loading
  if (loading || showSplash) {
    return <SplashScreen show={true} />;
  }

  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
