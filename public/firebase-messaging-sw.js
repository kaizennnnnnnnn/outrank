// Firebase Messaging Service Worker — handles background push notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAv16isYASrjj8CvX3QFphBj0acczq372k',
  authDomain: 'outrank-1d81f.firebaseapp.com',
  projectId: 'outrank-1d81f',
  storageBucket: 'outrank-1d81f.firebasestorage.app',
  messagingSenderId: '1014075978134',
  appId: '1:1014075978134:web:5b3dc31a8026a30f612db7',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Outrank';
  const options = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data,
  };
  self.registration.showNotification(title, options);
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('outrank') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/dashboard');
    })
  );
});
