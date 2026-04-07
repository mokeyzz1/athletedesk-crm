import { createClient } from '@/lib/supabase/server'
import type { IntegrationProvider, UserIntegration, UserIntegrationUpdate } from '@/lib/database.types'

const REFRESH_URLS: Record<IntegrationProvider, string> = {
  google_calendar: 'https://oauth2.googleapis.com/token',
  calendly: 'https://auth.calendly.com/oauth/token',
  docusign: process.env.NODE_ENV === 'production'
    ? 'https://account.docusign.com/oauth/token'
    : 'https://account-d.docusign.com/oauth/token',
  apollo: 'https://app.apollo.io/api/v1/oauth/token',
}

const CLIENT_IDS: Record<IntegrationProvider, string> = {
  google_calendar: process.env.GOOGLE_CLIENT_ID!,
  calendly: process.env.CALENDLY_CLIENT_ID!,
  docusign: process.env.DOCUSIGN_CLIENT_ID!,
  apollo: process.env.APOLLO_CLIENT_ID!,
}

const CLIENT_SECRETS: Record<IntegrationProvider, string> = {
  google_calendar: process.env.GOOGLE_CLIENT_SECRET!,
  calendly: process.env.CALENDLY_CLIENT_SECRET!,
  docusign: process.env.DOCUSIGN_CLIENT_SECRET!,
  apollo: process.env.APOLLO_CLIENT_SECRET!,
}

// Token expiry buffer - refresh 5 minutes before actual expiry
const EXPIRY_BUFFER_MS = 5 * 60 * 1000

/**
 * Check if a token needs to be refreshed
 */
export function isTokenExpired(tokenExpiresAt: string | null): boolean {
  if (!tokenExpiresAt) return false
  const expiryTime = new Date(tokenExpiresAt).getTime()
  const bufferTime = Date.now() + EXPIRY_BUFFER_MS
  return expiryTime <= bufferTime
}

/**
 * Refresh an OAuth token for a given provider
 */
async function refreshToken(
  provider: IntegrationProvider,
  refreshToken: string
): Promise<{ access_token: string; expires_in?: number; refresh_token?: string } | null> {
  const refreshUrl = REFRESH_URLS[provider]
  const clientId = CLIENT_IDS[provider]
  const clientSecret = CLIENT_SECRETS[provider]

  if (!clientId || !clientSecret) {
    console.error(`Missing credentials for ${provider}`)
    return null
  }

  try {
    let headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    // DocuSign uses Basic auth for token refresh
    if (provider === 'docusign') {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      headers['Authorization'] = `Basic ${basicAuth}`
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      ...(provider !== 'docusign' && { client_id: clientId }),
      ...(provider !== 'docusign' && { client_secret: clientSecret }),
    })

    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Token refresh failed for ${provider}:`, errorText)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`Token refresh error for ${provider}:`, error)
    return null
  }
}

/**
 * Get a valid integration with fresh access token
 * Automatically refreshes if expired
 */
export async function getValidIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<UserIntegration | null> {
  const supabase = await createClient()

  // Fetch the integration
  const { data: integrationData, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)
    .single()

  if (error || !integrationData) {
    return null
  }

  // Type assertion for Supabase query result
  const integration = integrationData as UserIntegration

  // Check if token needs refresh
  if (integration.refresh_token && isTokenExpired(integration.token_expires_at)) {
    const newTokens = await refreshToken(provider, integration.refresh_token)

    if (newTokens) {
      // Calculate new expiry
      const expiresAt = newTokens.expires_in
        ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        : integration.token_expires_at

      // Update the integration with new tokens
      const updatePayload: UserIntegrationUpdate = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || integration.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }
      const { data: updatedData, error: updateError } = await supabase
        .from('user_integrations')
        .update(updatePayload as never)
        .eq('id', integration.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update tokens:', updateError)
        // Return original integration, it might still work
        return integration
      }

      return updatedData as UserIntegration
    }

    // Refresh failed - token might be revoked
    console.error(`Token refresh failed for ${provider}, marking as inactive`)
    const deactivatePayload: UserIntegrationUpdate = { is_active: false }
    await supabase
      .from('user_integrations')
      .update(deactivatePayload as never)
      .eq('id', integration.id)

    return null
  }

  return integration
}

/**
 * Get access token for a provider (convenience function)
 * Returns null if no valid integration exists
 */
export async function getAccessToken(
  userId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const integration = await getValidIntegration(userId, provider)
  return integration?.access_token || null
}

/**
 * Check if user has an active integration for a provider
 */
export async function hasIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<boolean> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('user_integrations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('provider', provider)
    .eq('is_active', true)

  return (count || 0) > 0
}
