import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { DashboardSummary, PendingFollowUp, Athlete, FinancialTracking, BrandOutreach } from '@/lib/database.types'
import { Greeting } from '@/components/greeting'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user's name
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('google_sso_id', user?.id || '')
    .single() as { data: { name: string } | null }

  const userName = userData?.name || 'there'

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

  // Fetch pending follow-ups
  const { data: followUpsData } = await supabase
    .from('pending_follow_ups')
    .select('*')
    .limit(5)
  const followUps = followUpsData as PendingFollowUp[] | null

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

  // Fetch active brand discussions
  const { data: activeBrandsData } = await supabase
    .from('brand_outreach')
    .select('*, athletes(name)')
    .in('response_status', ['interested', 'in_discussion'])
    .order('date_contacted', { ascending: false })
    .limit(5)

  const activeBrands = activeBrandsData as (BrandOutreach & { athletes: { name: string } | null })[] | null

  const stats = [
    { name: 'Total Athletes', value: summary?.total_athletes ?? 0, href: '/athletes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'bg-brand-50 text-brand-600' },
    { name: 'Signed Clients', value: signedClientsCount ?? 0, href: '/athletes?status=signed', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'bg-green-50 text-green-600' },
    { name: 'In Portal', value: summary?.in_portal ?? 0, href: '/athletes', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'bg-purple-50 text-purple-600' },
    { name: 'Active Brand Talks', value: summary?.active_brand_discussions ?? 0, href: '/brands', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'bg-orange-50 text-orange-600' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div>
        <Greeting name={userName} />
        <p className="text-gray-600">Overview of your agency performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="stat-card group"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <div className={`p-2 rounded-lg ${stat.color} group-hover:opacity-80 transition-opacity`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="stat-value">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-bold text-green-600 mt-2">
            {formatCurrency(summary?.total_revenue ?? 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Lifetime agency revenue</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-bold text-yellow-600 mt-2">
            {formatCurrency(summary?.pending_revenue ?? 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Awaiting payment</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">This Month</p>
            <div className="p-2 bg-brand-50 rounded-lg">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-[32px] font-bold text-brand-600 mt-2">
            {formatCurrency(monthlyAgencyFee)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{monthlyDeals?.length || 0} deals ({formatCurrency(monthlyDealValue)} total)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Follow-ups</h3>
            <Link href="/communications" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {followUps && followUps.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {followUps.map((followUp) => {
                const daysUntil = Math.ceil((new Date(followUp.follow_up_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysUntil < 0
                const isToday = daysUntil === 0
                return (
                  <li key={followUp.id} className="py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{followUp.athlete_name}</p>
                        <p className="text-sm text-gray-500">{followUp.subject || 'No subject'}</p>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${
                        isOverdue ? 'bg-red-100 text-red-700' :
                        isToday ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {isOverdue ? `${Math.abs(daysUntil)}d overdue` :
                         isToday ? 'Today' :
                         `in ${daysUntil}d`}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="empty-state py-8">
              <svg className="empty-state-icon h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="empty-state-title text-base">All caught up!</p>
              <p className="empty-state-description">No pending follow-ups.</p>
            </div>
          )}
        </div>

        {/* Active Brand Discussions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Brand Discussions</h3>
            <Link href="/brands" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {activeBrands && activeBrands.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {activeBrands.map((brand) => (
                <li key={brand.id} className="py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{brand.brand_name}</p>
                      <p className="text-sm text-gray-500">
                        {brand.athletes?.name}
                        {brand.deal_value && ` · ${formatCurrency(brand.deal_value)}`}
                      </p>
                    </div>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      brand.response_status === 'in_discussion' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {brand.response_status === 'in_discussion' ? 'In Discussion' : 'Interested'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state py-8">
              <svg className="empty-state-icon h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              <p className="empty-state-title text-base">No active discussions</p>
              <p className="empty-state-description">Start reaching out to brands.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Athletes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Athletes</h3>
            <Link href="/athletes" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {recentAthletes && recentAthletes.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentAthletes.map((athlete) => (
                <li key={athlete.id}>
                  <Link
                    href={`/athletes/${athlete.id}`}
                    className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{athlete.name}</p>
                      <p className="text-sm text-gray-500">
                        {athlete.sport} {athlete.school && `· ${athlete.school}`}
                      </p>
                    </div>
                    <span className="badge-blue capitalize">{athlete.recruiting_status.replace(/_/g, ' ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state py-8">
              <svg className="empty-state-icon h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="empty-state-title text-base">No athletes yet</p>
              <p className="empty-state-description">Add your first athlete prospect.</p>
              <Link href="/athletes/new" className="btn-primary mt-3 text-sm">
                Add Athlete
              </Link>
            </div>
          )}
        </div>

        {/* This Month's Deals */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">This Month&apos;s Deals</h3>
            <Link href="/financials" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all
            </Link>
          </div>
          {monthlyDeals && monthlyDeals.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {monthlyDeals.map((deal) => (
                <li key={deal.id} className="py-3 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{deal.deal_name}</p>
                      <p className="text-sm text-gray-500">{deal.athletes?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(Number(deal.agency_fee))}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(Number(deal.deal_value))} total</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state py-8">
              <svg className="empty-state-icon h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="empty-state-title text-base">No deals this month</p>
              <p className="empty-state-description">Close some deals to see them here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
