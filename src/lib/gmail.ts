/**
 * Gmail API utility for sending emails
 * Uses the user's OAuth access token from Supabase
 */

interface EmailOptions {
  to: string
  subject: string
  body: string
  html?: boolean
}

/**
 * Send an email using Gmail API
 * @param accessToken - The user's Google OAuth access token from Supabase session
 * @param options - Email options (to, subject, body)
 */
export async function sendEmail(accessToken: string, options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, body, html = true } = options

  // Create the email in RFC 2822 format
  const emailContent = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8`,
    '',
    body,
  ].join('\r\n')

  // Base64 URL encode the email
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Gmail API error:', error)
      return { success: false, error: error.error?.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Generate invite email HTML
 */
export function generateInviteEmail(options: {
  inviteUrl: string
  inviteType: 'new_org' | 'join_org'
  organizationName?: string
  expiresInDays: number
}): { subject: string; body: string } {
  const { inviteUrl, inviteType, organizationName, expiresInDays } = options

  const subject = inviteType === 'new_org'
    ? "You're invited to join AthleteDesk"
    : `You're invited to join ${organizationName} on AthleteDesk`

  const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 12px; line-height: 60px;">
      <span style="color: white; font-weight: bold; font-size: 24px;">AD</span>
    </div>
  </div>

  <h1 style="font-size: 24px; font-weight: 600; text-align: center; margin-bottom: 20px;">
    ${inviteType === 'new_org' ? "You're invited to AthleteDesk" : `Join ${organizationName}`}
  </h1>

  <p style="color: #666; text-align: center; margin-bottom: 30px;">
    ${inviteType === 'new_org'
      ? "You've been invited to create your sports agency on AthleteDesk - the modern CRM for athlete management."
      : `You've been invited to join ${organizationName} on AthleteDesk.`
    }
  </p>

  <div style="text-align: center; margin-bottom: 30px;">
    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
      ${inviteType === 'new_org' ? 'Get Started' : 'Accept Invitation'}
    </a>
  </div>

  <p style="color: #999; font-size: 14px; text-align: center;">
    This invitation expires in ${expiresInDays} days.
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>

  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 10px;">
    <a href="${inviteUrl}" style="color: #999; word-break: break-all;">${inviteUrl}</a>
  </p>
</body>
</html>
`

  return { subject, body }
}
