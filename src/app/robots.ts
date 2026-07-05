import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // keep crawlers out of the app + auth surfaces; only the marketing pages matter
      disallow: ['/api/', '/admin', '/dashboard', '/invite', '/onboarding', '/auth/'],
    },
    sitemap: 'https://athletedesk.io/sitemap.xml',
  }
}
