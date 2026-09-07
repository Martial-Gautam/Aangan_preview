import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Use — Familiar',
  description:
    'The terms you agree to by using Familiar: who may use it, what you put in it, and zero tolerance for objectionable content and abusive behaviour.',
};

const MAIL = 'mailto:ranveer.aangan@gmail.com';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      lastUpdated="6 September 2026"
      intro={
        <>
          <p>
            These are the terms you agree to by using Familiar. They are short on purpose. If you
            disagree with them, do not use the app.
          </p>
          <p>
            Questions: <a href={MAIL}>ranveer.aangan@gmail.com</a>.
          </p>
        </>
      }
    >
      <h2>1. Who may use Familiar</h2>
      <p>
        You must be <strong>13 or older</strong>. If you are under 18, you should have a parent or
        guardian&apos;s permission.
      </p>
      <p>
        One account, one person. Do not create an account pretending to be somebody else — this is a
        family app, and an account claiming to be your uncle is not a prank, it is a way into a
        family&apos;s private photographs.
      </p>

      <h2>2. Your account</h2>
      <p>
        Keep your password to yourself. You are responsible for what happens under your account, and
        you should tell us at <a href={MAIL}>ranveer.aangan@gmail.com</a> if you think somebody else
        is using it.
      </p>

      <h2>3. What you put in Familiar</h2>
      <p>
        You keep ownership of everything you post. You give us only the permission we need to run the
        app: to store what you post, and to show it to the people you chose to show it to. Nothing
        more — we do not use your photographs to advertise, to train anything, or to show to anybody
        outside the audience you picked.
      </p>
      <p>
        You are responsible for what you post, including that you have the right to post it.
        Photographs of other people, and records about relatives who never joined, are things you are
        putting into a family&apos;s shared record — treat them the way you would want yours treated.
      </p>

      <h2>4. Zero tolerance for objectionable content and abusive behaviour</h2>
      <p>
        <strong>
          There is no tolerance for objectionable content or abusive users on Familiar.
        </strong>
      </p>
      <p>You must not post, send, or upload:</p>
      <ul>
        <li>sexual content involving children, in any form, ever;</li>
        <li>content that is sexually explicit, obscene, or gratuitously violent;</li>
        <li>threats, harassment, bullying, or intimidation of anybody;</li>
        <li>
          hatred or abuse directed at people for their religion, caste, ethnicity, sex, gender,
          sexuality, disability, or any part of who they are;
        </li>
        <li>anything unlawful, or that encourages somebody else to break the law;</li>
        <li>somebody else&apos;s private information published to hurt them;</li>
        <li>impersonation of a real person, living or dead;</li>
        <li>spam, scams, or anything designed to deceive people out of money.</li>
      </ul>
      <p>
        <strong>How this is enforced.</strong> Every post, photograph, Raw, event and person in
        Familiar can be reported from the app, and any user can be blocked. Reports are reviewed and
        acted on <strong>within 24 hours</strong>. Content reported by three people is hidden
        immediately, before anybody has read the report. An account that five people report as fake,
        impersonating somebody, or not part of their family is cut off at once, and has 48 hours to
        have five relatives vouch for it.
      </p>
      <p>
        We may remove content and suspend or end accounts that break this section, without notice.
      </p>

      <h2>5. Blocking</h2>
      <p>Blocking somebody hides everything their account does, in both directions.</p>
      <p>
        It does <strong>not</strong> remove them from the family tree. They remain a person in the
        record, with nothing behind their face — blocking your uncle does not stop him being your
        uncle, and the tree is the family&apos;s shared record rather than any one member&apos;s.
      </p>

      <h2>6. Being removed by your family</h2>
      <p>
        If five people in your family report your account as a fake, an impersonation, or not
        belonging to the family, it is cut off from that family straight away and you have{' '}
        <strong>48 hours</strong> to have five relatives vouch that you belong. Five vouches clear
        it. Nobody who reported you may vouch for you.
      </p>
      <p>
        If nobody vouches in time, you are cut off from that family for good. Your account, your
        login, and any tree you built yourself remain yours. If you think this happened wrongly,
        write to <a href={MAIL}>ranveer.aangan@gmail.com</a>.
      </p>

      <h2>7. What you must not do to the app</h2>
      <p>
        Do not try to reach data that is not yours, break the access rules, take the service down,
        scrape it, or automate accounts.
      </p>

      <h2>8. Ending it</h2>
      <p>
        You can delete your account at any time from <strong>Settings → Delete my account</strong>.
        It is immediate and permanent; the <a href="/privacy">privacy policy</a> says exactly what
        goes and what stays.
      </p>
      <p>We can end your access if you break these terms.</p>

      <h2>9. No warranty, and what we are responsible for</h2>
      <p>
        Familiar is provided as it is. We do not promise it will be uninterrupted or free of faults,
        and we are not liable for indirect or consequential loss.
      </p>
      <p>
        <strong>Keep your own copies of photographs that matter to you.</strong> This is a place to
        share them with your family, not the only place they should exist.
      </p>
      <p>
        Nothing here limits liability that cannot be limited by law, including for death or personal
        injury caused by negligence, or fraud.
      </p>

      <h2>10. The law that applies</h2>
      <p>
        These terms are governed by the laws of India, and the courts of India have jurisdiction —
        except where the law of the country you live in gives you rights that cannot be taken away by
        an agreement, in which case those rights stand.
      </p>

      <h2>11. Changes</h2>
      <p>
        If these terms change in a way that matters, the app will say so before you go on using it.
      </p>
    </LegalLayout>
  );
}
