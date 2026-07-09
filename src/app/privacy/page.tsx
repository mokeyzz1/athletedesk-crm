import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { DEMO_CONTACT_EMAIL } from '@/lib/demo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How AthleteDesk collects, uses, and protects your data.',
}

const updated = 'July 9, 2026'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f4f4f1] text-neutral-900">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to AthleteDesk home" className="flex items-center gap-2.5">
            <span className="relative h-8 w-11 overflow-hidden">
              <Image src="/brand/athletedesk-logo-transparent.png" alt="AthleteDesk logo" fill sizes="44px" className="object-contain object-center" priority />
            </span>
            <span className="text-sm font-bold uppercase tracking-tight text-neutral-900">AthleteDesk</span>
          </Link>
          <Link href="/" className="text-sm font-bold text-brand-600 hover:text-brand-500">Home</Link>
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: {updated}</p>

        <div className="prose prose-neutral mt-10 max-w-none space-y-8 text-[15px] leading-7 text-neutral-700">
          <section>
            <h2 className="text-xl font-bold text-neutral-900">Who we are</h2>
            <p className="mt-2">
              AthleteDesk (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a CRM platform for sports agencies at
              athletedesk.io. This policy explains what we collect, why we collect it, how we protect it, and
              the choices available to account holders and agency administrators. It applies to the AthleteDesk
              web application and website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li><strong>Account information</strong> — your name, email address, and profile details when you sign in with Google or accept an organization invite.</li>
              <li><strong>Workspace data</strong> — athlete records, communications logs, tasks, documents, deal and revenue records that your organization enters into the CRM. Your organization owns this data.</li>
              <li><strong>Gmail data (optional)</strong> — if you connect Gmail, we access the Gmail data needed to send messages on your behalf, display relevant messages, and connect communication history to athlete records. See &ldquo;Google user data&rdquo; below.</li>
              <li><strong>Usage and diagnostics</strong> — basic logs, device/browser metadata, and error reports so we can secure the service and keep the product reliable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">Google user data</h2>
            <p className="mt-2">
              AthleteDesk&apos;s use and transfer of information received from Google APIs adheres to the{' '}
              <a className="font-semibold text-brand-600 hover:text-brand-500" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>, including the Limited Use requirements. Specifically:
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Gmail access is used only to provide user-facing email features inside AthleteDesk, including sending messages you compose, showing connected email history, and logging communications to athlete records.</li>
              <li>We do not sell Google user data, use it for advertising, or use it to train generalized AI models.</li>
              <li>Human access to Google user data is limited to cases where you give permission, where access is needed for security or abuse investigation, or where required by law.</li>
              <li>OAuth tokens can be revoked from AthleteDesk settings or from your Google account permissions page.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">How we use information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>To provide and operate the CRM for your organization.</li>
              <li>To send transactional messages (invites, notifications you enable).</li>
              <li>To secure the service, prevent abuse, and debug errors.</li>
              <li>We do <strong>not</strong> sell your data or use it for third-party advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">How data is stored and shared</h2>
            <p className="mt-2">
              Data is hosted with Supabase (PostgreSQL) and Vercel. Error diagnostics are processed by Sentry.
              Each organization&apos;s data is isolated with row-level security. Data is encrypted in transit.
              We share data only with these processors as needed to run the service, or if the law requires it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">Retention and deletion</h2>
            <p className="mt-2">
              Workspace data is retained while your organization&apos;s account is active. You can delete records
              inside the app at any time. To delete your account or your organization&apos;s workspace entirely,
              email us and we will review and complete the deletion request within 30 days unless a longer
              retention period is required for security, legal, or billing reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">Your rights</h2>
            <p className="mt-2">
              You may request access to, correction of, or deletion of your personal information, and you may
              disconnect Gmail or revoke access at any time. Contact us to exercise any of these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">Changes and contact</h2>
            <p className="mt-2">
              If we make material changes to this policy we will update this page and the date above. Questions or
              requests can be sent to <a className="font-semibold text-brand-600 hover:text-brand-500" href={`mailto:${DEMO_CONTACT_EMAIL}`}>{DEMO_CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
