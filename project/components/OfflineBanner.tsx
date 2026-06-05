'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      setShowReconnected(false);
    };

    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowReconnected(true);
        const timer = setTimeout(() => setShowReconnected(false), 3000);
        return () => clearTimeout(timer);
      }
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold transition-all duration-300 ${
        isOffline
          ? 'bg-amber-500/95 text-white backdrop-blur-md'
          : 'bg-emerald-500/95 text-white backdrop-blur-md'
      }`}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      {isOffline ? (
        <>
          <WifiOff size={13} />
          <span>You&apos;re offline — viewing cached data</span>
        </>
      ) : (
        <>
          <Wifi size={13} />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
