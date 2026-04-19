import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';
import app from './firebase';

// Request browser notification permission, get FCM token, save to Firestore.
//
// BUG history: the initial call to this function would request permission +
// register the SW, then immediately try `getToken()`. But `register()` only
// tells you a registration exists — the worker itself can still be in the
// `installing` state, and `getToken()` needs an ACTIVE worker. So the very
// first "Allow" a brand-new user tapped would silently fail to save an FCM
// token. It only appeared to "work from Settings later" because by then the
// SW had long since finished activating, so the second call hit a hot path.
//
// Fix: after `register()`, wait for `serviceWorker.ready` (resolves once the
// scope has an active worker) before touching FCM. Plus a one-tick retry for
// the rare case where `getToken()` hits a transient racing error.
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Register + wait for an ACTIVE worker, not just a registration object.
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        // `ready` resolves only when the scope has an activated worker.
        // Guard with a 15s timeout so a pathological browser can't hang us.
        swRegistration = await Promise.race<ServiceWorkerRegistration | undefined>([
          navigator.serviceWorker.ready,
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 15_000)),
        ]);
      } catch (swErr) {
        console.error('SW registration failed:', swErr);
      }
    }

    // Get FCM token — one retry with a short backoff in case of a racing error.
    const tryGetToken = async (): Promise<string | null> => {
      const messaging = getMessaging(app);
      return await getToken(messaging, {
        vapidKey: undefined, // Uses default Firebase key
        serviceWorkerRegistration: swRegistration,
      });
    };
    try {
      let token: string | null = null;
      try {
        token = await tryGetToken();
      } catch (first) {
        // One-shot retry after a brief wait — helps when the worker only just
        // flipped to active and FCM's internal handshake lost the race.
        console.warn('FCM getToken retry after initial failure:', first);
        await new Promise((resolve) => setTimeout(resolve, 500));
        token = await tryGetToken();
      }

      if (token) {
        await updateDoc(doc(db, `users/${userId}`), {
          fcmToken: token,
          pushEnabled: true,
        });
        console.log('FCM token saved');
      } else {
        // getToken returned empty string/null — still mark enabled for
        // browser-level (in-page) notifications.
        await updateDoc(doc(db, `users/${userId}`), { pushEnabled: true });
      }
    } catch (fcmErr) {
      console.error('FCM token failed, using browser notifications only:', fcmErr);
      await updateDoc(doc(db, `users/${userId}`), { pushEnabled: true });
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
