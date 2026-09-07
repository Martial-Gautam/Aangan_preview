/**
 * Single source of truth for getting the native app onto a user's device.
 *
 * The APK is served from a GitHub Release rather than this repo's `public/`
 * folder: release assets allow up to 2GB, while files committed to git are
 * capped at 100MB and the release build is ~104MB. The `/releases/latest/`
 * path always resolves to the newest published release, so shipping a new
 * build needs no change here.
 *
 * Set NEXT_PUBLIC_APK_URL to point every download surface somewhere else
 * (a different repo, Drive, Supabase Storage) without touching code.
 */
export const APK_URL =
  process.env.NEXT_PUBLIC_APK_URL ||
  'https://github.com/Martial-Gautam/aangan-release/releases/latest/download/app-release.apk';

/**
 * Every download surface links here instead of at APK_URL directly, so the
 * host can change in one place and so downloads are countable in analytics.
 */
export const DOWNLOAD_PATH = '/download';

export type Platform = 'android' | 'ios' | 'desktop';

/**
 * Used only to tailor the wording of the download popup — every platform gets
 * the same APK, but Android needs an "unknown sources" warning and the others
 * need telling that the file will not install locally.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS 13+ reports itself as "Macintosh"; touch points disambiguate it.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'desktop';
}
