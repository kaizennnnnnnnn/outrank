'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { requestNotificationPermission, showBrowserNotification } from '@/lib/pushNotifications';

export function PushNotificationHandler() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const prevCountRef = useRef<number>(0);
  const hasRequestedRef = useRef(false);

  // Request permission once after login
  useEffect(() => {
    if (!user || hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    // Small delay so the app loads first
    const timer = setTimeout(() => {
      requestNotificationPermission(user.uid);
    }, 3000);

    return () => clearTimeout(timer);
  }, [user]);

  // Watch for new notifications and show browser popup
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Only show popup if count increased (new notification arrived)
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      const latest = notifications.find((n) => !n.isRead);
      if (latest) {
        // Map notification type to navigation target
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

  return null; // This component renders nothing — it just handles side effects
}
