import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Request browser notification permission and register service worker
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Register service worker
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    // Mark user as having notifications enabled
    await updateDoc(doc(db, `users/${userId}`), {
      pushEnabled: true,
    });

    return true;
  } catch (err) {
    console.error('Failed to setup push notifications:', err);
    return false;
  }
}

// Show a browser notification (works when tab is open or in background)
export function showBrowserNotification(title: string, body: string, onClick?: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    silent: false,
  } as NotificationOptions);

  notification.onclick = () => {
    window.focus();
    if (onClick) window.location.href = onClick;
    notification.close();
  };
}
