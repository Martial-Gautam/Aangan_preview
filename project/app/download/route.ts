import { NextResponse } from 'next/server';
import { APK_URL } from '@/lib/app-download';

const RELEASES_API = 'https://api.github.com/repos/Martial-Gautam/aangan-release/releases/latest';

/**
 * Redirects to the newest APK. Every "download the app" link on the site
 * points here, so the hosting location lives in one place.
 *
 * The asset is looked up by extension rather than by a fixed filename: the
 * v2.0.0 release shipped as apney_v2.apk while the site expected
 * app-release.apk, and every download 404'd until this was noticed. Now any
 * .apk attached to the latest release works, whatever it is called.
 */
export async function GET() {
  let target = APK_URL;
  try {
    // Cached for an hour: unauthenticated GitHub API allows 60 calls/hour per IP,
    // and a release changes far less often than that.
    const res = await fetch(RELEASES_API, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const release = await res.json();
      const apk = release.assets?.find((a: { name: string }) => a.name.toLowerCase().endsWith('.apk'));
      if (apk?.browser_download_url) target = apk.browser_download_url;
    }
  } catch {
    // Fall through to the static URL — a download that might work beats an error page.
  }
  // 302 rather than 308: the target moves between releases and must not be
  // cached permanently by browsers.
  return NextResponse.redirect(target, 302);
}
