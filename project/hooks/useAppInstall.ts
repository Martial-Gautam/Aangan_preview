'use client';

import { useCallback, useEffect, useState } from 'react';
import { DOWNLOAD_PATH, detectPlatform, isStandalone, type Platform } from '@/lib/app-download';

/** Remembers a dismissal so the popup does not reappear on every home visit. */
const DISMISS_KEY = 'aangan_install_dismissed_at';
/** How long a "Maybe later" keeps the popup away. */
const DISMISS_DAYS = 7;

/**
 * Drives every install/download surface: the APK on Android, the native PWA
 * prompt on desktop and Android browsers that offer it, and manual
 * "Add to Home Screen" instructions on iOS where no prompt API exists.
 */
export function useAppInstall() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(isStandalone());

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  const isAndroid = platform === 'android';
  /** Android always has something to offer (the APK); elsewhere it depends on the PWA prompt. */
  const canInstall = isAndroid || Boolean(installPrompt);

  const wasDismissedRecently = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  }, []);

  const rememberDismissal = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  /**
   * Returns true when the surface should close itself — false means a hint was
   * shown in place and the sheet needs to stay open for the user to read it.
   */
  const install = useCallback(async (): Promise<boolean> => {
    if (isInstalled) {
      setHint('App is already installed on this device.');
      return true;
    }
    if (isAndroid) {
      window.location.href = DOWNLOAD_PATH;
      return true;
    }
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
      setHint('');
      return true;
    }
    setHint(
      platform === 'ios'
        ? 'Tap the Share button in Safari, then choose "Add to Home Screen".'
        : 'Use your browser menu and choose "Install app" for the best experience.',
    );
    return false;
  }, [isAndroid, installPrompt, isInstalled, platform]);

  return {
    platform,
    isAndroid,
    isInstalled,
    canInstall,
    hint,
    setHint,
    install,
    wasDismissedRecently,
    rememberDismissal,
  };
}
