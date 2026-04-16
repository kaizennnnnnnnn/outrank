// Firebase Messaging Service Worker
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

// FCM auto-displays notifications that have a 'notification' field.
// We do NOT call showNotification here to avoid duplicates.
// This handler is only for data-only messages if needed in the future.
messaging.onBackgroundMessage((payload) => {
  // Only show if there's no notification field (data-only message)
  if (!payload.notification) {
    const title = 'Outrank';
    const options = {
      body: payload.data?.message || 'New notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    };
    self.registration.showNotification(title, options);
  }
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/dashboard');
    })
  );
});
