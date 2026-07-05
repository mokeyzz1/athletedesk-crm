import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_CONTACT_EMAIL } from '@/lib/demo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern use of AthleteDesk.',
}

const updated = 'July 4, 2026'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f1] text-neutral-900">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <Link href="/" className="text-sm font-bold text-brand-600 hover:text-brand-500">← AthleteDesk</Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: {updated}</p>

        <div className="mt-10 max-w-none space-y-8 text-[15px] leading-7 text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">1. The service</h2>
            <p className="mt-2">
              AthleteDesk is a CRM platform for sports agencies: recruiting pipelines, athlete records,
              communications, tasks, brand deals, and revenue tracking. Access is currently by invitation.
              By creating an account or accepting an invite you agree to these terms on behalf of yourself
              and, if applicable, the organization you represent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">2. Accounts and organizations</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>You are responsible for activity under your account and for keeping your sign-in method secure.</li>
              <li>Organization admins control who can join their workspace and what roles members hold.</li>
              <li>You must provide accurate information and be authorized to act for your organization.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">3. Your data</h2>
            <p className="mt-2">
              Your organization owns the data it puts into AthleteDesk. You grant us the limited rights needed to
              host, process, back up, and display that data in order to run the service — nothing more. Our
              handling of personal data is described in the{' '}
              <Link href="/privacy" className="font-semibold text-brand-600 hover:text-brand-500">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">4. Acceptable use</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>No unlawful use, including violations of recruiting, NIL, or athlete-representation regulations that apply to your organization.</li>
              <li>No sending spam or unlawful communications through connected email accounts.</li>
              <li>No attempting to access other organizations&apos; data, probe, or disrupt the service.</li>
              <li>No reselling or white-labeling the service without a written agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">5. Third-party services</h2>
            <p className="mt-2">
              Optional integrations (such as Gmail, Google Calendar, DocuSign, Calendly) are governed by those
              providers&apos; own terms. You can disconnect them at any time. We are not responsible for
              third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">6. Availability and changes</h2>
            <p className="mt-2">
              We work to keep AthleteDesk available and fast, but the service is provided &ldquo;as is&rdquo;
              without warranties of any kind. We may improve or change features over time. If we ever discontinue
              the service, we will give you a reasonable opportunity to export your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">7. Limitation of liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, AthleteDesk will not be liable for indirect, incidental,
              special, or consequential damages, or lost profits or revenue. Our total liability for any claim is
              limited to the amounts your organization paid us in the twelve months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">8. Termination</h2>
            <p className="mt-2">
              You may stop using the service and request deletion at any time. We may suspend or terminate access
              for material breach of these terms. Sections 3, 7, and 9 survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">9. General</h2>
            <p className="mt-2">
              These terms are governed by the laws of the United States and the state in which AthleteDesk is
              established, without regard to conflict-of-law rules. If we update these terms materially, we will
              update this page and the date above; continued use after changes means acceptance. Questions:{' '}
              <a className="font-semibold text-brand-600 hover:text-brand-500" href={`mailto:${DEMO_CONTACT_EMAIL}`}>{DEMO_CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
