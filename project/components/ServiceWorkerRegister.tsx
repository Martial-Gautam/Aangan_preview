'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // The app is the Android APK, not this site. Chrome will otherwise show
    // its own "Install app" banner that installs the website as a PWA — a
    // user tapped it and got the React site on their phone instead of Apney.
    const block = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', block);
    return () => window.removeEventListener('beforeinstallprompt', block);
  }, []);
  return null;
}
