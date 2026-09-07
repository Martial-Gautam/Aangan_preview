'use client';

import { useCallback, useEffect, useState } from 'react';
import { DOWNLOAD_PATH, detectPlatform, type Platform } from '@/lib/app-download';

/** Remembers a dismissal so the popup does not reappear on every visit. */
const DISMISS_KEY = 'aangan_install_dismissed_at';
/** How long a "Maybe later" keeps the popup away. */
const DISMISS_DAYS = 7;

/**
 * Drives every download surface. Downloading the APK is the only action —
 * the PWA "Add to Home Screen" prompt was deliberately dropped because it
 * installed a browser shortcut instead of the real app.
 *
 * Platform is still tracked so the popup can warn Android users about the
 * "unknown sources" permission and tell iOS users the APK will not run there.
 */
export function useAppInstall() {
  const [platform, setPlatform] = useState<Platform>('desktop');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

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
   * Starts the APK download on every platform. The server responds with a
   * redirect to a file served as an attachment, so the browser downloads it
   * and the current page stays put.
   */
  const download = useCallback(() => {
    window.location.href = DOWNLOAD_PATH;
  }, []);

  return {
    platform,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    download,
    wasDismissedRecently,
    rememberDismissal,
  };
}
