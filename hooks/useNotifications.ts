'use client';

import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { subscribeToCollection, orderBy, limit, where } from '@/lib/firestore';
import { NotificationItem } from '@/types/notification';

export function useNotifications() {
  const { user } = useAuth();
  const { notifications, unreadCount, setNotifications, setUnreadCount, markAsRead, markAllAsRead } =
    useNotificationStore();

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = subscribeToCollection<NotificationItem>(
      `notifications/${user.uid}/items`,
      [orderBy('createdAt', 'desc'), limit(50)],
      (items) => {
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.isRead).length);
      }
    );

    return unsub;
  }, [user?.uid, setNotifications, setUnreadCount]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
