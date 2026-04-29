import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Athlete, CommunicationLog, RecruitingPipeline, FinancialTracking, BrandOutreach, Document, UserRole, ActivityEvent } from '@/lib/database.types'
import { type SocialMediaData, calculateTotalFollowing, formatFollowerCount } from '@/lib/sport-fields'
import { FaInstagram, FaXTwitter, FaTiktok, FaYoutube } from 'react-icons/fa6'
import { AthleteDocuments } from './athlete-documents'
import { SendEmailButton } from './send-email-button'
import { ScheduleMeetingButton } from './schedule-meeting-button'
import { SendCalendlyLinkButton } from './send-calendly-link-button'
import { SendContractButton } from './send-contract-button'
import { AthleteContracts } from './athlete-contracts'
import { EditAthleteButton } from '@/components/athletes/edit-athlete-button'
import { DeleteAthleteButton } from './delete-athlete-button'
import { PipelineStatusCard } from './pipeline-status-card'
import { getAthleteEmailCount } from '@/lib/queries/email-stats'
import { formatDate } from '@/lib/helpers'
import { SelfAssignButton } from '@/components/athletes/self-assign-button'
import { hasWorkRole, isAdminLike } from '@/lib/roles'

interface AthletePageProps {
  params: Promise<{ id: string }>
}

interface AthleteWithStaff extends Athlete {
  assigned_scout: { id: string; name: string } | null
  assigned_agent: { id: string; name: string } | null
  assigned_marketing: { id: string; name: string } | null
}

interface CommunicationWithUser extends CommunicationLog {
  users: { name: string } | null
}

interface BrandWithDetails extends BrandOutreach {
  users: { name: string } | null
}

interface DocumentWithUser extends Document {
  users: { name: string } | null
}

interface ActivityEventWithActor extends ActivityEvent {
  actor: { name: string } | null
}

type ActivityItem = {
  id: string
  type: 'communication' | 'brand' | 'financial' | 'document' | 'pipeline' | 'activity'
  date: string
  title: string
  description: string
  icon: string
  color: string
}

