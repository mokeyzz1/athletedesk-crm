'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from './auth'
import { AuthError } from './errors'

export type NotificationType = 'assignment' | 'mention' | 'contract' | 'task' | 'system'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message?: string
  href?: string
  entityType?: string
  entityId?: string
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId: actorId } = await getAuthContext()

    const supabase = await createClient()

    const { error } = await supabase.from('notifications').insert({
      organization_id: organizationId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message || null,
      href: input.href || null,
      actor_id: actorId,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
    } as never)

    if (error) {
      console.error('Create notification error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Create notification unexpected error:', err)
    return { success: false, error: 'Failed to create notification' }
  }
}

/**
 * Create multiple notifications at once
 */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { organizationId, userId: actorId } = await getAuthContext()

    if (inputs.length === 0) {
      return { success: true }
    }

    const supabase = await createClient()

    const notifications = inputs.map((input) => ({
      organization_id: organizationId,
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message || null,
      href: input.href || null,
      actor_id: actorId,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
    }))

    const { error } = await supabase.from('notifications').insert(notifications as never[])

    if (error) {
      console.error('Create notifications error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    console.error('Create notifications unexpected error:', err)
    return { success: false, error: 'Failed to create notifications' }
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await getAuthContext()

    const supabase = await createClient()

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('id', notificationId)

    if (error) {
      console.error('Mark notification read error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Failed to mark notification as read' }
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await getAuthContext()

    const supabase = await createClient()

    // Get the user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .single() as { data: { id: string } | null }

    if (!userData) {
      return { success: false, error: 'User not found' }
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', userData.id)
      .eq('is_read', false)

    if (error) {
      console.error('Mark all notifications read error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message }
    }
    return { success: false, error: 'Failed to mark notifications as read' }
  }
}
