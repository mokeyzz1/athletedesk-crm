// Outreach statuses used throughout the app
export type OutreachStatus =
  | 'not_contacted'
  | 'contacted'
  | 'in_conversation'
  | 'interested'
  | 'circling_back'
  | 'dead_lead'
  | 'signed'

// Badge colors for status display
export const STATUS_COLORS: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  in_conversation: 'bg-indigo-100 text-indigo-700',
  interested: 'bg-yellow-100 text-yellow-700',
  circling_back: 'bg-orange-100 text-orange-700',
  dead_lead: 'bg-red-100 text-red-700',
  signed: 'bg-green-100 text-green-700',
}

// Progress bar segment colors (solid backgrounds)
export const STATUS_BAR_COLORS: Record<OutreachStatus, string> = {
  not_contacted: 'bg-gray-400',
  contacted: 'bg-blue-400',
  in_conversation: 'bg-indigo-400',
  interested: 'bg-yellow-400',
  circling_back: 'bg-orange-400',
  dead_lead: 'bg-red-400',
  signed: 'bg-green-400',
}

// Human-readable labels
export const STATUS_LABELS: Record<OutreachStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  in_conversation: 'In Conversation',
  interested: 'Interested',
  circling_back: 'Circling Back',
  dead_lead: 'Dead Lead',
  signed: 'Signed',
}

// All statuses in pipeline order
export const OUTREACH_STATUSES: OutreachStatus[] = [
  'not_contacted',
  'contacted',
  'in_conversation',
  'interested',
  'circling_back',
  'dead_lead',
  'signed',
]

// Class years (updated annually)
export const CLASS_YEARS = ['2025', '2026', '2027', '2028', '2029']

// US Regions
export const REGIONS = [
  'Northeast',
  'Southeast',
  'Midwest',
  'Southwest',
  'West',
  'International',
]
