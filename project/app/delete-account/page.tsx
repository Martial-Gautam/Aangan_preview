import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

// Play Store listing requires a public account-deletion page at a stable URL.
// No form: the in-app path is primary and the email link is the fallback.
export const metadata: Metadata = {
  title: { absolute: 'Delete your Apney account' },
  description: 'How to delete your Apney account and what happens to your data.',
  alternates: { canonical: '/delete-account' },
};

const MAIL = 'mailto:ranveer.aangan@gmail.com?subject=Delete%20my%20account';

export default function DeleteAccountPage() {
  return (
    <LegalLayout
      title="Delete your Apney account"
      lastUpdated="22 September 2026"
      intro={
        <p>
          Apney is made by Ranveer Gautam. You can delete your account and everything you put in it
          at any time, from inside the app or by asking us here.
        </p>
      }
    >
      <h2>The quickest way: in the app</h2>
      <p>
        Open Apney → <strong>Profile</strong> (bottom-right tab) → <strong>Settings</strong> (gear
        icon, top right) → <strong>Delete account</strong> → confirm. Deletion happens immediately.
        You&apos;ll be signed out on every device.
      </p>

      <h2>If you can&apos;t open the app</h2>
      <p>
        Email <a href={MAIL}>ranveer.aangan@gmail.com</a> from the address you signed up with,
        subject &ldquo;Delete my account&rdquo;. If you signed up by phone number, include that
        number. We verify it&apos;s you, delete the account within 7 days, and reply when done.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account, login, name, profile photo, bio and links</li>
        <li>Your posts, Raws, Highlights, photos and videos, and comments and likes on them</li>
        <li>Your events, and your replies in other people&apos;s events</li>
        <li>
          Your messages — they&apos;re end-to-end encrypted, so we only ever hold ciphertext; that
          ciphertext is deleted from our servers
        </li>
        <li>Your location sharing, notifications, waves and reports</li>
        <li>Your device&apos;s encryption keys</li>
        <li>Crash reports tied to your account</li>
      </ul>

      <h2>What is kept, and why</h2>
      <ul>
        <li>
          <strong>The family tree stays for your relatives.</strong> Apney is a shared family graph.
          Relatives you added (your parents, siblings, children as cards) are not deleted, because
          they are also your relatives&apos; relatives. Ownership of those cards passes to another
          family member, and your card is folded away so the tree still connects. Your name on your
          card is replaced with the name you last used. Nobody can log in as you, and nothing you
          posted survives.
        </li>
        <li>
          <strong>What others saved.</strong> Photos you sent to a relative&apos;s Kept album, or
          messages you sent that they still have on their phone, stay with them — the same as any
          messaging app.
        </li>
        <li>
          <strong>Legal records.</strong> If you reported someone or were reported, the report
          record is kept for up to 90 days for moderation, without your profile attached.
        </li>
        <li>
          <strong>Backups.</strong> Deleted data can persist in encrypted backups for up to 30 days
          before it is overwritten.
        </li>
      </ul>

      <h2>Deleting some things but not the account</h2>
      <p>
        Any post, Raw, photo or event can be deleted individually from inside the app — open it and
        use its menu. Deleted items sit in <strong>Recently deleted</strong> (Profile → Settings)
        for 30 days, then are removed for good. Chats: long-press a conversation to delete it for
        you, or delete it for everyone.
      </p>

      <h2>Questions</h2>
      <p>
        Email <a href={MAIL}>ranveer.aangan@gmail.com</a>. For what we store and why, see the{' '}
        <a href="/privacy">privacy policy</a>.
      </p>
    </LegalLayout>
  );
}
