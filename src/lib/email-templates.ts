export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  category: 'outreach' | 'followup' | 'contract' | 'nil' | 'signing'
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'initial-outreach',
    name: 'Initial Outreach',
    category: 'outreach',
    subject: 'Introduction from {{agency_name}} - Representation Opportunity',
    body: `Hi {{athlete_name}},

I hope this message finds you well. My name is {{user_name}} and I'm reaching out from {{agency_name}}.

I've been following your impressive performance at {{school}} and believe you have tremendous potential both on and off the field. We specialize in helping athletes like yourself maximize their opportunities through strategic brand partnerships and career guidance.

I'd love to schedule a brief call to introduce ourselves and learn more about your goals. Would you have 15-20 minutes available this week?

Looking forward to connecting.

Best regards,
{{user_name}}
{{agency_name}}`
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    category: 'followup',
    subject: 'Following Up - {{agency_name}}',
    body: `Hi {{athlete_name}},

I wanted to follow up on my previous message. I understand you have a busy schedule, but I truly believe we could help you capitalize on some exciting opportunities.

We've recently helped athletes in similar positions secure partnerships with major brands and navigate their career transitions successfully.

If you have a few minutes this week, I'd be happy to share some specific ideas for how we could work together.

Let me know what works best for your schedule.

Best,
{{user_name}}
{{agency_name}}`
  },
  {
    id: 'contract-discussion',
    name: 'Contract Discussion',
    category: 'contract',
    subject: 'Contract Details - Next Steps',
    body: `Hi {{athlete_name}},

Thank you for our recent conversation. I'm excited about the possibility of working together.

As discussed, I've attached the representation agreement for your review. Here are the key points:

- Commission structure: [Details]
- Services included: Full-service representation including NIL deals, endorsements, and career management
- Contract term: [Duration]

Please take your time reviewing the document and don't hesitate to reach out with any questions. I'm also happy to schedule a call with you and your family to go over everything in detail.

Looking forward to hearing from you.

Best regards,
{{user_name}}
{{agency_name}}`
  },
  {
    id: 'nil-opportunity',
    name: 'NIL Opportunity',
    category: 'nil',
    subject: 'Exciting NIL Opportunity - {{brand_name}}',
    body: `Hi {{athlete_name}},

I have some exciting news! We've been approached by {{brand_name}} who is interested in partnering with you.

Here are the initial details:
- Brand: {{brand_name}}
- Type of partnership: [Social media campaign / Endorsement / Appearance]
- Compensation: [Amount/Details]
- Timeline: [Dates]

This aligns well with your brand and I think it could be a great fit. I'd love to discuss this opportunity with you at your earliest convenience.

Can we schedule a quick call to go over the details?

Best,
{{user_name}}
{{agency_name}}`
  },
  {
    id: 'signing-invitation',
    name: 'Signing Invitation',
    category: 'signing',
    subject: 'Welcome to {{agency_name}} - Signing Details',
    body: `Hi {{athlete_name}},

We're thrilled that you've decided to join the {{agency_name}} family! Welcome aboard.

To make things official, we'd like to schedule a signing meeting. Here are the details:

Date: [Date]
Time: [Time]
Location: [Address / Virtual Link]

Please bring a valid ID and feel free to have a family member or advisor present if you'd like.

After signing, we'll immediately begin working on:
1. Building your brand profile
2. Identifying partnership opportunities
3. Developing your long-term career strategy

If you have any questions before our meeting, please don't hesitate to reach out.

We're excited to get started!

Best regards,
{{user_name}}
{{agency_name}}`
  }
]

export function applyTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`)
  }
  return result
}
