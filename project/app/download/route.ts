import { NextResponse } from 'next/server';
import { getLatestRelease } from '@/lib/release';

/**
 * Redirects to the newest APK. Every "download the app" link on the site
 * points here, so the hosting location lives in one place. See lib/release.ts
 * for why the file is found by extension rather than by name.
 */
export async function GET() {
  const { apkUrl } = await getLatestRelease();
  // 302 rather than 308: the target moves between releases and must not be
  // cached permanently by browsers.
  return NextResponse.redirect(apkUrl, 302);
}
