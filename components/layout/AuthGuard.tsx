'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SplashScreen } from '@/components/ui/SplashScreen';

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/verify-email'];

/**
 * Onboarding gate. Authenticated users whose Firestore doc doesn't
 * carry `onboardingCompleted: true` get redirected to /onboard until
 * they finish the funnel — this catches users who signed up before
 * the new tailoring questions existed and rebuilds their plan from
 * the answers they give.
 *
 * Allowed-anywhere prefixes: anything under /onboard (so the funnel
 * pages themselves don't redirect-loop) and anything under /auth (so
 * a logout link from inside onboarding still works).
 */
const isOnboardingPath = (pathname: string) => pathname.startsWith('/onboard');
const isAuthPath       = (pathname: string) => pathname.startsWith('/auth');

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
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

    // Logged in on auth pages → continue past auth flow
    if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/register')) {
      router.push('/dashboard');
      return;
    }

    // Logged in BUT haven't completed onboarding → push them through
    // the funnel. Field-fishing pattern matches the rest of the app:
    // UserProfile doesn't formally type `onboardingCompleted` because
    // it's an onboarding-only flag, but it lives on the same doc.
    if (isAuthenticated && user && !isOnboardingPath(pathname) && !isAuthPath(pathname)) {
      const profile = user as unknown as { onboardingCompleted?: boolean };
      if (profile.onboardingCompleted !== true) {
        router.push('/onboard');
        return;
      }
    }
  }, [isAuthenticated, loading, isPublic, pathname, router, showSplash, user]);

  if (loading || showSplash) {
    return <SplashScreen show={true} />;
  }

  if (!isAuthenticated && !isPublic) return null;

  return <>{children}</>;
}
