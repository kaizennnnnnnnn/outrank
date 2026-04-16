import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import app from './firebase';

// Request browser notification permission, get FCM token, save to Firestore
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Register service worker
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    // Get FCM token
    try {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: undefined, // Uses default Firebase key
        serviceWorkerRegistration: swRegistration,
      });

      if (token) {
        // Save FCM token to user's Firestore document
        await updateDoc(doc(db, `users/${userId}`), {
          fcmToken: token,
          pushEnabled: true,
        });
        console.log('FCM token saved');
      }
    } catch (fcmErr) {
      console.error('FCM token failed, using browser notifications only:', fcmErr);
      // Still mark as enabled for browser notifications
      await updateDoc(doc(db, `users/${userId}`), {
        pushEnabled: true,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to setup push notifications:', err);
    return false;
  }
}

// Show a browser notification (works when tab is open)
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
