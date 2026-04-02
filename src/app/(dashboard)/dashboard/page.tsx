import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { DashboardSummary, PendingFollowUp, Athlete, FinancialTracking, BrandOutreach, Task, OutreachStatus, User } from '@/lib/database.types'
import { Greeting } from '@/components/greeting'
import { REGIONS } from '@/lib/database.types'
import { getGoalProgressForUser, getTeamGoalsSummary } from '@/lib/queries/goal-progress'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user's name, ID, and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('google_sso_id', user?.id || '')
    .single() as { data: { id: string; name: string; role: string } | null }

  const userName = userData?.name || 'there'
  const currentUserId = userData?.id || ''
  const userRole = userData?.role || ''
  const isAdmin = userRole === 'admin'

  // Fetch goal progress
  const userGoalProgress = currentUserId ? await getGoalProgressForUser(currentUserId) : []
  const teamGoalsSummary = isAdmin ? await getTeamGoalsSummary() : null

  // Fetch dashboard summary
  const { data: summaryData } = await supabase
    .from('dashboard_summary')
    .select('*')
    .single()
  const summary = summaryData as DashboardSummary | null

  // Get accurate signed clients count (recruiting_status = 'signed')
  const { count: signedClientsCount } = await supabase
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .eq('recruiting_status', 'signed')

  // Get athletes in pipeline count (actively recruiting or open to contact)
  const { count: pipelineCount } = await supabase
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .in('recruiting_status', ['actively_recruiting', 'open_to_contact'])

  // Fetch pending follow-ups
  const { data: followUpsData } = await supabase
    .from('pending_follow_ups')
    .select('*')
    .limit(5)
  const followUps = followUpsData as PendingFollowUp[] | null

  // Count follow-ups: overdue, today, and tomorrow
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { count: overdueFollowUpsCount } = await supabase
    .from('communications_log')
    .select('*', { count: 'exact', head: true })
    .eq('follow_up_completed', false)
    .not('follow_up_date', 'is', null)
    .lt('follow_up_date', todayStr)

  const { count: todayFollowUpsCount } = await supabase
    .from('communications_log')
    .select('*', { count: 'exact', head: true })
    .eq('follow_up_completed', false)
    .eq('follow_up_date', todayStr)

  const { count: tomorrowFollowUpsCount } = await supabase
    .from('communications_log')
    .select('*', { count: 'exact', head: true })
    .eq('follow_up_completed', false)
    .eq('follow_up_date', tomorrowStr)

  // Fetch recent athletes
  const { data: recentAthletesData } = await supabase
    .from('athletes')
    .select('id, name, sport, school, recruiting_status')
    .order('created_at', { ascending: false })
    .limit(5)
  const recentAthletes = recentAthletesData as Pick<Athlete, 'id' | 'name' | 'sport' | 'school' | 'recruiting_status'>[] | null

  // Fetch deals closing this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const endOfMonth = new Date(startOfMonth)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1)

  const { data: monthlyDealsData } = await supabase
    .from('financial_tracking')
    .select('*, athletes(name)')
    .gte('deal_date', startOfMonth.toISOString())
    .lt('deal_date', endOfMonth.toISOString())
    .order('deal_date', { ascending: false })
    .limit(5)

  const monthlyDeals = monthlyDealsData as (FinancialTracking & { athletes: { name: string } | null })[] | null

  // Calculate monthly deal totals
  const monthlyDealValue = monthlyDeals?.reduce((sum, d) => sum + Number(d.deal_value), 0) ?? 0
  const monthlyAgencyFee = monthlyDeals?.reduce((sum, d) => sum + Number(d.agency_fee), 0) ?? 0

  // Fetch recent activity for activity feed
  type RecentComm = { id: string; athlete_id: string; type: string; subject: string | null; communication_date: string; athletes: { name: string } | null }
  type RecentDeal = { id: string; athlete_id: string; deal_name: string; deal_value: number; created_at: string; athletes: { name: string } | null }
  type RecentBrand = { id: string; athlete_id: string; brand_name: string; response_status: string; created_at: string; athletes: { name: string } | null }
  type RecentDoc = { id: string; athlete_id: string; name: string; document_type: string; created_at: string; athletes: { name: string } | null }

  const [
    { data: recentComms },
    { data: recentDeals },
    { data: recentBrands },
    { data: recentDocs }
  ] = await Promise.all([
    supabase
      .from('communications_log')
      .select('id, athlete_id, type, subject, communication_date, athletes(name)')
      .order('created_at', { ascending: false })
      .limit(3) as unknown as { data: RecentComm[] | null },
    supabase
      .from('financial_tracking')
      .select('id, athlete_id, deal_name, deal_value, created_at, athletes(name)')
      .order('created_at', { ascending: false })
      .limit(3) as unknown as { data: RecentDeal[] | null },
    supabase
      .from('brand_outreach')
      .select('id, athlete_id, brand_name, response_status, created_at, athletes(name)')
      .order('created_at', { ascending: false })
      .limit(3) as unknown as { data: RecentBrand[] | null },
    supabase
      .from('documents')
      .select('id, athlete_id, name, document_type, created_at, athletes(name)')
      .order('created_at', { ascending: false })
      .limit(2) as unknown as { data: RecentDoc[] | null }
  ])

  // Combine and sort activities
  type Activity = {
    id: string
    type: 'communication' | 'deal' | 'brand' | 'document' | 'athlete'
    title: string
    subtitle: string
    timestamp: string
    icon: string
    color: string
    href: string
  }

  const activities: Activity[] = [
    ...(recentComms || []).map(c => ({
      id: `comm-${c.id}`,
      type: 'communication' as const,
      title: `${c.type} with ${c.athletes?.name || 'Unknown'}`,
      subtitle: c.subject || 'No subject',
      timestamp: c.communication_date,
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      color: 'text-gray-500 bg-gray-100',
      href: `/athletes/${c.athlete_id}`
    })),
    ...(recentDeals || []).map(d => ({
      id: `deal-${d.id}`,
      type: 'deal' as const,
      title: `New deal: ${d.deal_name}`,
      subtitle: d.athletes?.name || 'Unknown',
      timestamp: d.created_at,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-gray-500 bg-gray-100',
      href: '/financials'
    })),
    ...(recentBrands || []).map(b => ({
      id: `brand-${b.id}`,
      type: 'brand' as const,
      title: `Brand outreach: ${b.brand_name}`,
      subtitle: b.athletes?.name || 'Unknown',
      timestamp: b.created_at,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      color: 'text-gray-500 bg-gray-100',
      href: '/brands'
    })),
    ...(recentDocs || []).map(d => ({
      id: `doc-${d.id}`,
      type: 'document' as const,
      title: `Document uploaded`,
      subtitle: `${d.name} for ${d.athletes?.name || 'Unknown'}`,
      timestamp: d.created_at,
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      color: 'text-gray-500 bg-gray-100',
      href: '/contracts'
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get total active deals value
  const { data: activeDealsData } = await supabase
    .from('financial_tracking')
    .select('deal_value')
    .eq('payment_status', 'pending') as unknown as { data: { deal_value: number }[] | null }
  const activeDealsValue = activeDealsData?.reduce((sum, d) => sum + Number(d.deal_value), 0) ?? 0

  // Fetch active brand discussions
  const { data: activeBrandsData } = await supabase
    .from('brand_outreach')
    .select('*, athletes(name)')
    .in('response_status', ['interested', 'in_discussion'])
    .order('date_contacted', { ascending: false })
    .limit(5)

  const activeBrands = activeBrandsData as (BrandOutreach & { athletes: { name: string } | null })[] | null

  // Fetch user's tasks (not done, ordered by due date)
  const { data: userTasksData } = await supabase
    .from('tasks')
    .select('*, athletes:athlete_id(name)')
    .eq('assigned_to', currentUserId)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5)

  const userTasks = userTasksData as (Task & { athletes: { name: string } | null })[] | null

  // Fetch recruiting database stats
  const { data: recruitingData } = await supabase
    .from('athletes')
    .select('id, region, outreach_status')
    .neq('outreach_status', 'signed')

  type RecruitingRow = { id: string; region: string | null; outreach_status: OutreachStatus }
  const recruits = (recruitingData as RecruitingRow[] | null) || []

  // Calculate recruiting stats
  const totalRecruits = recruits.length
  const contactedRecruits = recruits.filter(r => r.outreach_status !== 'not_contacted').length
  const contactedPercentage = totalRecruits > 0 ? Math.round((contactedRecruits / totalRecruits) * 100) : 0

  // Calculate region stats
  const regionStatsMap = new Map<string, { total: number; contacted: number }>()
  recruits.forEach(r => {
    const region = r.region || 'Unassigned'
    const current = regionStatsMap.get(region) || { total: 0, contacted: 0 }
    current.total++
    if (r.outreach_status !== 'not_contacted') {
      current.contacted++
    }
    regionStatsMap.set(region, current)
  })

  const regionStats = Array.from(regionStatsMap.entries())
    .map(([region, stats]) => ({
      region,
      total: stats.total,
      contacted: stats.contacted,
      percentage: stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5) // Top 5 regions

  const stats = [
    {
      name: 'Total Athletes',
      value: summary?.total_athletes ?? 0,
      href: '/athletes',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      name: 'Signed Clients',
      value: signedClientsCount ?? 0,
      href: '/athletes?status=signed',
      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
    },
    {
      name: 'In Portal',
      value: summary?.in_portal ?? 0,
      href: '/athletes?portal=true',
      icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    },
    {
      name: 'Active Brand Talks',
      value: summary?.active_brand_discussions ?? 0,
      href: '/brands',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`
    }
    return formatCurrency(value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header - aligns with sidebar logo + icon row */}
      <div className="flex-shrink-0 h-16 md:h-[92px] flex flex-col justify-center px-4 md:px-6 bg-gray-50 border-b border-gray-200">
        <Greeting name={userName} />
        <p className="text-gray-500 text-sm">
          {(overdueFollowUpsCount ?? 0) > 0
            ? `You have ${overdueFollowUpsCount} overdue follow-up${overdueFollowUpsCount === 1 ? '' : 's'}`
            : (todayFollowUpsCount ?? 0) > 0
              ? `You have ${todayFollowUpsCount} follow-up${todayFollowUpsCount === 1 ? '' : 's'} due today`
              : (tomorrowFollowUpsCount ?? 0) > 0
                ? `You have ${tomorrowFollowUpsCount} follow-up${tomorrowFollowUpsCount === 1 ? '' : 's'} due tomorrow`
                : `You're all caught up on follow-ups`
          }
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.name}</p>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </div>
            <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Goal Progress Widget */}
      {userGoalProgress.length > 0 && (
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">My Outreach Goals</h3>
              <p className="text-xs text-gray-500">
                Track your communication targets
              </p>
            </div>
            {isAdmin && (
              <Link href="/settings/outreach-goals" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                Manage Goals
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {userGoalProgress.map((goal) => (
              <div key={goal.goalId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{goal.goalName}</span>
                  <span className="text-xs text-gray-500">
                    {goal.currentCount} / {goal.targetCount} {goal.metric.replace('_', ' ')}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      goal.progress >= 100 ? 'bg-green-500' :
                      goal.progress >= 80 ? 'bg-green-400' :
                      goal.progress >= 50 ? 'bg-yellow-400' :
                      goal.progress >= 25 ? 'bg-orange-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-400 capitalize">{goal.period}</span>
                  <span className={`text-xs font-medium ${
                    goal.progress >= 100 ? 'text-green-600' :
                    goal.progress >= 80 ? 'text-green-500' :
                    goal.progress >= 50 ? 'text-yellow-600' :
                    'text-red-500'
                  }`}>
                    {goal.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Team Summary for Admins */}
          {isAdmin && teamGoalsSummary && teamGoalsSummary.totalGoals > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Team Average Progress</span>
                <span className={`font-medium ${
                  teamGoalsSummary.averageProgress >= 80 ? 'text-green-600' :
                  teamGoalsSummary.averageProgress >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {teamGoalsSummary.averageProgress}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Team Members On Track</span>
                <span className="text-gray-900">
                  {teamGoalsSummary.usersOnTrack} / {teamGoalsSummary.totalUsers}
                </span>
              </div>
              <Link
                href="/team/productivity"
                className="mt-3 text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                View Team Productivity
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recruiting Progress Widget */}
      {totalRecruits > 0 && (
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Recruiting Progress</h3>
              <p className="text-xs text-gray-500">
                {contactedRecruits} of {totalRecruits} prospects contacted ({contactedPercentage}%)
              </p>
            </div>
            <Link href="/recruiting" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View All
            </Link>
          </div>

          {/* Overall Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  contactedPercentage >= 80 ? 'bg-green-500' :
                  contactedPercentage >= 50 ? 'bg-yellow-500' :
                  contactedPercentage >= 25 ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${contactedPercentage}%` }}
              />
            </div>
          </div>

          {/* Region Breakdown */}
          <div className="space-y-2">
            {regionStats.map((stat) => (
              <div key={stat.region} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600 truncate">{stat.region}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      stat.percentage >= 80 ? 'bg-green-400' :
                      stat.percentage >= 50 ? 'bg-yellow-400' :
                      stat.percentage >= 25 ? 'bg-orange-400' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-xs text-gray-500 text-right">
                  {stat.contacted}/{stat.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary?.total_revenue ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lifetime agency revenue</p>
        </div>
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Revenue</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(summary?.pending_revenue ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
        </div>
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Month</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {formatCurrency(monthlyAgencyFee)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{monthlyDeals?.length || 0} deals ({formatCurrency(monthlyDealValue)} total)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* My Tasks */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
            <Link href="/tasks?filter=my_tasks" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {userTasks && userTasks.length > 0 ? (
            <ul className="space-y-1">
              {userTasks.map((task) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null
                const isOverdue = dueDate && dueDate < today && task.status !== 'done'
                const isDueToday = dueDate && dueDate.toDateString() === today.toDateString()
                return (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'high' ? 'bg-red-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {task.athletes?.name || 'No athlete'}
                          </p>
                        </div>
                      </div>
                      {dueDate && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ml-2 whitespace-nowrap ${
                          isOverdue ? 'bg-red-100 text-red-700' :
                          isDueToday ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {isOverdue ? 'Overdue' :
                           isDueToday ? 'Today' :
                           dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-sm text-gray-500 mt-1">No pending tasks</p>
              <Link href="/tasks/new" className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1 inline-block">
                Create Task
              </Link>
            </div>
          )}
        </div>

        {/* Pending Follow-ups */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Upcoming Follow-ups</h3>
            <Link href="/communications" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {followUps && followUps.length > 0 ? (
            <ul className="space-y-1">
              {followUps.map((followUp) => {
                const daysUntil = Math.ceil((new Date(followUp.follow_up_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysUntil < 0
                const isUrgent = daysUntil >= 0 && daysUntil <= 1
                const isSoon = daysUntil >= 2 && daysUntil <= 3
                return (
                  <li key={followUp.id} className="py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm truncate">{followUp.athlete_name}</p>
                        <p className="text-xs text-gray-500 truncate">{followUp.subject || 'No subject'}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ml-2 whitespace-nowrap ${
                        isOverdue ? 'bg-red-100 text-red-700' :
                        isUrgent ? 'bg-red-100 text-red-700' :
                        isSoon ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntil)}d overdue` :
                         daysUntil === 0 ? 'Today' :
                         daysUntil === 1 ? 'Tomorrow' :
                         `in ${daysUntil}d`}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500 mt-1">All caught up!</p>
            </div>
          )}
        </div>

        {/* Active Brand Discussions */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Active Brand Discussions</h3>
            <Link href="/brands" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {activeBrands && activeBrands.length > 0 ? (
            <ul className="space-y-1">
              {activeBrands.map((brand) => (
                <li key={brand.id} className="py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{brand.brand_name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {brand.athletes?.name}
                        {brand.deal_value && ` · ${formatCurrency(brand.deal_value)}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ml-2 whitespace-nowrap ${
                      brand.response_status === 'in_discussion' ? 'bg-blue-50 text-blue-700' :
                      'bg-green-50 text-green-700'
                    }`}>
                      {brand.response_status === 'in_discussion' ? 'In Discussion' : 'Interested'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              <p className="text-sm text-gray-500 mt-1">No active discussions</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Athletes */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Athletes</h3>
            <Link href="/athletes" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {recentAthletes && recentAthletes.length > 0 ? (
            <ul className="space-y-1">
              {recentAthletes.map((athlete) => (
                <li key={athlete.id}>
                  <Link
                    href={`/athletes/${athlete.id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{athlete.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {athlete.sport} {athlete.school && `· ${athlete.school}`}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-medium ml-2 whitespace-nowrap bg-gray-100 text-gray-700 capitalize">
                      {athlete.recruiting_status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-sm text-gray-500 mt-1">No athletes yet</p>
              <Link href="/athletes/new" className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1 inline-block">
                Add Athlete
              </Link>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          </div>
          {activities.length > 0 ? (
            <ul className="space-y-1">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={activity.href}
                    className="flex items-start gap-3 py-2 px-2 -mx-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className={`p-1.5 rounded ${activity.color} flex-shrink-0 mt-0.5`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={activity.icon} />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate capitalize">{activity.title}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500 mt-1">No recent activity</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
