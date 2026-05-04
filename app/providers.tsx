'use client';

import { ReactNode } from 'react';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { EmailVerifyGuard } from '@/components/layout/EmailVerifyGuard';
import { ToastContainer } from '@/components/ui/Toast';
import { LevelUpOverlay } from '@/components/ui/LevelUpOverlay';
import { BadgeUnlockOverlay } from '@/components/ui/BadgeUnlockOverlay';
import { PushNotificationHandler } from '@/components/notifications/PushNotificationHandler';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ThemeBoot } from '@/components/editorial/ThemeBoot';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <EmailVerifyGuard>
        <ThemeBoot />
        {children}
        <ToastContainer />
        <LevelUpOverlay />
        <BadgeUnlockOverlay />
        <PushNotificationHandler />
        <OfflineBanner />
      </EmailVerifyGuard>
    </AuthGuard>
  );
}
