import type { Metadata } from 'next';
import BrandLogo from '@/components/BrandLogo';
import './invite.css';

const RELEASES_URL = 'https://github.com/Martial-Gautam/aangan-release/releases/latest';

/**
 * Deliberately says nothing about who invited whom. WhatsApp scrapes and caches
 * this preview, so the inviter's name and the relationship would travel to every
 * chat the link passes through.
 */
export const metadata: Metadata = {
  title: { absolute: 'You have been invited to Apney' },
  description: 'Someone has invited you to their family on Apney.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'You have been invited to Apney',
    description: 'Someone has invited you to their family on Apney.',
    images: ['/og.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'You have been invited to Apney',
    description: 'Someone has invited you to their family on Apney.',
    images: ['/og.png'],
  },
};

// The invite's state changes the moment someone accepts it, so never cache.
export const dynamic = 'force-dynamic';

interface InvitePreview {
  invited_by: string;
  relation_note: string;
  expires_at: string;
}

/**
 * One state for every failure: wrong code, expired, already opened, already
 * used. Anyone can call this endpoint with a guessed code, so the page must not
 * reveal whether a code ever existed.
 */
async function previewInvite(code: string): Promise<InvitePreview | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  // Cheap guard so a malformed path never reaches the database.
  if (!/^[A-Za-z0-9-]{4,32}$/.test(code)) return null;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/preview_invite`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length === 1 ? (rows[0] as InvitePreview) : null;
  } catch {
    return null;
  }
}

/** "30 September" — no time, no timezone. */
function formatExpiry(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await previewInvite(code);
  const expiry = invite ? formatExpiry(invite.expires_at) : null;

  return (
    <main className="invite">
      <div className="invite__col">
        <div className="invite__card">
          <div className="invite__mark">
            <BrandLogo size={30} />
          </div>

          {invite ? (
            <>
              <h1>
                {invite.invited_by} says you are {invite.relation_note}
              </h1>
              <p className="invite__body">
                Apney is where your family keeps its tree. Install it, open this link again, and say
                yes.
              </p>
            </>
          ) : (
            <>
              <h1>This invite has already been used.</h1>
              <p className="invite__body">Ask them to send you a new one.</p>
            </>
          )}

          <a className="invite__action" href={RELEASES_URL}>
            Download Apney
          </a>

          {invite && expiry && <p className="invite__note">Expires on {expiry}.</p>}
        </div>
      </div>
    </main>
  );
}
