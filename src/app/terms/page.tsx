import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_CONTACT_EMAIL } from '@/lib/demo'
import { LegalPage, legalLink, type LegalSection } from '@/components/legal/legal-page'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using AthleteDesk.',
}

const updated = 'November 18, 2026'

const summary = [
  'Your agency owns its data. We only use it to run AthleteDesk for you.',
  'You are responsible for who you invite and for following recruiting, NIL, and athlete-agent rules.',
  'Don’t use connected email accounts for spam.',
  'If we ever shut down, you will get time to export your data.',
]

const sections: LegalSection[] = [
  {
    id: 'service',
    title: 'The service',
    body: (
      <p>
        AthleteDesk is a CRM for sports and NIL agencies: recruiting pipelines, athlete records, communications,
        tasks, documents, brand deals, and revenue tracking. Access is currently by invitation or approved request.
        By creating an account, accepting an invite, or using the service, you agree to these terms for yourself and,
        if you use AthleteDesk for an agency, on behalf of that agency.
      </p>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts and agencies',
    body: (
      <ul>
        <li>You are responsible for activity under your account and for keeping your sign-in secure.</li>
        <li>Agency admins control who can join their workspace and what roles members have.</li>
        <li>You must give accurate information and be authorized to act for your agency.</li>
        <li>You are responsible for making sure the people you invite are allowed to see your agency&apos;s athlete, communication, and deal data.</li>
      </ul>
    ),
  },
  {
    id: 'data',
    title: 'Your data',
    body: (
      <>
        <p>
          Your agency owns the data it puts into AthleteDesk. You give us the limited rights needed to host, process,
          back up, secure, and display that data to run the service. How we handle personal data is described in our{' '}
          <Link className={legalLink} href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          You are responsible for having the right to store the information you add, including any consent required
          for athletes under 18 from a parent or guardian.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <ul>
        <li>Follow the recruiting, NIL, and athlete-agent laws and rules that apply to your agency, including state agent registration and NCAA or association rules.</li>
        <li>Don&apos;t send spam or unlawful messages through connected email accounts.</li>
        <li>Don&apos;t try to access other agencies&apos; data, or probe or disrupt the service.</li>
        <li>Don&apos;t upload malware, passwords, payment card numbers, or other sensitive data the service isn&apos;t designed to store.</li>
        <li>Don&apos;t resell or white-label the service without a written agreement with us.</li>
      </ul>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-party services',
    body: (
      <p>
        Optional integrations such as Gmail, Google Calendar, DocuSign, Calendly, and Apollo are governed by those
        providers&apos; own terms. You can disconnect them at any time. We aren&apos;t responsible for third-party
        services, their outages, or account restrictions they apply outside AthleteDesk.
      </p>
    ),
  },
  {
    id: 'fees',
    title: 'Fees',
    body: (
      <p>
        Any fees for your agency are set out in your order or agreement with us. We don&apos;t take a percentage of
        your deals. If we introduce or change pricing, we will tell agency admins in advance, and changes won&apos;t
        apply to a period you have already paid for.
      </p>
    ),
  },
  {
    id: 'availability',
    title: 'Availability and changes',
    body: (
      <p>
        We work to keep AthleteDesk available and fast, but the service is provided &ldquo;as is&rdquo; without
        warranties of any kind. We may improve or change features over time. If we ever discontinue the service, we
        will give you reasonable notice and a chance to export your data.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the maximum extent permitted by law, AthleteDesk will not be liable for indirect, incidental, special, or
        consequential damages, or for lost profits or revenue. Our total liability for any claim is limited to the
        amount your agency paid us in the twelve months before the claim arose.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Ending your use',
    body: (
      <p>
        You can stop using the service and ask us to delete your data at any time. We may suspend or end access for a
        serious breach of these terms, and will tell you why unless the law prevents it. The &ldquo;Your data&rdquo;,
        &ldquo;Limitation of liability&rdquo;, and &ldquo;General&rdquo; sections still apply after your use ends.
      </p>
    ),
  },
  {
    id: 'general',
    title: 'General',
    body: (
      <p>
        These terms are governed by the laws of the United States and the state where AthleteDesk is based, without
        regard to conflict-of-law rules. If we make material changes, we will update this page and the date at the
        top and tell agency admins; continuing to use AthleteDesk after that means you accept the changes. Questions
        can be sent to <a className={legalLink} href={`mailto:${DEMO_CONTACT_EMAIL}`}>{DEMO_CONTACT_EMAIL}</a>.
      </p>
    ),
  },
]

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated={updated} summary={summary} sections={sections} current="terms" />
}
