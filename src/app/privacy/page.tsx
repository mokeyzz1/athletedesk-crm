import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_CONTACT_EMAIL } from '@/lib/demo'
import { LegalPage, legalLink, type LegalSection } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How AthleteDesk collects, uses, and protects your data.',
}

const updated = 'November 18, 2026'

const summary = [
  'Your agency owns the data it puts into AthleteDesk. We never sell it or use it for advertising.',
  'If you connect Gmail, we only send emails you write in AthleteDesk. We do not read your inbox.',
  'Each agency’s data is kept separate from every other agency’s.',
  'Agencies are responsible for having consent to store information about the athletes they work with, including minors.',
  'You can ask us to export or delete your data at any time.',
]

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <p>
        AthleteDesk (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a CRM for sports and NIL agencies at athletedesk.io.
        This policy explains what we collect, why, how we protect it, and the choices available to account holders and
        agency administrators. It applies to the AthleteDesk website and web application.
      </p>
    ),
  },
  {
    id: 'roles',
    title: 'Your agency and us',
    body: (
      <p>
        Agencies use AthleteDesk to store information about athletes, families, schools, and brands. For that
        information, your agency decides what is collected and why, and we process it on your agency&apos;s behalf.
        For your own account details (such as your name and email), we are responsible for how they are handled.
      </p>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'Information we collect',
    body: (
      <ul>
        <li><strong>Account information.</strong> Your name, email address, and profile picture when you sign in with Google or accept an invite.</li>
        <li><strong>Workspace data.</strong> Athlete records, communication logs, tasks, documents, deals, and revenue records that your agency enters or imports.</li>
        <li><strong>Gmail and Google Calendar (optional).</strong> If you connect Google, we send emails you compose in AthleteDesk from your Gmail account, and show and create events on your Google Calendar for meetings you schedule. We do not read your Gmail inbox or other messages.</li>
        <li><strong>Usage and diagnostics.</strong> Basic logs, browser and device details, and error reports so we can keep the service secure and reliable.</li>
      </ul>
    ),
  },
  {
    id: 'google-data',
    title: 'Google user data',
    body: (
      <>
        <p>
          AthleteDesk&apos;s use and transfer of information received from Google APIs adheres to the{' '}
          <a className={legalLink} href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>, including the Limited Use requirements.
        </p>
        <ul>
          <li><strong>Gmail</strong> is used only to send messages you compose in AthleteDesk. A copy of each message you send (recipient, subject, body, and date) is saved to your agency&apos;s communication log so it appears on the athlete&apos;s record. We do not read, scan, or store other messages in your mailbox.</li>
          <li><strong>Google Calendar</strong> is used only to show your upcoming meetings in AthleteDesk and to create events you schedule from AthleteDesk.</li>
          <li>We do not sell Google user data, use it for advertising, or use it to train generalized AI models.</li>
          <li>People at AthleteDesk only access Google user data with your permission, for security or abuse investigations, or when required by law.</li>
          <li>You can disconnect Google in AthleteDesk settings or remove access from your Google Account permissions page at any time.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'minors',
    title: 'Athletes under 18',
    body: (
      <>
        <p>
          Agencies often work with high school athletes. AthleteDesk is used by agency staff, not by athletes, and is
          not directed to children. Agencies that store information about anyone under 18 are responsible for
          obtaining any consent required by law, including from a parent or guardian, and for following the athlete
          and NIL rules that apply to them.
        </p>
        <p>
          We do not knowingly allow children under 13 to create accounts. If you believe a child&apos;s information was
          added without proper consent, contact us and we will help the agency remove it.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use information',
    body: (
      <ul>
        <li>To provide and operate the CRM for your agency.</li>
        <li>To send messages about the service, such as invites and notifications you turn on.</li>
        <li>To secure the service, prevent abuse, and fix errors.</li>
        <li>We do <strong>not</strong> sell your data or use it for third-party advertising.</li>
        <li>We share data only with the providers that host and run AthleteDesk, or when the law requires it.</li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <>
        <p>
          Each agency&apos;s data is isolated from every other agency&apos;s with database-level access rules. Data is
          encrypted in transit and stored with providers that encrypt it at rest. Access within an agency is controlled
          by the roles its admins assign.
        </p>
        <p>
          If we learn of a security incident that affects your agency&apos;s data, we will notify your agency&apos;s
          admins without undue delay and tell you what happened and what we are doing about it.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Retention and deletion',
    body: (
      <p>
        We keep workspace data while your agency&apos;s account is active. You can delete records in the app at any
        time. To export your data or delete your account or your agency&apos;s whole workspace, email us and we will
        complete the request within 30 days, unless we must keep something longer for security or legal reasons.
        When you disconnect Gmail or Google Calendar, we delete the access tokens for that connection.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices and rights',
    body: (
      <p>
        You can ask to access, correct, export, or delete your personal information, and you can disconnect Gmail or
        Google Calendar at any time. If you are an athlete or parent whose information an agency stores, contact that
        agency first; we will help them respond. Email{' '}
        <a className={legalLink} href={`mailto:${DEMO_CONTACT_EMAIL}`}>{DEMO_CONTACT_EMAIL}</a> to make a request.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        If we make material changes, we will update this page and the date at the top, and tell agency admins by email
        or in the app. See also our <Link className={legalLink} href="/terms">Terms of Service</Link>.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated={updated} summary={summary} sections={sections} current="privacy" />
}
