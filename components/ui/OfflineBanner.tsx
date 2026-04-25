'use client';

import { useEffect, useState } from 'react';

/**
 * Slim banner that appears when the browser reports it's offline.
 * Listens to navigator.onLine + the online/offline events and slides
 * down from the top of the viewport.
 *
 * Why this exists: the Firestore SDK retries failed listen channels
 * silently, but on a flaky connection the console fills with
 * ERR_INTERNET_DISCONNECTED / ERR_NAME_NOT_RESOLVED noise and the user
 * has no UI signal that anything is wrong. The banner gives them an
 * explicit "you're offline, your changes will sync when you reconnect"
 * — and disappears on its own when the connection comes back.
 *
 * Mounted globally in the Providers tree so every authed page picks
 * it up without page-by-page wiring.
 */
export function OfflineBanner() {
  // Default to "online" on the server so SSR HTML matches the most-likely
  // initial client state. The effect below corrects on mount if needed.
  const [online, setOnline] = useState(true);
  // Brief "Back online" confirmation that auto-hides after 2.5s. Helps the
  // user know they can keep going without squinting at the banner waiting
  // for it to disappear.
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const goOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setShowReconnected(false), 2500);
    };
    const goOffline = () => {
      setOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  if (online && !showReconnected) return null;

  const isOffline = !online;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none"
    >
      <div
        className="mt-1.5 mx-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] flex items-center gap-2 backdrop-blur-md transition-all"
        style={{
          background: isOffline
            ? 'linear-gradient(90deg, rgba(220,38,38,0.85), rgba(127,29,29,0.85))'
            : 'linear-gradient(90deg, rgba(16,185,129,0.85), rgba(6,95,70,0.85))',
          border: isOffline
            ? '1px solid rgba(248,113,113,0.55)'
            : '1px solid rgba(110,231,183,0.55)',
          color: '#ffffff',
          boxShadow: isOffline
            ? '0 4px 16px -4px rgba(220,38,38,0.6)'
            : '0 4px 16px -4px rgba(16,185,129,0.5)',
        }}
      >
        <span
          className={isOffline ? 'w-1.5 h-1.5 rounded-full bg-red-200 animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-emerald-200'}
        />
        {isOffline ? "You're offline · changes will sync when reconnected" : 'Back online'}
      </div>
    </div>
  );
}
