import { createHash } from 'node:crypto'
import { z } from 'zod'

export const accessRequestStatusSchema = z.enum(['new', 'contacted', 'closed'])
export type AccessRequestStatus = z.infer<typeof accessRequestStatusSchema>

export function createAccessRequestDedupeKey(email: string, now = new Date()) {
  const utcDay = now.toISOString().slice(0, 10)
  return createHash('sha256')
    .update(`${email.trim().toLowerCase()}:${utcDay}`)
    .digest('hex')
}
