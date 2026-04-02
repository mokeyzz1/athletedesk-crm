import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Athlete, CommunicationLog, RecruitingPipeline, FinancialTracking, BrandOutreach, Document } from '@/lib/database.types'
import { type SocialMediaData, calculateTotalFollowing, formatFollowerCount } from '@/lib/sport-fields'
import { AthleteDocuments } from './athlete-documents'
import { SendEmailButton } from './send-email-button'
import { EditAthleteButton } from '@/components/athletes/edit-athlete-button'
import { PipelineStatusCard } from './pipeline-status-card'

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

type ActivityItem = {
  id: string
  type: 'communication' | 'brand' | 'financial' | 'document' | 'pipeline'
  date: string
  title: string
  description: string
  icon: string
  color: string
}

export default async function AthletePage({ params }: AthletePageProps) {
  const { id } = await params
  const supabase = await createClient()

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

  // Fetch all related data
  const [pipelineRes, communicationsRes, brandsRes, financialsRes, documentsRes] = await Promise.all([
    supabase.from('recruiting_pipeline').select('*').eq('athlete_id', id).single(),
    supabase.from('communications_log').select('*, users:staff_member_id (name)').eq('athlete_id', id).order('communication_date', { ascending: false }),
    supabase.from('brand_outreach').select('*, users:staff_member_id (name)').eq('athlete_id', id).order('date_contacted', { ascending: false }),
    supabase.from('financial_tracking').select('*').eq('athlete_id', id).order('deal_date', { ascending: false }),
    supabase.from('documents').select('*, users:uploaded_by (name)').eq('athlete_id', id).order('created_at', { ascending: false }),
  ])

  const pipeline = pipelineRes.data as RecruitingPipeline | null
  const communications = (communicationsRes.data ?? []) as CommunicationWithUser[]
  const brands = (brandsRes.data ?? []) as BrandWithDetails[]
  const financials = (financialsRes.data ?? []) as FinancialTracking[]
  const documents = (documentsRes.data ?? []) as DocumentWithUser[]

  const socialMedia = athlete.social_media as SocialMediaData | null
  const totalFollowing = socialMedia ? calculateTotalFollowing(socialMedia) : 0

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
            </dl>
          </div>

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
                    href={`https://instagram.com/${socialMedia.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z"/>
                    </svg>
                    <div>
                      <div className="text-xs opacity-80">Instagram</div>
                      <div className="font-semibold">{formatFollowerCount(socialMedia.instagram_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.twitter_handle && (
                  <a
                    href={`https://x.com/${socialMedia.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-black rounded-lg text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/>
                    </svg>
                    <div>
                      <div className="text-xs opacity-80">X</div>
                      <div className="font-semibold">{formatFollowerCount(socialMedia.twitter_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.tiktok_handle && (
                  <a
                    href={`https://tiktok.com/@${socialMedia.tiktok_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                    <div>
                      <div className="text-xs opacity-80">TikTok</div>
                      <div className="font-semibold">{formatFollowerCount(socialMedia.tiktok_followers || 0)}</div>
                    </div>
                  </a>
                )}
                {socialMedia.youtube_channel && (
                  <a
                    href={socialMedia.youtube_channel.startsWith('http') ? socialMedia.youtube_channel : `https://youtube.com/@${socialMedia.youtube_channel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-red-600 rounded-lg text-white hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                    </svg>
                    <div>
                      <div className="text-xs opacity-80">YouTube</div>
                      <div className="font-semibold">{formatFollowerCount(socialMedia.youtube_subscribers || 0)}</div>
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
              </div>
              <div>
                <span className="text-sm text-gray-500">Agent</span>
                <p className="text-sm text-gray-900">
                  {athlete.assigned_agent?.name ?? 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Marketing Lead</span>
                <p className="text-sm text-gray-900">
                  {athlete.assigned_marketing?.name ?? 'Unassigned'}
                </p>
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
              <Link href={`/communications/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Log Communication
              </Link>
              <Link href={`/brands/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Add Brand Outreach
              </Link>
              <Link href={`/financials/new?athlete=${id}`} className="btn-secondary w-full justify-center">
                Record Deal
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
