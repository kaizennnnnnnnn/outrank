'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { requestNotificationPermission, showBrowserNotification } from '@/lib/pushNotifications';
import { Button } from '@/components/ui/Button';

export function PushNotificationHandler() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const prevCountRef = useRef<number>(-1);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if we need to ask for permission
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    // If permission hasn't been decided yet, show our custom prompt
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notif_prompt_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }
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

  // Watch for new notifications and show browser popup
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    if (prevCountRef.current === -1) {
      prevCountRef.current = unreadCount;
      return;
    }

    if (unreadCount > prevCountRef.current) {
      const latest = notifications.find((n) => !n.isRead);
      if (latest) {
        let target = '/notifications';
        if (latest.type === 'duel_challenge' || latest.type === 'duel_accepted' || latest.type === 'duel_ended') {
          target = '/compete';
        } else if (latest.type === 'friend_request' || latest.type === 'friend_accepted') {
          target = '/friends';
        }
        showBrowserNotification('Outrank', latest.message, target);
      }
    }

    prevCountRef.current = unreadCount;
  }, [notifications]);

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
            <p className="text-xs text-slate-400">Get notified when friends challenge you, log habits, or react to your progress.</p>
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
