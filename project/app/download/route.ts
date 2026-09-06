import { NextResponse } from 'next/server';
import { APK_URL } from '@/lib/app-download';

/**
 * Redirects to the current APK. Every "download the app" link on the site
 * points at /download, so the hosting location is swapped in one env var
 * rather than across components.
 */
export function GET() {
  // 302 rather than 308: the target is expected to move between releases and
  // must not be cached permanently by browsers.
  return NextResponse.redirect(APK_URL, 302);
}
