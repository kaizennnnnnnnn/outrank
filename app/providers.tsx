'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EmailVerifyGuard } from '@/components/layout/EmailVerifyGuard';
import { ToastContainer } from '@/components/ui/Toast';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { BadgeUnlockOverlay } from '@/components/ui/BadgeUnlockOverlay';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <EmailVerifyGuard>
        {children}
        <ToastContainer />
        <LevelUpOverlay />
        <BadgeUnlockOverlay />
      </EmailVerifyGuard>
    </AuthGuard>
  );
}