export default async function AthletePage({ params }: AthletePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, role, roles')
    .eq('auth_user_id', user?.id || '')
    .maybeSingle() as { data: { id: string; role: UserRole; roles: UserRole[] | null } | null }

  const { data } = await supabase
    .from('athletes')
    .select(`
      *,
      assigned_scout:users!athletes_assigned_scout_id_fkey (id, name),
      assigned_agent:users!athletes_assigned_agent_id_fkey (id, name),
      assigned_marketing:users!athletes_assigned_marketing_lead_id_fkey (id, name)
    `)
    .eq('id', id)
    .single()

  const athlete = data as AthleteWithStaff | null

  if (!athlete) {
    notFound()
  }

  // Fetch all related data in parallel with limits to avoid loading unused records
  const [pipelineRes, communicationsRes, brandsRes, financialsRes, documentsRes, activityEventsRes, emailCount] = await Promise.all([
    supabase.from('recruiting_pipeline').select('*').eq('athlete_id', id).single(),
    supabase.from('communications_log').select('*, users:staff_member_id (name)').eq('athlete_id', id).order('communication_date', { ascending: false }).limit(20),
    supabase.from('brand_outreach').select('*, users:staff_member_id (name)').eq('athlete_id', id).order('date_contacted', { ascending: false }).limit(20),
    supabase.from('financial_tracking').select('*').eq('athlete_id', id).order('deal_date', { ascending: false }).limit(20),
    supabase.from('documents').select('*, users:uploaded_by (name)').eq('athlete_id', id).order('created_at', { ascending: false }).limit(20),
    supabase.from('activity_events').select('*, actor:actor_id (name)').eq('entity_type', 'athlete').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
    getAthleteEmailCount(id),
  ])

  const pipeline = pipelineRes.data as RecruitingPipeline | null
  const communications = (communicationsRes.data ?? []) as CommunicationWithUser[]
  const brands = (brandsRes.data ?? []) as BrandWithDetails[]
  const financials = (financialsRes.data ?? []) as FinancialTracking[]
  const documents = (documentsRes.data ?? []) as DocumentWithUser[]
  const activityEvents = (activityEventsRes.data ?? []) as ActivityEventWithActor[]

  const socialMedia = athlete.social_media as SocialMediaData | null
  const totalFollowing = socialMedia ? calculateTotalFollowing(socialMedia) : 0
  // Self-assign: work role holders OR admins can self-assign
  const canSelfAssignScout = (hasWorkRole(currentUser, 'scout') || isAdminLike(currentUser)) && !athlete.assigned_scout_id
  const canSelfAssignAgent = (hasWorkRole(currentUser, 'agent') || isAdminLike(currentUser)) && !athlete.assigned_agent_id
  const canSelfAssignMarketing = (hasWorkRole(currentUser, 'marketing') || isAdminLike(currentUser)) && !athlete.assigned_marketing_lead_id

  // Build activity timeline
  const activities: ActivityItem[] = [
    ...communications.map(c => ({
      id: c.id,
      type: 'communication' as const,
      date: c.communication_date,
      title: `${c.type.charAt(0).toUpperCase() + c.type.slice(1)} - ${c.subject || 'No subject'}`,
      description: c.users?.name ? `by ${c.users.name}` : '',
      icon: c.type === 'email' ? 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' :
            c.type === 'call' ? 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' :
            c.type === 'text' ? 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' :
            'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      color: 'bg-blue-100 text-blue-600',
    })),
    ...brands.map(b => ({
      id: b.id,
      type: 'brand' as const,
      date: b.date_contacted,
      title: `Brand Outreach - ${b.brand_name}`,
      description: b.response_status.replace(/_/g, ' '),
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5',
      color: 'bg-orange-100 text-orange-600',
    })),
    ...financials.map(f => ({
      id: f.id,
      type: 'financial' as const,
      date: f.deal_date,
      title: `Deal Closed - ${f.deal_name}`,
      description: `$${Number(f.deal_value).toLocaleString()}`,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-green-100 text-green-600',
    })),
    ...documents.map(d => ({
      id: d.id,
      type: 'document' as const,
      date: d.created_at,
      title: `Document Added - ${d.name}`,
      description: d.users?.name ? `by ${d.users.name}` : '',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'bg-purple-100 text-purple-600',
    })),
    ...activityEvents.map(event => ({
      id: event.id,
      type: 'activity' as const,
      date: event.created_at,
      title: event.title,
      description: event.actor?.name ? `by ${event.actor.name}` : '',
      icon: event.event_type === 'athlete.status_changed'
        ? 'M7 7h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
        : 'M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: event.event_type === 'athlete.handoff'
        ? 'bg-indigo-100 text-indigo-600'
        : 'bg-gray-100 text-gray-600',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      not_recruiting: 'badge-gray',
      open_to_contact: 'badge-blue',
      actively_recruiting: 'badge-green',
      committed: 'badge-yellow',
      signed: 'badge-green',
    }
    return statusClasses[status] || 'badge-gray'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-600 font-bold text-2xl">
              {athlete.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{athlete.name}</h1>
            <p className="text-gray-600">
              {athlete.sport} {athlete.position && `- ${athlete.position}`}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={getStatusBadge(athlete.recruiting_status)}>
                {athlete.recruiting_status.replace(/_/g, ' ')}
              </span>
              {athlete.transfer_portal_status !== 'not_in_portal' && (
                <span className="badge-yellow">
                  {athlete.transfer_portal_status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
        <EditAthleteButton athleteId={id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Athlete Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">School</dt>
                <dd className="mt-1 text-sm text-gray-900">{athlete.school || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">League/Level</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{athlete.league_level.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Eligibility Year</dt>
                <dd className="mt-1 text-sm text-gray-900">{athlete.eligibility_year || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Marketability Score</dt>
                <dd className="mt-1">
                  {athlete.marketability_score !== null ? (
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-brand-600 h-2 rounded-full"
                          style={{ width: `${athlete.marketability_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{athlete.marketability_score}/100</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not rated</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{athlete.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{athlete.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Emails Sent</dt>
                <dd className="mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600">{emailCount}</span>
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </dd>
              </div>
            </dl>
          </div>

          {/* Roster Profile Info - Only show for signed athletes */}
          {athlete.outreach_status === 'signed' && (
            athlete.birthday || athlete.hometown || athlete.mailing_address || athlete.interests || athlete.dream_partnership
          ) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Details</h2>
              <dl className="grid grid-cols-2 gap-4">
                {athlete.birthday && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Birthday</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(athlete.birthday)}
                    </dd>
                  </div>
                )}
                {athlete.hometown && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hometown</dt>
                    <dd className="mt-1 text-sm text-gray-900">{athlete.hometown}</dd>
                  </div>
                )}
                {athlete.mailing_address && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Mailing Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">{athlete.mailing_address}</dd>
                  </div>
                )}
                {athlete.interests && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Interests &amp; Hobbies</dt>
                    <dd className="mt-1 text-sm text-gray-900">{athlete.interests}</dd>
                  </div>
                )}
                {athlete.dream_partnership && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Dream Partnership</dt>
                    <dd className="mt-1 text-sm text-gray-900">{athlete.dream_partnership}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Social Media */}
          {socialMedia && Object.keys(socialMedia).length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Social Media</h2>
                {totalFollowing > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Total Reach:</span>
                    <span className="text-lg font-bold text-brand-600">{formatFollowerCount(totalFollowing)}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {socialMedia.instagram_handle && (
                  <a
                    href={`https://instagram.com/${socialMedia.instagram_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaInstagram className="w-6 h-6 text-pink-500" />
                    <div>
                      <div className="text-xs text-gray-500">Instagram</div>
                      <div className="font-semibold text-gray-900">{formatFollowerCount(socialMedia.instagram_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.twitter_handle && (
                  <a
                    href={`https://x.com/${socialMedia.twitter_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaXTwitter className="w-6 h-6 text-gray-900" />
                    <div>
                      <div className="text-xs text-gray-500">X</div>
                      <div className="font-semibold text-gray-900">{formatFollowerCount(socialMedia.twitter_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.tiktok_handle && (
                  <a
                    href={`https://tiktok.com/@${socialMedia.tiktok_handle.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaTiktok className="w-6 h-6 text-gray-900" />
                    <div>
                      <div className="text-xs text-gray-500">TikTok</div>
                      <div className="font-semibold text-gray-900">{formatFollowerCount(socialMedia.tiktok_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.youtube_channel && (
                  <a
                    href={socialMedia.youtube_channel.startsWith('http') ? socialMedia.youtube_channel : `https://youtube.com/@${socialMedia.youtube_channel.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaYoutube className="w-6 h-6 text-red-600" />
                    <div>
                      <div className="text-xs text-gray-500">YouTube</div>
                      <div className="font-semibold text-gray-900">{formatFollowerCount(socialMedia.youtube_subscribers || 0)}</div>
                    </div>
                  </a>
                )}
              </div>
              {socialMedia.nil_valuation && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">NIL Valuation</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(socialMedia.nil_valuation)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sport Specific Stats */}
          {athlete.sport_specific_stats && Object.keys(athlete.sport_specific_stats as object).length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{athlete.sport} Statistics</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.entries(athlete.sport_specific_stats as Record<string, unknown>).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {key.includes('link') || key.includes('url') ? (
                        <a
                          href={String(value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:text-brand-700 underline"
                        >
                          View Film
                        </a>
                      ) : (
                        String(value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Documents */}
          <AthleteDocuments athleteId={id} initialDocuments={documents} />

          {/* Contracts */}
          <AthleteContracts athleteId={id} />

          {/* Activity Timeline */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h2>
            {activities.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {activities.slice(0, 10).map((activity, idx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {idx !== activities.slice(0, 10).length - 1 && (
                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.color}`}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={activity.icon} />
                              </svg>
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm text-gray-900">{activity.title}</p>
                              {activity.description && (
                                <p className="text-sm text-gray-500">{activity.description}</p>
                              )}
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              {new Date(activity.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-gray-900">No activity yet</p>
                <p className="mt-1 text-sm text-gray-500">Activities will appear here as you work with this athlete.</p>
              </div>
            )}
            {activities.length > 10 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">And {activities.length - 10} more activities</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pipeline Status */}
          <PipelineStatusCard pipeline={pipeline} />

          {/* Assigned Staff */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Staff</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Scout</span>
                <p className="text-sm text-gray-900">
                  {athlete.assigned_scout?.name ?? 'Unassigned'}
                </p>
                {canSelfAssignScout && (
                  <SelfAssignButton athleteId={id} roleLabel="Scout" assignmentRole="scout" />
                )}
              </div>
              <div>
                <span className="text-sm text-gray-500">Agent</span>
                <p className="text-sm text-gray-900">
                  {athlete.assigned_agent?.name ?? 'Unassigned'}
                </p>
                {canSelfAssignAgent && (
                  <SelfAssignButton athleteId={id} roleLabel="Agent" assignmentRole="agent" />
                )}
              </div>
              <div>
                <span className="text-sm text-gray-500">Marketing Lead</span>
                <p className="text-sm text-gray-900">
                  {athlete.assigned_marketing?.name ?? 'Unassigned'}
                </p>
                {canSelfAssignMarketing && (
                  <SelfAssignButton athleteId={id} roleLabel="Marketing Lead" assignmentRole="marketing" />
                )}
              </div>
            </div>
          </div>

          {/* Deals Section - Prospective for recruits, Active for signed athletes */}
          {athlete.outreach_status === 'signed' ? (
            // ROSTER ATHLETE - Show Active Deals
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Deals</h2>
              {(() => {
                const activeDeals = financials.filter(f => f.deal_stage === 'active')
                const activeBrands = brands.filter(b => b.deal_stage === 'active')
                if (activeDeals.length > 0 || activeBrands.length > 0) {
                  return (
                    <div className="space-y-4">
                      {activeDeals.length > 0 && (
                        <div className="space-y-2">
                          {activeDeals.slice(0, 3).map(deal => (
                            <div key={deal.id} className="p-3 bg-green-50 rounded-lg border border-green-100">
                              <p className="text-sm font-medium text-gray-900">{deal.deal_name}</p>
                              <p className="text-lg font-semibold text-green-600">{formatCurrency(Number(deal.deal_value))}</p>
                              <p className="text-xs text-gray-500">{deal.payment_status}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Total Value</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(activeDeals.reduce((sum, f) => sum + Number(f.deal_value), 0))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-500">Agency Revenue</span>
                          <span className="font-semibold text-brand-600">
                            {formatCurrency(activeDeals.reduce((sum, f) => sum + Number(f.agency_fee), 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return <p className="text-gray-500 text-sm">No active deals yet</p>
              })()}
            </div>
          ) : (
            // RECRUITING PROSPECT - Show Potential Deals
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Potential Deals</h2>
              <p className="text-xs text-gray-500 mb-3">Deals we can offer this prospect</p>
              {(() => {
                const prospectiveDeals = financials.filter(f => f.deal_stage === 'prospective')
                const prospectiveBrands = brands.filter(b => b.deal_stage === 'prospective')
                if (prospectiveDeals.length > 0 || prospectiveBrands.length > 0) {
                  return (
                    <div className="space-y-2">
                      {prospectiveDeals.map(deal => (
                        <div key={deal.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <p className="text-sm font-medium text-gray-900">{deal.deal_name}</p>
                          <p className="text-lg font-semibold text-amber-600">{formatCurrency(Number(deal.deal_value))}</p>
                          <p className="text-xs text-gray-500">Prospective</p>
                        </div>
                      ))}
                      {prospectiveBrands.map(brand => (
                        <div key={brand.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <p className="text-sm font-medium text-gray-900">{brand.brand_name}</p>
                          {brand.deal_value && (
                            <p className="text-lg font-semibold text-amber-600">{formatCurrency(Number(brand.deal_value))}</p>
                          )}
                          <p className="text-xs text-gray-500">{brand.response_status.replace(/_/g, ' ')}</p>
                        </div>
                      ))}
                      {prospectiveDeals.length > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Potential Value</span>
                            <span className="font-semibold text-amber-600">
                              {formatCurrency(prospectiveDeals.reduce((sum, f) => sum + Number(f.deal_value), 0))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
                return <p className="text-gray-500 text-sm">No potential deals added yet</p>
              })()}
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <SendEmailButton
                athleteId={id}
                athleteName={athlete.name}
                athleteEmail={athlete.email}
                schoolName={athlete.school}
              />
              <ScheduleMeetingButton
                athleteId={id}
                athleteName={athlete.name}
                athleteEmail={athlete.email}
              />
              <SendCalendlyLinkButton
                athleteEmail={athlete.email}
                athleteName={athlete.name}
              />
              <SendContractButton
                athleteId={id}
                athleteName={athlete.name}
                athleteEmail={athlete.email}
              />
              <Link href={`/communications/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Log Communication
              </Link>
              <Link href={`/brands/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Add Brand Outreach
              </Link>
              <Link href={`/financials/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Record Deal
              </Link>
              <div className="pt-2 mt-2 border-t border-gray-200">
                <DeleteAthleteButton athleteId={id} athleteName={athlete.name} />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
