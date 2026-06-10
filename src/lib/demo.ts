export const DEMO_USER_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@athletedesk.app'

export const DEMO_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_DEMO_CONTACT_EMAIL || 'moseskorom82@gmail.com'

export const DEMO_PASSWORD_HINT = process.env.NEXT_PUBLIC_DEMO_PASSWORD_HINT || ''

export const SHOW_DEMO_CREDENTIALS =
  process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true' &&
  DEMO_PASSWORD_HINT.length > 0

export function buildDemoAccessMailto(subject = 'AthleteDesk - Request Access') {
  return `mailto:${DEMO_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

export function isDemoUser(email: string | null | undefined) {
  return Boolean(email && email.toLowerCase() === DEMO_USER_EMAIL.toLowerCase())
}
