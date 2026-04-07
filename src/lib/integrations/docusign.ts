import { getValidIntegration, getAccessToken } from './token-refresh'

export interface DocuSignTemplate {
  templateId: string
  name: string
  description?: string
  shared: boolean
  created: string
  lastModified: string
}

export interface DocuSignEnvelope {
  envelopeId: string
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided'
  statusDateTime: string
  sentDateTime?: string
  deliveredDateTime?: string
  completedDateTime?: string
  emailSubject?: string
  emailBlurb?: string
}

export interface DocuSignRecipient {
  email: string
  name: string
  recipientId?: string
  clientUserId?: string // For embedded signing
  tabs?: {
    signHereTabs?: Array<{
      documentId: string
      pageNumber: string
      xPosition: string
      yPosition: string
    }>
  }
}

/**
 * Get DocuSign account info and base URI from stored integration
 */
async function getAccountInfo(
  userId: string
): Promise<{ accountId: string; baseUri: string } | null> {
  const integration = await getValidIntegration(userId, 'docusign')
  if (!integration) return null

  const settings = integration.settings as {
    account_id?: string
    base_uri?: string
  } | null

  if (!settings?.account_id || !settings?.base_uri) {
    console.error('DocuSign account info not found in integration settings')
    return null
  }

  return {
    accountId: settings.account_id,
    baseUri: settings.base_uri,
  }
}

/**
 * List available templates
 */
export async function listTemplates(
  userId: string
): Promise<{ templates: DocuSignTemplate[]; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { templates: [], error: 'No valid DocuSign integration' }
  }

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/templates`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign list templates error:', error)
      return { templates: [], error: 'Failed to fetch templates' }
    }

    const data = await response.json()
    return { templates: data.envelopeTemplates || [] }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { templates: [], error: 'API request failed' }
  }
}

/**
 * Send an envelope (contract) using a template
 */
export async function sendEnvelopeFromTemplate(
  userId: string,
  options: {
    templateId: string
    recipient: DocuSignRecipient
    emailSubject?: string
    emailBlurb?: string
  }
): Promise<{ envelope?: DocuSignEnvelope; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { error: 'No valid DocuSign integration' }
  }

  const envelopeDefinition = {
    templateId: options.templateId,
    templateRoles: [
      {
        email: options.recipient.email,
        name: options.recipient.name,
        roleName: 'Signer', // Must match template role
        clientUserId: options.recipient.clientUserId,
      },
    ],
    status: 'sent', // Send immediately
    emailSubject: options.emailSubject,
    emailBlurb: options.emailBlurb,
  }

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeDefinition),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign send envelope error:', error)
      return { error: 'Failed to send envelope' }
    }

    const data = await response.json()
    return { envelope: data }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Get envelope (contract) status
 */
export async function getEnvelopeStatus(
  userId: string,
  envelopeId: string
): Promise<{ envelope?: DocuSignEnvelope; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { error: 'No valid DocuSign integration' }
  }

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/envelopes/${envelopeId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign get envelope error:', error)
      return { error: 'Failed to fetch envelope' }
    }

    const data = await response.json()
    return { envelope: data }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * Download signed document from an envelope
 */
export async function downloadDocument(
  userId: string,
  envelopeId: string,
  documentId: string = 'combined' // 'combined' gets all docs as one PDF
): Promise<{ document?: ArrayBuffer; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { error: 'No valid DocuSign integration' }
  }

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/envelopes/${envelopeId}/documents/${documentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign download document error:', error)
      return { error: 'Failed to download document' }
    }

    const document = await response.arrayBuffer()
    return { document }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { error: 'API request failed' }
  }
}

/**
 * List envelopes (contracts) for the account
 */
export async function listEnvelopes(
  userId: string,
  options: {
    fromDate?: string
    toDate?: string
    status?: string
    count?: number
  } = {}
): Promise<{ envelopes: DocuSignEnvelope[]; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { envelopes: [], error: 'No valid DocuSign integration' }
  }

  // Default to last 30 days if no date specified
  const fromDate = options.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const params = new URLSearchParams({
    from_date: fromDate,
    count: String(options.count || 50),
    ...(options.toDate && { to_date: options.toDate }),
    ...(options.status && { status: options.status }),
  })

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/envelopes?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign list envelopes error:', error)
      return { envelopes: [], error: 'Failed to fetch envelopes' }
    }

    const data = await response.json()
    return { envelopes: data.envelopes || [] }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { envelopes: [], error: 'API request failed' }
  }
}

/**
 * Void (cancel) an envelope
 */
export async function voidEnvelope(
  userId: string,
  envelopeId: string,
  voidReason: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken(userId, 'docusign')
  const accountInfo = await getAccountInfo(userId)

  if (!token || !accountInfo) {
    return { success: false, error: 'No valid DocuSign integration' }
  }

  try {
    const response = await fetch(
      `${accountInfo.baseUri}/restapi/v2.1/accounts/${accountInfo.accountId}/envelopes/${envelopeId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'voided',
          voidedReason: voidReason,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('DocuSign void envelope error:', error)
      return { success: false, error: 'Failed to void envelope' }
    }

    return { success: true }
  } catch (error) {
    console.error('DocuSign API error:', error)
    return { success: false, error: 'API request failed' }
  }
}
