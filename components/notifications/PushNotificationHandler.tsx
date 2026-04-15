'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { requestNotificationPermission, showBrowserNotification } from '@/lib/pushNotifications';

export function PushNotificationHandler() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const prevCountRef = useRef<number>(-1); // -1 means not initialized
  const hasRequestedRef = useRef(false);

  // Request permission once after login
  useEffect(() => {
    if (!user || hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    // Request immediately — browser will show the popup
    requestNotificationPermission(user.uid);
  }, [user]);

  // Watch for new notifications and show browser popup
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    if (prevCountRef.current === -1) {
      // First load — just set the baseline, don't show popups for old notifications
      prevCountRef.current = unreadCount;
      return;
    }

    // Show popup if new notification arrived
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

  return null;
}
