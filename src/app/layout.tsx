import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://athletedesk.io'),
  title: {
    default: 'AthleteDesk — The CRM Built for Sports & NIL Agencies',
    template: '%s · AthleteDesk',
  },
  description:
    'The CRM built for NIL and sports agencies — recruiting, Gmail outreach, brand deals, and revenue in one place. No per-seat fees. No % of your deals.',
  openGraph: {
    title: 'AthleteDesk — The CRM Built for Sports & NIL Agencies',
    description:
      'Run the full athlete business from one desk. No per-seat fees. No % of your deals.',
    url: 'https://athletedesk.io',
    siteName: 'AthleteDesk',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable}`}>{children}</body>
    </html>
  )
}
