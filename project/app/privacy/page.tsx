import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy — Familiar',
  description:
    'What Familiar stores, why, who can see it, and how to get rid of it. No advertising identifiers, no analytics, no location, no contacts.',
};

const MAIL = 'mailto:ranveer.aangan@gmail.com';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="6 September 2026"
      intro={
        <>
          <p>
            Familiar is a private app for one family. This policy says what it stores, why, who can
            see it, and how to get rid of it. It was written from the database schema rather than
            from a template, so it describes what the app actually does.
          </p>
          <p>
            If anything here turns out not to match the app, the app is wrong and we will fix it.
            Tell us: <a href={MAIL}>ranveer.aangan@gmail.com</a>.
          </p>
        </>
      }
    >
      <h2>Who we are</h2>
      <p>
        Familiar is operated by the person you can reach at{' '}
        <a href={MAIL}>ranveer.aangan@gmail.com</a>, who is the data controller for the purposes of
        the UK GDPR and the EU GDPR, and the business responsible under India&apos;s Digital
        Personal Data Protection Act.
      </p>

      <h2>What we collect, and why</h2>

      <h3>Because you typed it in</h3>
      <ul>
        <li>
          <strong>Your account</strong> — email address and a password, held by our authentication
          provider. We never see the password.
        </li>
        <li>
          <strong>Your profile</strong> — your name, and optionally a photograph, date of birth,
          gender, phone number, a short bio, and links you choose to add (Instagram, a phone number
          for WhatsApp, anything else you enter).
        </li>
        <li>
          <strong>Your family</strong> — the people you add, how they are related, and anything you
          record about them: names, dates, photographs, notes.{' '}
          <strong>Much of this is about people who are not Familiar users.</strong> See{' '}
          <em>People who never joined</em>, below.
        </li>
        <li>
          <strong>What you post</strong> — posts, Highlights, photographs, albums, events, replies,
          Raws, and the captions on them.
        </li>
        <li>
          <strong>Who you send things to</strong> — the radius you choose for each thing, resolved
          once into a fixed list of people.
        </li>
        <li>
          <strong>Reports and blocks</strong> — if you report or block somebody, we store that you
          did, and what reason you gave.
        </li>
      </ul>

      <h3>Because the app has to work</h3>
      <ul>
        <li>
          <strong>Which devices you use for messages</strong>, so end-to-end encrypted chat can
          reach them, and a push token for each so your phone can be woken.
        </li>
        <li>
          <strong>When things happened</strong> — timestamps on everything above.
        </li>
        <li>
          <strong>Waves, likes, RSVPs, and what you have read.</strong>
        </li>
      </ul>

      <h3>What we do not collect</h3>
      <ul>
        <li>
          <strong>
            No advertising identifiers, no ad networks, no third-party analytics, and no tracking
            across other apps or websites.
          </strong>{' '}
          Familiar does not have a behavioural profile of you and is not built to.
        </li>
        <li>
          <strong>No location.</strong> The app never asks for it.
        </li>
        <li>
          <strong>No contacts.</strong> The app never reads your address book.
        </li>
      </ul>

      <h2>Your messages are end-to-end encrypted</h2>
      <p>
        Direct messages are encrypted on your device and decrypted on the recipient&apos;s. The keys
        live on your phones. <strong>We cannot read them</strong>, and neither can our hosting
        provider — what the server holds is ciphertext and the routing information needed to deliver
        it.
      </p>
      <p>
        Two honest caveats. Encryption protects the <em>contents</em>: we can still see that two
        accounts exchanged messages, and when. And if you lose every device you have signed in on,
        those messages cannot be recovered by us or by anybody else.
      </p>
      <p>
        <strong>Posts, photographs, albums, events and Raws are not end-to-end encrypted.</strong>{' '}
        They are stored so that the family you sent them to can read them, and they are protected by
        access rules rather than by keys.
      </p>

      <h2>Who can see what</h2>
      <p>
        Familiar has no public content. Nothing you put in it is visible on the open internet, and
        there is no browsing by strangers.
      </p>
      <ul>
        <li>
          <strong>Your family</strong>, meaning people connected to you in the graph, within the
          radius you chose for each thing.
        </li>
        <li>
          <strong>Nobody else</strong>, including other Familiar users who are not connected to you.
        </li>
        <li>
          <strong>You alone</strong> can see who you have blocked, and who reported whom is visible
          to nobody in the family — including the person reported.
        </li>
        <li>
          <strong>We can see</strong> what is stored unencrypted, when we need to: investigating a
          report, fixing a fault, or complying with the law. Not routinely, and never for
          advertising.
        </li>
      </ul>

      <h2>People who never joined</h2>
      <p>
        Most of a family tree is people who have not installed anything. When you add a relative,
        you are recording information about somebody else.
      </p>
      <p>
        We hold that information because a family tree is not possible without it, and because it is
        the family&apos;s shared record rather than any one member&apos;s. If you are such a person
        and want your record changed or removed, write to{' '}
        <a href={MAIL}>ranveer.aangan@gmail.com</a> and we will act on it.
      </p>

      <h2>Children</h2>
      <p>
        Familiar is a family app and family trees include children.{' '}
        <strong>A child&apos;s record is usually created by an adult relative, not by the child.</strong>
      </p>
      <p>
        Accounts are for people aged 13 and over. If a child under 13 has created an account, tell us
        and we will delete it. A parent or guardian may ask us to remove information about their
        child from the tree at any time.
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li>
          <strong>A Raw goes after 24 hours</strong>, unless you keep it — the rule is enforced by
          the database, not by a clean-up job, so it stops being readable the moment it expires.
        </li>
        <li>
          <strong>Something you delete</strong> is recoverable by you for 30 days, then gone.
        </li>
        <li>
          <strong>Your account and everything in it</strong> goes when you delete it, immediately —
          see below.
        </li>
        <li>
          <strong>Reports</strong> are kept while they are open, and afterwards as a record of what
          was decided.
        </li>
        <li>
          <strong>Backups</strong> may hold a copy for up to 30 days after deletion.
        </li>
      </ul>

      <h2>Deleting everything</h2>
      <p>
        <strong>Settings → Delete my account.</strong> It is immediate and it is permanent.
      </p>
      <p>
        What goes: your account, your posts, Highlights, Raws, photographs, messages, message keys,
        profile, waves, invitations and replies.
      </p>
      <p>
        What stays, deliberately: <strong>your place in the family tree</strong>, as a person with no
        account attached. It is your family&apos;s record of who you are as much as it is yours, and
        removing it would leave a hole in everybody else&apos;s tree. The relatives you added pass to
        your nearest relative who still has an account, so that nobody else&apos;s family falls apart
        because you left. If nobody else here has an account, all of it goes with you.
      </p>

      <h2>Where your data goes</h2>
      <div className="my-6 -mx-2 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-bold text-gray-900 py-2.5 px-3">Who</th>
              <th className="text-left font-bold text-gray-900 py-2.5 px-3">What they get</th>
              <th className="text-left font-bold text-gray-900 py-2.5 px-3">Why</th>
            </tr>
          </thead>
          <tbody className="text-gray-600">
            <tr className="border-b border-gray-100">
              <td className="py-3 px-3 font-semibold text-gray-900">Supabase</td>
              <td className="py-3 px-3">everything stored, including ciphertext</td>
              <td className="py-3 px-3">database, files, sign-in</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-3 font-semibold text-gray-900">Google Firebase Cloud Messaging</td>
              <td className="py-3 px-3">a push token for your phone</td>
              <td className="py-3 px-3">waking your phone for a message</td>
            </tr>
            <tr>
              <td className="py-3 px-3 font-semibold text-gray-900">
                Our relationship engine (hosted on Render, backed by Neo4j)
              </td>
              <td className="py-3 px-3">your family graph — names and connections</td>
              <td className="py-3 px-3">working out how you are related</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>That is the whole list. Familiar uses no advertising or analytics service.</p>
      <p>
        Your data may be processed outside your country by the providers above. Where the law
        requires a transfer safeguard, the providers&apos; standard contractual clauses are the
        mechanism.
      </p>

      <h2>Your rights</h2>
      <p>
        You may ask us for a copy of what we hold about you, ask us to correct it, ask us to delete
        it, object to how we use it, or complain to your data protection regulator. Deleting your
        account does most of this in one tap; for anything else, write to{' '}
        <a href={MAIL}>ranveer.aangan@gmail.com</a> and we will answer within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        Access is enforced in the database itself, per row, rather than by the app asking nicely — so
        a bug in the app cannot hand somebody else&apos;s family to you. Files are private and served
        through links that expire within the hour. Messages are end-to-end encrypted as described
        above.
      </p>
      <p>
        No system is perfect. If you find a hole, please tell us before you tell anybody else, at{' '}
        <a href={MAIL}>ranveer.aangan@gmail.com</a>.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, the app will say so before you go on using it.
        The date at the top is when it last changed.
      </p>
    </LegalLayout>
  );
}
