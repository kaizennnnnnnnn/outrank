'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { requestNotificationPermission } from '@/lib/pushNotifications';
import { updateDocument } from '@/lib/firestore';
import { Button } from '@/components/ui/Button';

export function PushNotificationHandler() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if we need to ask for permission
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notif_prompt_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }
  }, [user]);

  // Self-heal: if the user has already granted browser permission but
  // doesn't have an fcmToken yet (they hit the old race-condition bug
  // where the initial Allow wouldn't finish setup), silently re-run the
  // full registration so push actually starts working — no need to make
  // them hunt for the Settings button.
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const userRaw = user as unknown as Record<string, unknown>;
    if (typeof userRaw.fcmToken === 'string' && userRaw.fcmToken.length > 0) return;
    // Fire and forget — runs once per session for users missing a token.
    requestNotificationPermission(user.uid).catch(() => { /* silent */ });
  }, [user]);

  // Save the user's timezone so the server can fire scheduled reminders at
  // their local time. Runs once per session; only writes if missing/changed.
  useEffect(() => {
    if (!user) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      const current = (user as unknown as Record<string, string>).timezone;
      if (current === tz) return;
      updateDocument('users', user.uid, { timezone: tz }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
  }, [user]);

  const handleAllow = async () => {
    if (user) {
      await requestNotificationPermission(user.uid);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notif_prompt_dismissed', 'true');
  };

  // No more client-side browser notifications — FCM Cloud Function handles push delivery

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 z-[100] max-w-sm mx-auto"
        >
          <div className="glass-card rounded-2xl p-4 border border-red-500/20 space-y-3">
            <p className="text-sm font-medium text-white">Enable notifications?</p>
            <p className="text-xs text-slate-400">Get notified when friends challenge you, log habits, or react to your progress. On mobile, add Outrank to your Home Screen for best experience.</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleAllow}>Allow</Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={handleDismiss}>Not now</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
