import Landing from './Landing';
import { getLatestRelease } from '@/lib/release';

// Regenerated every 15 minutes so the version and size on the listing follow
// each new GitHub release without anyone editing the page. Must be a literal
// (Next reads it statically); keep in step with RELEASE_REVALIDATE_SECONDS.
export const revalidate = 900;

export default async function Page() {
  const release = await getLatestRelease();
  return <Landing release={release} />;
}
