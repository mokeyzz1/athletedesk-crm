import { z } from 'zod'

// Common schemas
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(254, 'Email too long')
  .transform((v) => v.toLowerCase().trim())

export const phoneSchema = z
  .string()
  .max(20, 'Phone number too long')
  .regex(/^[\d\s\-+()]*$/, 'Invalid phone number format')
  .optional()
  .nullable()

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL too long')
  .optional()
  .nullable()
  .or(z.literal(''))

export const uuidSchema = z.string().uuid('Invalid ID format')

// User roles
export const userRoleSchema = z.enum(['admin', 'agent', 'scout', 'marketing', 'intern'])

// Athlete schemas
export const createAthleteSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name too long')
    .transform((v) => v.trim()),
  sport: z
    .string()
    .min(1, 'Sport is required')
    .max(100, 'Sport name too long')
    .transform((v) => v.trim()),
  email: emailSchema.optional().nullable().or(z.literal('')),
  phone: phoneSchema,
  school: z.string().max(200, 'School name too long').optional().nullable(),
  position: z.string().max(100, 'Position too long').optional().nullable(),
  year: z.string().max(50, 'Year too long').optional().nullable(),
  state: z.string().max(100, 'State too long').optional().nullable(),
  region: z.string().max(100, 'Region too long').optional().nullable(),
  notes: z.string().max(10000, 'Notes too long').optional().nullable(),
  twitter_url: urlSchema,
  instagram_url: urlSchema,
  tiktok_url: urlSchema,
  hudl_url: urlSchema,
  athletic_net_url: urlSchema,
  youtube_url: urlSchema,
  height: z.string().max(20, 'Height too long').optional().nullable(),
  weight: z.string().max(20, 'Weight too long').optional().nullable(),
  gpa: z.string().max(10, 'GPA too long').optional().nullable(),
  hometown: z.string().max(200, 'Hometown too long').optional().nullable(),
  profile_image_url: urlSchema,
  marketability_score: z
    .number()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100')
    .optional()
    .nullable(),
})

export const updateAthleteSchema = createAthleteSchema.partial().extend({
  id: uuidSchema,
})

// Outreach status
export const outreachStatusSchema = z.enum([
  'not_contacted',
  'contacted',
  'in_conversation',
  'interested',
  'signed',
  'dead_lead',
  'circling_back',
])

// Pipeline stage
export const pipelineStageSchema = z.enum([
  'prospect_identified',
  'scout_evaluation',
  'initial_contact',
  'recruiting_conversation',
  'interested',
  'signing_in_progress',
  'signed_client',
])

// Communication type
export const communicationTypeSchema = z.enum(['email', 'call', 'text', 'zoom', 'in_person', 'other'])

// Team invite
export const teamInviteSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
})

// Email send
export const sendEmailSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(100000, 'Email body too long'),
  athleteId: uuidSchema.optional(),
})

// Task
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long').transform((v) => v.trim()),
  description: z.string().max(10000, 'Description too long').optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  athlete_id: uuidSchema.optional().nullable(),
  assigned_to: uuidSchema.optional().nullable(),
})

// Brand outreach
export const createBrandOutreachSchema = z.object({
  athlete_id: uuidSchema,
  brand_name: z.string().min(1, 'Brand name is required').max(200, 'Brand name too long'),
  contact_name: z.string().max(200, 'Contact name too long').optional().nullable(),
  contact_email: emailSchema.optional().nullable().or(z.literal('')),
  deal_value: z.number().min(0, 'Deal value must be positive').optional().nullable(),
  notes: z.string().max(10000, 'Notes too long').optional().nullable(),
})

// Financial tracking
export const createFinancialSchema = z.object({
  athlete_id: uuidSchema,
  deal_type: z.enum(['revenue_share', 'marketing_brand']),
  deal_name: z.string().min(1, 'Deal name is required').max(200, 'Deal name too long'),
  total_value: z.number().min(0, 'Value must be positive'),
  agency_fee_percent: z.number().min(0).max(100).optional(),
  notes: z.string().max(10000, 'Notes too long').optional().nullable(),
})

// Helper to validate and return typed result
export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.issues[0]
  return {
    success: false,
    error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Validation failed'
  }
}
