import { APK_URL } from '@/lib/app-download';

const RELEASES_API = 'https://api.github.com/repos/Martial-Gautam/aangan-release/releases/latest';

/** Refetch this often. Unauthenticated GitHub allows 60 calls/hour per IP; four is plenty. */
export const RELEASE_REVALIDATE_SECONDS = 900;

export interface ReleaseInfo {
  version: string;
  sizeMB: number;
  apkUrl: string;
}

// Shown if GitHub is unreachable. Kept current so the fallback is not obviously stale.
const FALLBACK: ReleaseInfo = { version: '2.0.1', sizeMB: 41, apkUrl: APK_URL };

/**
 * Server-only. The newest published release: version from the tag, size and
 * URL from whichever attached asset ends in .apk — so a renamed file between
 * releases keeps working. Cached by Next's data cache; every caller in a
 * revalidation window shares one API call.
 */
export async function getLatestRelease(): Promise<ReleaseInfo> {
  try {
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: RELEASE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return FALLBACK;
    const release = await res.json();
    const apk = release.assets?.find((a: { name: string }) => a.name.toLowerCase().endsWith('.apk'));
    if (!apk?.browser_download_url) return FALLBACK;
    return {
      version: String(release.tag_name ?? '').replace(/^v/, '') || FALLBACK.version,
      sizeMB: Math.round(apk.size / 1e6),
      apkUrl: apk.browser_download_url,
    };
  } catch {
    return FALLBACK;
  }
}
